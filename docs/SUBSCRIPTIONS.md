# Subscription operations

New shops start on a 14-day trial. The backend keeps reads available after a
trial ends, but blocks business writes until the shop is active again. Existing
legacy shops without a `shops/{shopId}` document remain available while they
are being migrated.

## SSLCommerz renewal

The backend supports one-time monthly/yearly renewals for Basic and Pro. Checkout
stays unavailable until all credentials, public URLs, and four BDT prices are set
in `server/.env`:

- `SSLCOMMERZ_STORE_ID` and `SSLCOMMERZ_STORE_PASSWD`
- `SSLCOMMERZ_IS_SANDBOX=true` while testing; set `false` only for live merchant credentials
- `API_PUBLIC_URL` (public backend base URL) and `APP_PUBLIC_URL` (frontend base URL)
- `SSLCOMMERZ_BASIC_MONTHLY_PRICE_BDT`, `SSLCOMMERZ_BASIC_YEARLY_PRICE_BDT`,
  `SSLCOMMERZ_PRO_MONTHLY_PRICE_BDT`, `SSLCOMMERZ_PRO_YEARLY_PRICE_BDT`

Configure the merchant's IPN URL as
`{API_PUBLIC_URL}/api/subscriptions/sslcommerz/ipn`. Success, fail, and cancel
URLs are sent when creating each hosted checkout session. Successful callbacks
are confirmed with SSLCommerz's server-side validation API before the plan is
activated. Payments with risk level 1 are held for manual review. The callback
and IPN can arrive more than once; activation is idempotent.

After deployment, test a sandbox payment end to end before adding live merchant
credentials. No payment keys or prices belong in frontend `VITE_` variables.

## Manual activation fallback

Until a payment gateway and an admin billing screen are added, an operator can
activate a shop in the Firebase console by editing `shops/{shopId}`:

- Set `status` to `active`.
- Set `plan` to `basic` or `pro`.
- Remove `trialEndsAt` for a paid/manual plan.

To extend a trial, keep `plan: "trial"`, set `status: "active"`, and set
`trialEndsAt` to a future Firestore timestamp. To suspend access, set
`status` to `suspended`. Shop data is retained; expired or suspended shops
can continue reading it but cannot create or update business records.

Manual activation remains available for support and risk-review cases.
