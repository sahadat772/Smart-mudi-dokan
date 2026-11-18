# Baseline manual smoke test

Use a staging/demo shop account and non-production records. Record each result as
Pass, Fail, or Blocked. Do not put passwords, service-account JSON, API keys, or
real customer details in screenshots or notes.

## Before starting

- Confirm the existing backend credentials are still configured in the backend
  host. This checklist does not require replacing or sharing them.
- Use the deployment's normal app URL and verify the backend
  `/api/health` endpoint responds.
- Sign in with a shop owner account. If available, use a separate employee
  account for permission checks.
- Use this branch as a rollback reference if needed:
  `backup/pre-key-rotation-20261118`.

## Owner workflow

1. **Authentication:** Sign in, refresh the page, and confirm the same shop
   account remains signed in. Sign out and confirm the login screen appears.
2. **Products and stock:** Add a disposable product, update its price and stock,
   confirm the list reflects the changes, then deactivate it.
3. **Fractional quantity:** Add a weight-based product and sell 0.25 kg. Confirm
   the receipt total is one quarter of the per-kilogram price and stock decreases
   by 0.25 kg.
4. **POS and receipt:** Complete a small cash sale. Confirm the sale appears in
   recent sales and print preview shows the full receipt, including its total
   and footer.
5. **Customer due:** Make a small partly-paid sale for a disposable customer.
   Confirm the due appears, collect part of it, and verify the remaining due.
6. **Purchase and supplier:** Record a small purchase with a supplier and verify
   stock increases and the supplier balance matches the unpaid amount.
7. **Expense and cash:** Record a cash expense, close the cash session, and
   confirm expected cash reflects the sale and expense.
8. **Reports:** Compare the day's sales, expense, and cash figures with the
   disposable transactions recorded above.
9. **Staff permissions:** With an employee account, verify a permitted module is
   available and a module without view permission is inaccessible.
10. **Subscription and AI:** Confirm the subscription banner reflects the test
    shop's plan. If the AI key is configured, ask a basic app-usage question and
    verify text and voice controls respond.

## Record results

| Check | Result | Notes (no secrets or customer data) |
| --- | --- | --- |
| Authentication | | |
| Products and stock | | |
| Fractional quantity | | |
| POS and receipt | | |
| Customer due | | |
| Purchase and supplier | | |
| Expense and cash | | |
| Reports | | |
| Staff permissions | | |
| Subscription and AI | | |

This is a manual smoke checklist. Passing lint/build alone does not establish
that these workflows work against the deployed Firebase project or a physical
thermal printer.
