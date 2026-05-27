// Supabase Edge Function for Paystack Transaction Verification
// Deploy using: supabase functions deploy verify-payment --project-ref your-project-ref
// Set your secret key: supabase secrets set PAYSTACK_SECRET_KEY=sk_live_xxxx or sk_test_xxxx

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { reference, contestantId, votesCount, email } = await req.json()

    if (!reference || !contestantId || !votesCount || !email) {
      return new Response(
        JSON.stringify({ success: false, message: "Missing required parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY')
    if (!paystackSecret) {
      return new Response(
        JSON.stringify({ success: false, message: "Server misconfiguration: PAYSTACK_SECRET_KEY not set" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // 1. Query Paystack Verification Endpoint
    const paystackUrl = `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`
    const paystackResponse = await fetch(paystackUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${paystackSecret}`,
        'Content-Type': 'application/json'
      }
    })

    const paystackData = await paystackResponse.json()

    if (!paystackResponse.ok || !paystackData.status || paystackData.data.status !== 'success') {
      return new Response(
        JSON.stringify({ success: false, message: "Payment verification failed with Paystack" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Verify amount matches expected value (1 vote = 100 Naira = 10000 kobo)
    const expectedAmountKobo = votesCount * 100 * 100;
    const actualAmountKobo = paystackData.data.amount;

    if (actualAmountKobo < expectedAmountKobo) {
      return new Response(
        JSON.stringify({ success: false, message: `Incorrect payment amount. Expected at least ${expectedAmountKobo} kobo, received ${actualAmountKobo} kobo.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // 2. Initialize Supabase Admin Client (using service role key to write to DB)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ""
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ""
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // 3. Call the database function to record the vote and update contestant
    // Using RPC guarantees atomicity
    const { data: dbData, error: dbError } = await supabaseAdmin.rpc('record_vote', {
      p_contestant_id: contestantId,
      p_email: email,
      p_reference: reference,
      p_votes_count: votesCount,
      p_amount: votesCount * 100
    })

    if (dbError) {
      throw dbError
    }

    if (dbData && dbData.success) {
      return new Response(
        JSON.stringify({ success: true, message: "Transaction verified and vote cast!" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    } else {
      return new Response(
        JSON.stringify({ success: false, message: dbData?.message || "Failed to record vote in database" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
