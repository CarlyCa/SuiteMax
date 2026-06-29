# SuiteMax Hornets Checkout POC

Next.js App Router + TypeScript sandbox for a Charlotte Hornets rep-generated suite checkout flow. Data is stored locally in `data/store.json` for the POC.

## Setup

1. `npm install`
2. `cp .env.example .env`
3. `npm run dev`
4. Open `http://localhost:3000/rep`

## Env vars

- `NEXT_PUBLIC_BASE_URL` (default: `http://localhost:3000`)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `DATA_DIR` (default: `./data`; use `/var/data` with a Render persistent disk)

## Local data

The app creates `data/store.json` automatically on first use with Hornets demo data.

To reset the POC data, stop the dev server and delete `data/store.json`.

## Render deployment

This repo includes `render.yaml` for a Render web service.

1. Push this project to GitHub.
2. In Render, choose **New → Blueprint** and select this repo.
3. Set these environment variables:
   - `NEXT_PUBLIC_BASE_URL`: your Render URL, for example `https://suitemax-hornets-checkout.onrender.com`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: your Stripe test publishable key, `pk_test_...`
   - `STRIPE_SECRET_KEY`: your Stripe test key, `sk_test_...`
   - `STRIPE_WEBHOOK_SECRET`: add this after creating the Stripe webhook endpoint
4. Deploy the service.
5. In Stripe Dashboard test mode, create a webhook endpoint:
   - URL: `https://your-render-url.onrender.com/api/stripe/webhook`
   - Event: `payment_intent.succeeded`
6. Copy that endpoint's signing secret, `whsec_...`, into Render as `STRIPE_WEBHOOK_SECRET`.
7. Redeploy or restart the Render service.

The blueprint mounts a 1 GB disk at `/var/data` so generated checkout links survive restarts. For a quick public demo without persistence, create a normal Render web service instead and omit `DATA_DIR`; links may reset after deploys/restarts.

## Stripe test mode

1. Set Stripe test keys in `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` and `STRIPE_SECRET_KEY`.
2. Create a checkout link from `/rep` or open seeded demo link `/checkout/hornets-demo`.
3. Use card `4242 4242 4242 4242`.

## Stripe CLI webhooks

1. `stripe login`
2. `stripe listen --forward-to localhost:3000/api/stripe/webhook`
3. Copy webhook signing secret into `STRIPE_WEBHOOK_SECRET`.

## Manual test path

1. Go to `/rep`.
2. Enter event, suite, price, tickets, parking, catering, buyer, and rep details.
3. Submit the form and copy/open the generated `/checkout/[token]` buyer link.
4. On the buyer page, review the summary and type the buyer name exactly in the purchase agreement signature field.
5. Confirm the Stripe submit button is disabled until the signature matches.
6. Enter payment details, sign the purchase agreement, and submit payment.
7. Confirm only the Stripe webhook marks the checkout link `paid`.
8. Confirm buyer and internal confirmation entries are recorded in `data/store.json`.
