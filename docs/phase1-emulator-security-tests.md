# Phase 1 — Firebase Emulator Security Tests

This suite runs the real Express API against the Firebase Authentication and Cloud Firestore emulators. It must never connect to a production Firebase project.

## Prerequisites

- Java 21 LTS (Java 11+ is the minimum supported by the Firebase Emulator Suite).
- Node.js 22.18+.
- Firebase CLI 15+.
- Project dependencies installed with `npm.cmd install`.

Check the tools in PowerShell:

```powershell
java -version
firebase.cmd --version
node --version
```

## Emulator configuration

`firebase.json` binds the local emulators to loopback only:

- Authentication: `127.0.0.1:9099`
- Firestore: `127.0.0.1:8080`
- Emulator UI: `127.0.0.1:4000`

The security test process explicitly enables Emulator mode, sets `NODE_ENV=test`, and is pinned to project ID `demo-smart-mudi-security` and Firestore database `(default)`. The Admin SDK does not load a service-account key in emulator mode.

## Run the complete suite (recommended)

From the repository root:

```powershell
npm.cmd run test:security:emulator:run
```

This command runs Firebase CLI `emulators:exec`, starts only Auth and Firestore, runs the API test suite, and shuts the emulators down afterward. The Emulator UI is available at http://127.0.0.1:4000 while the emulators are running.

## Run with emulators already started

Terminal 1:

```powershell
firebase.cmd emulators:start --project demo-smart-mudi-security --only auth,firestore
```

Terminal 2 (repository root):

```powershell
$env:FIREBASE_PROJECT_ID = "demo-smart-mudi-security"
$env:NODE_ENV = "development"
$env:FIREBASE_EMULATOR_ENABLED = "true"
$env:FIRESTORE_DATABASE_ID = "(default)"
$env:FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099"
$env:FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080"
$env:FIREBASE_SERVICE_ACCOUNT = ""
$env:GOOGLE_APPLICATION_CREDENTIALS = ""
npm.cmd run test:security:emulator
```

## What the suite verifies

- The Express API uses real Firebase Auth Emulator ID tokens and Firestore Emulator documents.
- Cross-shop reads and direct writes are isolated to the authenticated tenant.
- A request-body `shopId` cannot redirect a product write into another shop.
- Revoked refresh tokens and disabled Auth Emulator users are rejected by authentication middleware.
- Legacy `mustChangePassword` profile flags do not block otherwise authorized requests.
- Expired trials and suspended shops cannot perform protected writes.
- A concurrent cash-session update/close sequence leaves the session closed and prevents later updates.
- Emulator startup rejects production credential environment variables.

The test suite creates uniquely named temporary Auth users and Firestore documents, then attempts to clean them up. It does not call production services or mutate production data.

## Secret-free setup and production safety

**Never use production credentials with the Emulator Suite.** Do not paste credentials into commands, source files, documentation, or chat.

- Emulator mode requires `FIREBASE_EMULATOR_ENABLED=true`, `NODE_ENV=development` or `test`, both local emulator host variables, the exact demo project ID, and the default Firestore database.
- Emulator hosts must resolve to loopback and use the configured ports.
- Emulator settings fail startup when the opt-in is missing or `NODE_ENV` is missing, empty, production, or unsupported.
- `server/.env` is loaded only when `NODE_ENV=development`; tests supply their own isolated environment and do not load it.
- When `NODE_ENV=production`, Firebase Admin startup rejects emulator settings and uses Application Default Credentials with `FIREBASE_PROJECT_ID`.
- Emulator mode rejects non-empty `FIREBASE_SERVICE_ACCOUNT` and `GOOGLE_APPLICATION_CREDENTIALS` values.
- Emulator mode does not call `applicationDefault()`, read `serviceAccountKey.json`, or initialize with a service-account credential.
- Outside emulator mode, the server uses Application Default Credentials only. Configure ADC locally using your approved Google Cloud identity workflow; do not commit credential files.
- The test process sets its local environment and clears credential variables before importing Firebase Admin. Never copy production values into the emulator environment.
- Do not change the demo project ID to a real Firebase project.

If the emulator configuration is incomplete, points to a non-loopback host, uses a different project/database, or contains production credential environment variables, Firebase Admin initialization fails closed.

## Related validation

Run the existing suites separately as well:

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run test:security
npm.cmd run test:security:integration
npm.cmd run test:security:emulator:run
```

A successful mock/in-memory suite is not a substitute for a successful Auth + Firestore Emulator run. Do not mark Phase 1 Emulator verification complete until the final command reports all tests passing.
