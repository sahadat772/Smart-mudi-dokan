# Subscription operations

New shops start on a 14-day trial. The backend keeps reads available after a
trial ends, but blocks business writes until the shop is active again. Existing
legacy shops without a `shops/{shopId}` document remain available while they
are being migrated.

## Manual activation

Until a payment gateway and an admin billing screen are added, an operator can
activate a shop in the Firebase console by editing `shops/{shopId}`:

- Set `status` to `active`.
- Set `plan` to `basic` or `pro`.
- Remove `trialEndsAt` for a paid/manual plan.

To extend a trial, keep `plan: "trial"`, set `status: "active"`, and set
`trialEndsAt` to a future Firestore timestamp. To suspend access, set
`status` to `suspended`. Shop data is retained; expired or suspended shops
can continue reading it but cannot create or update business records.

Automated payment collection and renewal are not implemented yet.
