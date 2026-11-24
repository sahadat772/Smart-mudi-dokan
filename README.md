# Smart Mudi Manager POS

বাংলাদেশের মুদি দোকানের জন্য multi-shop POS, inventory ও shop-management SaaS।

> এই README-ই project-এর living blueprint। প্রতিটি কাজ শেষ হলে status, evidence, commit/PR ও পরের কাজ এখানে আপডেট করতে হবে। “কোডে আছে”, “deployed” এবং “live verified” আলাদা status।

## লক্ষ্য

নিরাপদ বাংলা-উপযোগী POS তৈরি: বিক্রি, stock, customer due, supplier purchase, cash/expense, reports, staff ও subscription। এক দোকানের তথ্য অন্য দোকানে দেখা বা পরিবর্তন করা যাবে না। AI সহায়তা হবে অনুমতি-নিয়ন্ত্রিত।

## রিপোর্ট ও যাচাইয়ের ভিত্তি

এই roadmap ব্যবহারকারীর দেওয়া “Smart Mudi Manager POS — সম্পূর্ণ Project Progress Report” (24 Nov 2026), GitHub repository-র পাঠযোগ্য main/PR তথ্য এবং official tool documentation মিলিয়ে তৈরি।

রিপোর্টে Render/Firebase live, lint/build, 24 security unit, 48 integration, 51 Emulator tests এবং কিছু manual smoke check সফল বলা হয়েছে। এই audit-এ সব run log বা live credentials independently যাচাই হয়নি। GitHub main-এ Vercel deployment status success দেখা গেছে; এটি backend, payment, database বা end-to-end business flow সফল হওয়ার প্রমাণ নয়। তাই report-এর test-কে “reported” বলা হয়েছে, independently verified নয়।

## বর্তমান snapshot

| বিষয় | পাওয়া অবস্থা | বাকি যাচাই |
|---|---|---|
| Stack | React, TypeScript, Vite, Tailwind; Express API; Firebase Auth/Firestore Admin; Vercel frontend, Render backend বলে রিপোর্ট | deployment URLs, env mapping, health checks, release/rollback runbook |
| POS | Dashboard, sales, products, customer due, purchases/suppliers, expenses/cash, reports, staff/settings | end-to-end reconciliation, returns/refunds, thermal printer |
| Access | owner/employee roles, permissions, shop scoping; staff password re-auth endpoint | দুই shop দিয়ে cross-tenant tests; deployed backend-এ fix আছে কি না |
| Subscription | 14-day trial, expiry guard, Basic/Pro options, manual payment review/history | backend-এ সব route-এ plan limit; sandbox/live end-to-end |
| Tests | Emulator config/security tests repository-তে আছে বলে report | clean checkout-এ reproducible CI logs |
| Deployment | main-এর Vercel status success | Render/Firebase live status independent check; CI ও branch protection |
| Notifications/AI/Admin | derived alerts, support chat/voice, payment-review-এর সীমিত admin | persistent notifications, scoped business insight, full audit trail |

### Code review থেকে follow-up risk

- Timestamp-suffix shop ID হলে concurrent registration collision হতে পারে; uniqueness ও duplicate-create test দরকার।
- Cash-close totals transaction-এর বাইরে হিসাব হলে concurrent sale-এ stale close হতে পারে।
- reports.view employee-কে COGS/profit দেখায় কি না policy অনুযায়ী স্পষ্ট করতে হবে।
- সব route, nested lookup, report, staff, settings, payment ও export-এ shop ownership যাচাই নিশ্চিত করতে হবে।
- Public registration abuse/rate limit, invalid input, duplicate account ও rollback পরীক্ষা দরকার।
- Service-account, payment secret বা API key কখনো client bundle, logs, prompt বা README-তে নয়।

## Target business workflow

1. Registration: owner → shop → defaults/trial → auth verification → setup checklist.
2. Setup: profile, units/receipt, products/opening stock, customer/supplier, employee permissions.
3. Purchase: invoice/received quantity/cost → stock increment → payable ও payment ledger.
4. Sale: scan/search → quantity/unit validation → stock check → discount/tax → cash/due/mixed payment → stock decrement, ledger, receipt.
5. Operations: due collection, supplier payment, expense, cash movement, returns/refunds, shift/day close.
6. Review: sales, gross profit/COGS, low stock, dues, payables, expenses, cash reconciliation.
7. Subscription: trial/plan → payment request → server verification → idempotent activation → history/expiry.
8. Support: docs-first; AI insights only via authenticated, shop-scoped, initially read-only tools.

## Delivery workflow

### P0 — Reproducible baseline and release gate

- Sync local checkout with GitHub main; record SHA and working tree.
- Verify env var names without printing values; remove/rotate exposed credentials through proper owner process.
- Clean install, lint, typecheck, build, unit/API/Emulator tests; persist commit-pinned results in CI.
- Add GitHub Actions PR/main checks; keep preview separate from production; require green checks.
- Document deploy, health, rollback and backup/restore.

**Exit:** same commit builds/tests reproducibly; deployment and rollback target known; no tracked secrets.

### P0 — Tenant isolation

- Server-side authenticated shop resolver is the only tenant source; never trust client shopId without membership check.
- Review every read/write route and indirect lookup by ID, nested docs, report, dashboard, staff, settings, payments and exports.
- Test Shop A owner/employee reading or changing Shop B data (deny), and valid same-shop actions (allow).
- Inventory orphan/historical records and map owner-to-shop explicitly.
- Record actor/shop/action in audit events without sensitive payload.

**Exit:** automated cross-shop allow/deny tests pass on Emulator and staging; historical mapping report reviewed.

### P0/P1 — Data correctness and migration

- Publish schema/data dictionary: collections, fields/types, shop relation, source of truth, indexes and retention.
- Read-only inventory of missing shopId, duplicate IDs, orphan refs, invalid units, collection counts and totals.
- Approve mapping; dry-run idempotently; backup; batch migration; compare counts and financial totals; rollback plan.
- Enforce piece integer and weight decimal quantities at API; define negative-stock policy.
- Make sale, stock, payment ledger and cash close atomic/idempotent as required; returns are auditable reversals.

**Exit:** no unexplained orphan/duplicate rows; migration repeatable and totals reconciled.

### P1 — POS operational QA

- Scenarios: purchase→stock, sale→stock/cash/due, collection, supplier payment, expense, cash close and reports.
- Test retries/double-submit, concurrent sales, fractional weight, barcode, partial payment, timezone boundary and denied permissions.
- Test receipt in browser and target 80mm printer; record model/settings.
- Reconcile reports to source ledger.

**Exit:** scenario checklist and sample ledger reconcile; critical stock/cash defects fixed.

### P1 — Onboarding, subscription, operations

- Staging self-registration/first-login, validation, duplicate submit and recovery.
- Enforce product/staff limits on backend for create/import routes.
- Payment sandbox: request, callback, server verification, duplicate callback, amount/currency mismatch, expiry/refund.
- Never treat browser return URL as payment proof; provide payment history/admin trail.
- Verify hosting health/logs/alerts, backup and restore drill.

**Exit:** trial→plan flow reproducible; operations checklist complete.

### P2 — Notifications, AI and platform admin

- Persist shop-scoped notifications: category, priority, created/read, employee/security/payment events.
- Start AI with Bengali help and read-only sales/profit/stock/due tools; show date range and calculation definitions.
- Require confirmation for writes; log actor/action/result; redact personal data and enforce cost limits.
- Separate platform-admin roles/auth, shop/plan overview, payment review and audit trail.

**Exit:** AI cannot query arbitrary tenant data or make unconfirmed financial changes; admin access audited.

### P3 — Growth

Prioritize from customer evidence: export/backup, PWA/offline, SMS/email/push, camera barcode, ecommerce/order-to-POS, multi-branch. Before release define permissions, retries/idempotency, privacy, cost and support procedure.

## Work queue

| ID | Task | Priority | Done when |
|---|---|---:|---|
| W0 | Local/main baseline, CI, lint/build/Emulator evidence | P0 | commit-pinned green CI; rollback documented |
| W1 | Two-shop owner/employee isolation; deployed fix check | P0 | Emulator + staging allow/deny pass |
| W2 | Schema/data dictionary and historical shopId inventory | P0 | reviewed dry-run report and rollback plan |
| W3 | Stock/due/supplier/cash reconciliation, cash-close race, unit validation | P0 | end-to-end ledger scenarios reconcile |
| W4 | Registration/onboarding and backend plan limits | P1 | staging setup succeeds; limits enforced |
| W5 | Payment sandbox and subscription lifecycle | P1 | callbacks/idempotency/failure paths pass |
| W6 | Persistent notifications, platform admin and audit | P2 | scoped events/actions auditable |
| W7 | AI read-only business insights | P2 | tenant-scoped tools and cost/privacy controls |
| W8 | Growth integrations | P3 | prioritized and acceptance-tested |

## Automation research (24 Nov 2026)

**সিদ্ধান্ত:** এগুলো API, MCP বা browser automation দিয়ে যুক্ত করা সম্ভব। Release-এর মূল backbone হবে GitHub checks ও hosting-native deploy; AI/browser হবে সীমিত operator/QA layer।

| Tool | Automation | ব্যবহার/সীমা |
|---|---|---|
| GitHub | PR, checks, source/review | required CI checks; merge gate |
| Render | REST API, deploy hook, cron | green CI-এর পর staging deploy/health check; hook URL secret |
| Vercel | REST API ও Git integration | PR preview, merge-to-main production; env value agent-এ নয় |
| Firebase | Admin SDK/ADC, Emulator, scheduled functions | server tasks ও local security tests; Admin SDK rules bypass করতে পারে, তাই IAM ও app authorization আবশ্যক |
| OpenClaw | MCP/custom tools/browser | allowlisted status/read tools; production DB/deploy secret নয় |
| Google Antigravity | MCP, Chrome DevTools, integrations | developer/review/staging QA; MCP server permissions যাচাই |
| Gemini API / AI Studio | function calling/API workflow | AI Studio prototype; production call server-side, schema-validated tools |
| Perplexity | hosted MCP endpoint https://api.perplexity.ai/mcp, API | docs/web research; deploy permission নয় |
| Hugging Face | MCP client, Inference Endpoints MCP | model experiments; latency/cost/privacy মেপে |
| Chromium/Chrome | DevTools protocol/MCP, Playwright | disposable test account দিয়ে staging smoke; production profile নয় |

### Suggested automation flow

    Developer → branch/PR → GitHub Actions
                             ├─ lint/typecheck/build/unit/API
                             ├─ Firebase Emulator security/integration
                             └─ pass → Vercel Preview + Render staging
                                              ├─ health + Playwright smoke
                                              └─ review/merge → production deploy
                                                               └─ health/rollback monitor

- প্রথমে reproducible CI, তারপর staging auto-deploy, production merge/review gate-এর পরে।
- Firebase credentials, Render/Vercel tokens, payment secrets secret manager-এ রাখুন; prompt/log/README-তে নয়।
- AI agent-কে default read-only docs/status/staging tools দিন। Migration, refund, access change, financial write ও production deploy-এ human approval এবং audit event চাই।
- MCP server allowlist, minimum scope, per-task credential ও audit log ব্যবহার করুন।
- Backup/restore ও rollback-ও test করুন; শুধু deploy trigger যথেষ্ট নয়।

### Official documentation

- Render: [REST API](https://render.com/docs/api), [Deploy Hooks](https://render.com/docs/deploy-hooks), [Cron](https://render.com/docs/cronjobs)
- Vercel: [REST API](https://vercel.com/docs/rest-api), [Git deployments](https://vercel.com/docs/git)
- Firebase: [Admin setup](https://firebase.google.com/docs/admin/setup), [Emulator](https://firebase.google.com/docs/emulator-suite/install_and_configure), [Firestore security](https://firebase.google.com/docs/firestore/security/insecure-rules), [Scheduled Functions](https://firebase.google.com/docs/functions/schedule-functions)
- OpenClaw: [MCP](https://docs.openclaw.ai/tools/mcp), [Tool plugins](https://docs.openclaw.ai/plugins/tool-plugins), [Browser](https://docs.openclaw.ai/browser)
- Google: [Antigravity MCP](https://antigravity.google/docs/mcp), [Gemini API](https://ai.google.dev/gemini-api/docs/get-started)
- [Perplexity MCP](https://docs.perplexity.ai/guides/mcp-server)
- Hugging Face: [MCP client](https://huggingface.co/docs/huggingface_hub/package_reference/mcp), [Inference Endpoint MCP](https://huggingface.co/docs/inference-endpoints/guides/mcp_server)
- [Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp)

## Task শেষে README update নিয়ম

1. Task/scope/risk/acceptance criteria লিখুন।
2. Branch/commit inspect করে ছোট, reviewable change করুন।
3. প্রাসঙ্গিক checks চালিয়ে command, commit SHA, ফল ও সীমাবদ্ধতা লিখুন।
4. দরকারে staging-এ deploy/live verify করুন; code complete আর live verified আলাদা রাখুন।
5. Task শেষে status, evidence, PR/commit, next task এই README-তে যোগ করুন।

## Progress log

### 2026-11-24 — baseline roadmap
- Progress report-এর দাবি ও verification caveat নথিভুক্ত।
- GitHub main-এ Vercel deployment success status দেখা; full production verification নয়।
- Snapshot, risk list, P0–P3 workflow, task queue ও official integrations research যুক্ত।
- Next: W0 local/main baseline এবং CI evidence; তারপর W1 cross-shop staging validation.

### 2026-11-24 — W0 baseline checks
- F:/new file/smart-mudi-manager checkout main branch-এ clean; HEAD 561c8149c7be1d1e021f96da34def27eeecafda8, origin/main-এর সঙ্গে মিলেছে।
- npm run lint: pass (tsc --noEmit).
- npm run test:security: pass, 24/24.
- npm run test:security:integration: pass, 48/48. কিছু denied cross-shop request server-এ expected 404 log করেছে; suite pass করেছে।
- npm run build: verified হয়নি—Vite config bundling F: checkout-এর node_modules-এ temp file লিখতে চেয়েছে, sandbox EPERM দিয়েছে। runner loader বিকল্পটি __dirname incompatibility-তে ব্যর্থ। build বা repository source পরিবর্তিত হয়নি।
- Emulator suite ও GitHub Actions CI এখনও চালু/প্রমাণিত নয়। Next: safe writable build/Emulator environment, তারপর W0 CI workflow.


### 2026-11-24 — W0 baseline follow-up and CI proposal
- Build follow-up: normal Vite config bundling was blocked by sandbox write access to F: node_modules. Ran Vite with runner loader and a temporary __dirname shim/output under the allowed temp directory; production build passed (2,277 modules). Bundle warning: main minified JS chunk is about 1.34 MB (382 KB gzip), above the 500 KB warning threshold; code-splitting optimization remains follow-up.
- Emulator security test was started but produced no startup/test output after about 90 seconds; interrupted, result is not verified. No pass claim.
- Added proposed PR workflow on branch codex/w0-ci-baseline: Node 22, Java 21, npm ci, lint, 24 unit tests, 48 API integration tests, Firebase Emulator security tests using firebase-tools 15.37.0, and production build. Awaiting GitHub Actions run before treating CI as established.
- F: local checkout was not modified. GitHub README and workflow changes are on a review branch; current local checkout is now behind README commits on origin/main.
- Next: inspect PR checks; resolve any CI/Emulator failures; then merge only after checks pass. Keep large-bundle optimization and staging cross-shop manual check in W0/W1 follow-up.
