# Faculty of Art Voting App

Voting application for the Faculty of Art used to run awards and contests. Built with Vite + React and Supabase. Includes an admin portal, voter portal, and a Supabase Edge Function to verify Paystack transactions and record votes.

**Tech Stack:**

- Frontend: React (Vite)
- Backend / Realtime DB: Supabase
- Payments: Paystack (verification via Supabase Edge Function)

**Quick Start**

Requirements:

- Node.js 18+ and npm

Install and run locally:

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
npm run preview
```

Linting:

```bash
npm run lint
```

**Environment variables**

Frontend (.env or Vite environment):

- `VITE_SUPABASE_URL` — your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon/public key

Server / Edge Function (set in Supabase or server environment):

- `SUPABASE_URL` — your Supabase project URL (used by the function)
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key for privileged DB operations
- `PAYSTACK_SECRET_KEY` — Paystack secret key used by the `verify-payment` function

**Supabase Edge Function (payment verification)**

The project includes an Edge Function at `supabase/functions/verify-payment/index.ts` which:

- Verifies a Paystack transaction reference
- Confirms the paid amount matches the expected amount for the requested vote count
- Calls a Postgres RPC (`record_vote`) to atomically record votes and update contestant totals

Deploy the function with the Supabase CLI (example):

```bash
supabase functions deploy verify-payment --project-ref <your-project-ref>
supabase secrets set PAYSTACK_SECRET_KEY=sk_test_xxx
```
