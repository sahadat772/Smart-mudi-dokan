# W1 — Staging cross-shop isolation checklist

**Goal:** Prove Shop A cannot read or change Shop B data on the **deployed** backend (not only unit/emulator tests).

**Related automated evidence already on main:**
- `npm run test:security` — 24 unit
- `npm run test:security:integration` — 48 cross-shop API
- `npm run test:security:emulator:run` — Emulator suite (CI green on `09ab272`)

Automated tests are necessary but **not sufficient** for W1 exit. Staging/live matrix below is required.

---

## Accounts to prepare (staging or throwaway production shops)

| Actor | Shop | Role |
|---|---|---|
| Owner A | Shop A | owner |
| Employee A | Shop A | employee with products+pos+customers view/manage as needed |
| Owner B | Shop B | owner |
| Employee B | Shop B | employee |

Record for the log (no passwords in README):
- Shop A id: ________
- Shop B id: ________
- Backend base URL: `https://smart-mudi-dokan-1.onrender.com` (or staging URL)
- Frontend: `https://smart-mudi-dokan.vercel.app`
- Deployed backend commit (Render dashboard): ________

---

## Matrix (Expected: Allow / Deny)

For each row: log in as the actor, try the action, mark Pass/Fail.

### Same-shop allow

| # | Actor | Action | Expected |
|---|---|---|---|
| A1 | Owner A | List products | Allow — only Shop A items |
| A2 | Owner A | Create product | Allow |
| A3 | Employee A | POS sale of Shop A product | Allow (if permission) |
| A4 | Owner A | List customers / collect due (own customer) | Allow |
| A5 | Owner B | List products | Allow — only Shop B items |

### Cross-shop deny

| # | Actor | Action | Expected |
|---|---|---|---|
| D1 | Owner A | Open product by Shop B product id (API or forced URL) | Deny (403/404) |
| D2 | Owner A | PATCH/PUT Shop B product | Deny |
| D3 | Owner A | List sales with `?shopId=<ShopB>` | Ignore query; still only Shop A (or deny) |
| D4 | Employee A | Collect due on Shop B customer id | Deny |
| D5 | Owner A | Change status of Shop B employee | Deny |
| D6 | Owner A | Change permissions of Shop B employee | Deny |
| D7 | Owner A | Close / open cash session as if Shop B | Deny / only Shop A session |
| D8 | Owner A | View Shop B settings payload | Deny / only Shop A settings |
| D9 | Owner A | Reports summary — no Shop B totals | Allow only Shop A figures |
| D10 | Owner A (token) with forged claim shopId=ShopB if testable | Still bound to membership Shop A | Deny access to B |

### Subscription / admin boundary

| # | Actor | Action | Expected |
|---|---|---|---|
| S1 | Owner A | Submit manual payment for own shop | Allow pending |
| S2 | Non-admin owner | Open platform payment approvals admin | Deny |
| S3 | PLATFORM_ADMIN_UIDS user | See pending requests | Allow |

---

## How to call APIs (browser DevTools or curl)

1. Log in on frontend → Application → IndexedDB/localStorage → copy Firebase ID token, **or** use Network tab Authorization header.
2. Example deny probe:

```bash
# Replace TOKEN and PRODUCT_B_ID
curl -sS -o /tmp/out.json -w "%{http_code}" \
  -H "Authorization: Bearer TOKEN" \
  "https://smart-mudi-dokan-1.onrender.com/api/products/PRODUCT_B_ID"
cat /tmp/out.json
```

Expected: **403 or 404**, never Shop B product JSON.

3. List probe:

```bash
curl -sS -H "Authorization: Bearer TOKEN_OWNER_A" \
  "https://smart-mudi-dokan-1.onrender.com/api/products?shopId=SHOP_B_ID"
```

Expected: only Shop A products (query param ignored).

---

## Pass criteria (W1 Done when)

- [ ] All **Allow** rows pass
- [ ] All **Deny** rows pass (no Shop B payload leaked)
- [ ] Render deployed commit recorded and matches intended release SHA (or noted delta)
- [ ] Results pasted into README Progress log (counts/status only; no tokens)

If any Deny row fails: **stop**, open a security fix PR, do not mark W1 complete.

---

## Agent limitations

- Agent cannot log in as real shop owners or hold production Firebase tokens.
- Agent verified automated suites and route use of `resolveShopId` on main.
- This checklist is the owner/operator gate for live isolation proof.
