// Supabase Edge Function for Flutterwave Transaction Verification
// Deploy using: supabase functions deploy verify-payment --project-ref your-project-ref
// Set your secret key: supabase secrets set FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-xxxx or FLWSECK-xxxx
// Set your webhook hash: supabase secrets set FLUTTERWAVE_WEBHOOK_SECRET_HASH=your-webhook-hash

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers':
		'authorization, x-client-info, apikey, content-type, verif-hash',
};

interface FlutterwaveWebhookPayload {
	event: string;
	data: {
		id: number;
		tx_ref: string;
		amount: number;
		status: string;
		customer?: {
			email: string;
		};
		meta?: {
			contestant_id?: string;
			votes_count?: string | number;
		};
	};
}

interface ClientVerificationRequest {
	reference: string;
	contestantId: string;
	votesCount: number;
	email: string;
}

serve(async (req: Request): Promise<Response> => {
	if (req.method === 'OPTIONS') {
		return new Response('ok', { headers: corsHeaders });
	}

	try {
		const flutterwaveSecret = Deno.env.get('FLUTTERWAVE_SECRET_KEY');
		if (!flutterwaveSecret) {
			return new Response(
				JSON.stringify({
					success: false,
					message: 'Server misconfiguration: FLUTTERWAVE_SECRET_KEY not set',
				}),
				{
					status: 500,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				},
			);
		}

		// Initialize Supabase Admin Client
		const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
		const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
		const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

		const flutterwaveSignature = req.headers.get('verif-hash');

		let reference = '';
		let contestantId = '';
		let votesCount = 0;
		let email = '';
		let actualAmountNaira = 0;

		// -------------------------------------------------------------
		// CASE A: Request is a Webhook from Flutterwave (has verif-hash)
		// -------------------------------------------------------------
		if (flutterwaveSignature) {
			const webhookSecretHash = Deno.env.get('FLUTTERWAVE_WEBHOOK_SECRET_HASH');
			if (!webhookSecretHash || flutterwaveSignature !== webhookSecretHash) {
				return new Response(
					JSON.stringify({ success: false, message: 'Invalid webhook signature' }),
					{
						status: 401,
						headers: { ...corsHeaders, 'Content-Type': 'application/json' },
					},
				);
			}

			const bodyText = await req.text();
			const payload: FlutterwaveWebhookPayload = JSON.parse(bodyText);

			// We only process successful charge events
			if (payload.event !== 'charge.completed' || payload.data.status !== 'successful') {
				return new Response(
					JSON.stringify({ success: true, message: `Ignored event: ${payload.event}` }),
					{
						status: 200,
						headers: { ...corsHeaders, 'Content-Type': 'application/json' },
					},
				);
			}

			const data = payload.data;
			reference = data.tx_ref;
			email = data.customer?.email ?? '';

			const meta = data.meta;
			contestantId = meta?.contestant_id?.toString() || '';
			const votesVal = meta?.votes_count || '0';
			votesCount = typeof votesVal === 'number' ? votesVal : parseInt(votesVal, 10);

			if (!reference || !contestantId || !votesCount || !email) {
				return new Response(
					JSON.stringify({
						success: false,
						message: 'Missing required metadata parameters in webhook',
					}),
					{
						status: 400,
						headers: { ...corsHeaders, 'Content-Type': 'application/json' },
					},
				);
			}

			// Re-verify the transaction directly with Flutterwave using its id, not just the webhook payload
			const verifyUrl = `https://api.flutterwave.com/v3/transactions/${data.id}/verify`;
			const verifyResponse = await fetch(verifyUrl, {
				method: 'GET',
				headers: {
					Authorization: `Bearer ${flutterwaveSecret}`,
					'Content-Type': 'application/json',
				},
			});
			const verifyData = await verifyResponse.json();

			if (
				!verifyResponse.ok ||
				verifyData.status !== 'success' ||
				verifyData.data.status !== 'successful' ||
				verifyData.data.tx_ref !== reference
			) {
				return new Response(
					JSON.stringify({
						success: false,
						message: 'Payment verification failed with Flutterwave',
					}),
					{
						status: 400,
						headers: { ...corsHeaders, 'Content-Type': 'application/json' },
					},
				);
			}

			actualAmountNaira = verifyData.data.amount;
		}
		// -------------------------------------------------------------
		// CASE B: Direct Request from Client Frontend (no signature)
		// -------------------------------------------------------------
		else {
			const body: ClientVerificationRequest = await req.json();
			reference = body.reference;
			contestantId = body.contestantId;
			votesCount = body.votesCount;
			email = body.email;

			if (!reference || !contestantId || !votesCount || !email) {
				return new Response(
					JSON.stringify({
						success: false,
						message: 'Missing required parameters in client request',
					}),
					{
						status: 400,
						headers: { ...corsHeaders, 'Content-Type': 'application/json' },
					},
				);
			}

			// Query Flutterwave Verification Endpoint directly to confirm this reference is valid
			const flutterwaveUrl = `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`;
			const flutterwaveResponse = await fetch(flutterwaveUrl, {
				method: 'GET',
				headers: {
					Authorization: `Bearer ${flutterwaveSecret}`,
					'Content-Type': 'application/json',
				},
			});

			const flutterwaveData = await flutterwaveResponse.json();

			if (
				!flutterwaveResponse.ok ||
				flutterwaveData.status !== 'success' ||
				flutterwaveData.data?.status !== 'successful'
			) {
				return new Response(
					JSON.stringify({
						success: false,
						message: 'Payment verification failed with Flutterwave',
					}),
					{
						status: 400,
						headers: { ...corsHeaders, 'Content-Type': 'application/json' },
					},
				);
			}

			actualAmountNaira = flutterwaveData.data.amount;
		}

		// -------------------------------------------------------------
		// Verify amount matches expected value (1 vote = 100 Naira)
		// -------------------------------------------------------------
		const expectedAmountNaira = votesCount * 100;
		if (actualAmountNaira < expectedAmountNaira) {
			return new Response(
				JSON.stringify({
					success: false,
					message: `Incorrect payment amount. Expected at least ${expectedAmountNaira} NGN, received ${actualAmountNaira} NGN.`,
				}),
				{
					status: 400,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				},
			);
		}

		// -------------------------------------------------------------
		// Log the vote and update contestant
		// -------------------------------------------------------------
		const { data: dbData, error: dbError } = await supabaseAdmin.rpc(
			'record_vote',
			{
				p_contestant_id: contestantId,
				p_email: email,
				p_reference: reference,
				p_votes_count: votesCount,
				p_amount: votesCount * 100,
			},
		);

		if (dbError) {
			throw dbError;
		}

		if (dbData && dbData.success) {
			return new Response(
				JSON.stringify({
					success: true,
					message: 'Transaction verified and vote cast!',
				}),
				{
					status: 200,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				},
			);
		} else if (dbData && dbData.message && dbData.message.includes('already been used')) {
			// This transaction was already processed successfully in a previous call (idempotency check).
			// Return 200 OK so that Flutterwave webhooks stop retrying and frontend knows it is success.
			return new Response(
				JSON.stringify({
					success: true,
					message: dbData.message,
				}),
				{
					status: 200,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				},
			);
		} else {
			return new Response(
				JSON.stringify({
					success: false,
					message: dbData?.message || 'Failed to record vote in database',
				}),
				{
					status: 400,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				},
			);
		}
	} catch (error: any) {
		return new Response(
			JSON.stringify({ success: false, message: error.message }),
			{
				status: 500,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			},
		);
	}
});
