# Secure and Reliable Payment-to-Vote Integration

This plan resolves the issue where payments confirmed on Paystack are missing from Supabase/the frontend (e.g., a voter paying 4 times but only receiving votes for 3). 

Currently, the application relies solely on the browser-side Paystack callback to invoke the database RPC `record_vote`. If a voter closes the tab, locks their device, or loses connectivity immediately after payment, the browser-side callback never runs, and the votes are lost. Additionally, invoking the database RPC directly from the frontend is a security risk.

The proposed solution will:
1. **Pass metadata** (`contestant_id`, `votes_count`, `email`) to Paystack during payment setup on the frontend.
2. **Upgrade the Supabase Edge Function** (`verify-payment`) to support:
   - Direct verification requests from the client.
   - Securely signed Webhook callbacks from Paystack using signature verification (`x-paystack-signature`).
3. **Update the Frontend** to invoke the Edge Function for verification rather than calling the database RPC directly.

---

## User Review Required

> [!IMPORTANT]
> **Paystack Webhook Configuration Required:**
> Once this plan is executed, you will need to add a webhook URL in your Paystack Dashboard settings:
> - **Webhook URL:** `https://<your-supabase-project-ref>.supabase.co/functions/v1/verify-payment`
> - Ensure your `PAYSTACK_SECRET_KEY` is set in Supabase Secrets.

---

## Proposed Changes

### Frontend Component

#### [MODIFY] [VoterPortal.jsx](file:///c:/Users/sulay/Documents/Awards/src/components/VoterPortal.jsx)
- Update `handlePaystackPayment` to pass custom `metadata` inside `window.PaystackPop.setup`.
- Update `handleRecordVote` to invoke the Supabase Edge Function `verify-payment` instead of calling `supabase.rpc('record_vote')` directly. This makes the client-side execution secure because the Edge Function performs backend validation of the transaction.

---

### Supabase Edge Function

#### [MODIFY] [index.ts](file:///c:/Users/sulay/Documents/Awards/supabase/functions/verify-payment/index.ts)
- Add signature verification function to validate incoming Paystack webhook requests using HMAC SHA512 and `PAYSTACK_SECRET_KEY`.
- Update the main request handler:
  - If the header `x-paystack-signature` is present, treat the request as a Paystack Webhook, verify its signature, extract metadata fields (`contestant_id`, `votes_count`, `email`) and the transaction reference, and execute the `record_vote` database RPC.
  - If the header is not present, treat it as a direct client verification request (for faster instant updates), call Paystack's transaction verification API, and execute `record_vote`.

---

## Verification Plan

### Automated/Local Tests
- Run `npm run dev` to verify the React frontend loads.
- Run a simulation using local Node scripts to trigger the edge function (direct vs webhook mode) and ensure proper parsing and validation.

### Manual Verification
- Test payment flow with mock/test checkout.
- Verify votes are registered on the dashboard/leaderboard when the edge function is called.
- Verify that duplicate transaction references do not lead to double votes.
