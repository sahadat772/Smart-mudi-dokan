# W0 release gate — branch protection & Firestore backup

**Status as of 2026-11-25 (agent audit):**

| Item | Can agent complete? | Status |
|---|---|---|
| CI workflow on main | Yes (already on main) | Done — run 45361609550 success on `09ab272` |
| Required check “Lint, build and security” on `main` | **No** — needs repo admin in GitHub UI/API with admin token | **Owner action required** |
| Firestore scheduled backup confirmation | **No** — needs Firebase/GCP project owner | **Owner action required** |
| Restore drill into isolated project | **No** — needs owner + isolated project | **Owner action required** |

Job name in CI (use this exact string as required status check):

```text
Lint, build and security
```

Workflow file: `.github/workflows/ci.yml`  
Workflow display name: `Project CI`

---

## A) Enable required check on `main` (2 minutes)

1. Open: https://github.com/sahadat772/Smart-mudi-dokan/settings/branches  
2. Under **Branch protection rules** → **Add rule** (or edit existing `main` rule).  
3. Branch name pattern: `main`  
4. Enable:
   - **Require a pull request before merging** (recommended)
   - **Require status checks to pass before merging**
   - **Require branches to be up to date before merging** (optional but recommended)
5. In **Status checks that are required**, search and select:
   - `Lint, build and security`
6. Optionally enable:
   - **Do not allow bypassing the above settings**
   - **Restrict who can push to matching branches**
7. Save changes.

### Verify

- Create a tiny docs-only PR → confirm merge is blocked until the check is green.
- Or GET (authenticated):
  `GET /repos/sahadat772/Smart-mudi-dokan/branches/main/protection`
  and confirm `required_status_checks.contexts` includes `Lint, build and security`.

### CLI alternative (repo admin + `gh` auth)

```bash
gh api -X PUT repos/sahadat772/Smart-mudi-dokan/branches/main/protection \
  -H "Accept: application/vnd.github+json" \
  -f required_status_checks='{"strict":true,"contexts":["Lint, build and security"]}' \
  -F enforce_admins=true \
  -F required_pull_request_reviews='{"required_approving_review_count":0}' \
  -F restrictions= \
  -F allow_force_pushes=false \
  -F allow_deletions=false
```

(Adjust PR review count if you want mandatory human review.)

---

## B) Firestore backup schedule + restore drill

### B1 — Confirm or create scheduled backup

1. Google Cloud Console → select the Firebase/GCP project used by Smart Mudi.
2. **Firestore** → **Import/Export** (or **Backups**, depending on console version).
3. Prefer **scheduled backups** (native) if available on the project; otherwise set a recurring **managed export** to a dedicated GCS bucket.
4. Record:
   - Schedule (e.g. daily)
   - Retention
   - Destination bucket (not public)
   - Last successful completion time
   - Who is authorized to restore

Official refs:
- https://firebase.google.com/docs/firestore/backups
- https://cloud.google.com/firestore/docs/backups
- https://cloud.google.com/firestore/docs/manage-data/export-import

### B2 — Restore drill (required before treating W0 backup as complete)

1. Create or use an **isolated** GCP/Firebase project (never restore over production first).
2. Restore latest backup/export into that project.
3. Compare:
   - Collection list
   - Approximate document counts for `shops`, `users`, `products`, `sales`, `customers`
   - Sample 2–3 business records (IDs only in notes; no secrets)
4. Write evidence in README Progress log:
   - Date
   - Source backup ID / export path
   - Target project ID
   - Counts matched / mismatches
   - Operator name
5. Only after a successful isolated restore may production restore be considered with a written impact plan.

### B3 — Policy minimum

- Backup exists and has completed successfully at least once.
- Destination is private.
- Restore operator is named.
- Isolated restore drill completed and logged.

---

## What is already done (no owner action)

- CI on `main` is green: https://github.com/sahadat772/Smart-mudi-dokan/actions/runs/45361609550
- HEAD `09ab272` includes lint, 24 unit, 48 cross-shop API, Emulator security, production build.
- Live health (2026-11-25 agent check):
  - `https://smart-mudi-dokan-1.onrender.com/api/health` → 200
  - `https://smart-mudi-dokan-1.onrender.com/api/firebase-health` → 200
  - `https://smart-mudi-dokan.vercel.app/` → 200

---

## After you finish A + B

Reply with:

1. Screenshot or note that `Lint, build and security` is required on `main`.
2. Backup schedule + last success time.
3. Isolated restore drill result (counts only).

Then W0 admin items can be marked **closed** and work moves to **W1** staging cross-shop validation.
