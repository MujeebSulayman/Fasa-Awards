# Walkthrough - Payment to Vote Secure Integration

We have successfully resolved the issue where payments completed on Paystack were missing from Supabase and the frontend. We migrated the transaction logging flow from client-side direct RPC calls to a secured Supabase Edge Function that handles both direct frontend verification requests and asynchronous Paystack webhooks (with security signature checks).

---

## What Was Changed

### 1. Frontend Checkout Metadata & Function Call
Modified: [VoterPortal.jsx](file:///c:/Users/sulay/Documents/Awards/src/components/VoterPortal.jsx)
- Added `metadata` containing `contestant_id`, `votes_count`, and the voter's `email` to `window.PaystackPop.setup`. This metadata travels with the Paystack transaction.
- Swapped direct database RPC logging with a request to the `verify-payment` Edge Function:
  ```javascript
  const { data, error } = await supabase.functions.invoke('verify-payment', {
      body: { reference, contestantId, votesCount, email }
  });
  ```

### 2. Edge Function Webhook and Signature Verification
Modified: [index.ts](file:///c:/Users/sulay/Documents/Awards/supabase/functions/verify-payment/index.ts)
- **Signature Verification:** Added `verifyPaystackSignature` which computes the HMAC-SHA512 signature of the request body using `PAYSTACK_SECRET_KEY` and compares it to the incoming `x-paystack-signature` header.
- **Webhook Handling:** Parses the standard webhook event (`charge.success`), extracts the metadata (`contestant_id`, `votes_count`, `email`), validates parameters, verifies the paid amount, and logs the vote.
- **Direct Client Mode:** Fallback option to process verification requests originating directly from the frontend if signature header is absent.
- **Idempotency Handling:** If the vote was already successfully registered (e.g. by the client frontend callback prior to webhook arrival), the function returns a `200 OK` (with success status) so Paystack stops retrying.

---

## Setup & Deployment Instructions

### Step 1: Deploy the Supabase Edge Function
Run the following CLI command to deploy the updated `verify-payment` function to your project:
```bash
supabase functions deploy verify-payment --project-ref <your-supabase-project-ref>
```

Ensure your secret keys are configured in Supabase:
```bash
supabase secrets set PAYSTACK_SECRET_KEY=sk_live_xxxx
```

### Step 2: Configure Webhook in Paystack Dashboard
1. Log in to your **Paystack Dashboard**.
2. Go to **Settings** > **API Keys & Webhooks**.
3. Set your **Webhook URL** to:
   `https://<your-supabase-project-ref>.supabase.co/functions/v1/verify-payment`
4. Save the configuration.

---

## Validation & Verification

1. **Frontend Compilation:** Verified that the frontend builds correctly using `npm run build`.
2. **Idempotency & Security:** Confirmed that duplicate webhook runs do not double-log votes but return a `200 OK` response to satisfy Paystack's delivery checks.
