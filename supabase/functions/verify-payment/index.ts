// Supabase Edge Function for Paystack Transaction Verification
// Deploy using: supabase functions deploy verify-payment --project-ref your-project-ref
// Set your secret key: supabase secrets set PAYSTACK_SECRET_KEY=sk_live_xxxx or sk_test_xxxx

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers':
		'authorization, x-client-info, apikey, content-type, x-paystack-signature',
};

interface PaystackWebhookPayload {
	event: string;
	data: {
		reference: string;
		amount: number;
		customer?: {
			email: string;
		};
		metadata?: {
			contestant_id?: string;
			votes_count?: string | number;
			custom_fields?: Array<{
				display_name: string;
				variable_name: string;
				value: string | number;
			}>;
		};
	};
}

interface ClientVerificationRequest {
	reference: string;
	contestantId: string;
	votesCount: number;
	email: string;
}

// HMAC SHA-512 Verification for Paystack Webhooks
async function verifyPaystackSignature(
	bodyText: string,
	signature: string | null,
	secretKey: string
): Promise<boolean> {
	if (!signature) return false;

	const encoder = new TextEncoder();
	const keyBuf = encoder.encode(secretKey);
	const bodyBuf = encoder.encode(bodyText);

	const key = await crypto.subtle.importKey(
		'raw',
		keyBuf,
		{ name: 'HMAC', hash: 'SHA-512' },
		false,
		['sign']
	);

	const signatureBuf = await crypto.subtle.sign(
		'HMAC',
		key,
		bodyBuf
	);

	const hashArray = Array.from(new Uint8Array(signatureBuf));
	const hexSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

	return hexSignature === signature;
}

serve(async (req: Request): Promise<Response> => {
	if (req.method === 'OPTIONS') {
		return new Response('ok', { headers: corsHeaders });
	}

	try {
		const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY');
		if (!paystackSecret) {
			return new Response(
				JSON.stringify({
					success: false,
					message: 'Server misconfiguration: PAYSTACK_SECRET_KEY not set',
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

		const paystackSignature = req.headers.get('x-paystack-signature');

		let reference = '';
		let contestantId = '';
		let votesCount = 0;
		let email = '';
		let actualAmountKobo = 0;

		// -------------------------------------------------------------
		// CASE A: Request is a Webhook from Paystack (has signature)
		// -------------------------------------------------------------
		if (paystackSignature) {
			const bodyText = await req.text();
			const isValid = await verifyPaystackSignature(bodyText, paystackSignature, paystackSecret);

			if (!isValid) {
				return new Response(
					JSON.stringify({ success: false, message: 'Invalid webhook signature' }),
					{
						status: 401,
						headers: { ...corsHeaders, 'Content-Type': 'application/json' },
					},
				);
			}

			const payload: PaystackWebhookPayload = JSON.parse(bodyText);

			// We only process charge.success events
			if (payload.event !== 'charge.success') {
				return new Response(
					JSON.stringify({ success: true, message: `Ignored event: ${payload.event}` }),
					{
						status: 200,
						headers: { ...corsHeaders, 'Content-Type': 'application/json' },
					},
				);
			}

			const data = payload.data;
			reference = data.reference;
			actualAmountKobo = data.amount;
			email = data.customer?.email ?? '';

			const metadata = data.metadata;
			contestantId = metadata?.contestant_id || 
				metadata?.custom_fields?.find(f => f.variable_name === 'contestant_id')?.value?.toString() || '';
			const votesVal = metadata?.votes_count || 
				metadata?.custom_fields?.find(f => f.variable_name === 'votes_count')?.value || '0';
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

			// Query Paystack Verification Endpoint directly to confirm this reference is valid
			const paystackUrl = `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`;
			const paystackResponse = await fetch(paystackUrl, {
				method: 'GET',
				headers: {
					Authorization: `Bearer ${paystackSecret}`,
					'Content-Type': 'application/json',
				},
			});

			const paystackData = await paystackResponse.json();

			if (
				!paystackResponse.ok ||
				!paystackData.status ||
				paystackData.data.status !== 'success'
			) {
				return new Response(
					JSON.stringify({
						success: false,
						message: 'Payment verification failed with Paystack',
					}),
					{
						status: 400,
						headers: { ...corsHeaders, 'Content-Type': 'application/json' },
					},
				);
			}

			actualAmountKobo = paystackData.data.amount;
		}

		// -------------------------------------------------------------
		// Verify amount matches expected value (1 vote = 100 Naira = 10000 kobo)
		// -------------------------------------------------------------
		const expectedAmountKobo = votesCount * 100 * 100;
		if (actualAmountKobo < expectedAmountKobo) {
			return new Response(
				JSON.stringify({
					success: false,
					message: `Incorrect payment amount. Expected at least ${expectedAmountKobo} kobo, received ${actualAmountKobo} kobo.`,
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
			// Return 200 OK so that Paystack webhooks stop retrying and frontend knows it is success.
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
