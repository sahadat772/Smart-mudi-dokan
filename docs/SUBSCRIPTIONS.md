# Subscription operations

New shops start with a 14-day trial. Expired or suspended shops retain read
access while business writes are restricted. Shop owners can submit a manual
subscription payment request; a configured platform admin verifies receipt of
funds and approves or rejects the request.

## Render environment configuration

Set the following variables on the **backend** Render service. Do not put these
values in frontend `VITE_` variables.

- `SUBSCRIPTION_BASIC_MONTHLY_PRICE_BDT`
- `SUBSCRIPTION_BASIC_YEARLY_PRICE_BDT`
- `SUBSCRIPTION_PRO_MONTHLY_PRICE_BDT`
- `SUBSCRIPTION_PRO_YEARLY_PRICE_BDT`
- `MANUAL_PAYMENT_BKASH_INSTRUCTIONS`
- `MANUAL_PAYMENT_NAGAD_INSTRUCTIONS`
- `MANUAL_PAYMENT_BANK_INSTRUCTIONS`
- `MANUAL_PAYMENT_CASH_INSTRUCTIONS`
- `PLATFORM_ADMIN_UIDS` — comma-separated Firebase Auth UIDs allowed to review requests

Only payment methods with non-empty instructions are shown. Prices are always
read from the server environment; the browser cannot choose the amount. Keep
payment instructions limited to public receiving details. Never publish account
passwords, PINs, OTPs, API keys, or service-account JSON.

## Owner payment flow

1. The owner opens **Subscription**, selects a plan and billing cycle, and
   follows the displayed bKash, Nagad, bank, or cash instructions.
2. For electronic payment, the owner submits the transaction/reference number
   and payer phone where applicable. The request remains pending and does not
   activate the plan.
3. A platform admin verifies the funds in the relevant wallet/bank or cash
   receipt, then approves or rejects the request in **Payment approvals**.
4. Approval activates the requested plan and adds its month/year to the current
   subscription end date. Rejection releases the shop to submit a new request.

The manual review screen does not verify payments automatically. Admin access is
controlled by `PLATFORM_ADMIN_UIDS`, separately from the shop-owner role.

## Legacy/manual activation

For support cases, an operator may edit `shops/{shopId}` in Firestore:

- Set `status` to `active`.
- Set `plan` to `basic` or `pro`.
- Set `subscriptionEndsAt` to the agreed end time and remove `trialEndsAt`.
- To suspend access, set `status` to `suspended`.

Shop data is retained when a subscription expires or is suspended.

## SSLCommerz

SSLCommerz checkout is not part of the active subscription flow. Subscription
payments are manual until an online gateway is deliberately reintroduced.

