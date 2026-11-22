import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { once } from "node:events";
import test, { after, before } from "node:test";
import type { Server } from "node:http";
import { randomUUID } from "node:crypto";

const PROJECT_ID = "demo-smart-mudi-security";
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST?.trim() || "";
const FIRESTORE_HOST = process.env.FIRESTORE_EMULATOR_HOST?.trim() || "";
const PASSWORD = "Local-emulator-only-Password-123!";

let adminAuth: any;
let adminDb: any;
let server: Server | undefined;
let baseUrl = "";
let getTodayDhakaDateKey: () => string;
const createdUsers: string[] = [];
const cleanupRefs: Array<{ delete: () => Promise<unknown> }> = [];

function emulatorEnvironment() {
  return {
    ...process.env,
    FIREBASE_PROJECT_ID: PROJECT_ID,
    FIRESTORE_DATABASE_ID: "(default)",
    FIREBASE_AUTH_EMULATOR_HOST: AUTH_HOST,
    FIRESTORE_EMULATOR_HOST: FIRESTORE_HOST,
    FIREBASE_SERVICE_ACCOUNT: "",
    GOOGLE_APPLICATION_CREDENTIALS: "",
  };
}

async function signIn(email: string) {
  const response = await fetch(
    `http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=emulator-api-key`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password: PASSWORD, returnSecureToken: true }),
    },
  );
  const body = await response.json() as { idToken?: string; error?: { message?: string } };
  assert.equal(response.ok, true, `Auth Emulator sign-in failed: ${body.error?.message || response.status}`);
  assert.ok(body.idToken, "Auth Emulator did not return an ID token.");
  return body.idToken;
}

async function createOwner(label: string, options: {
  plan?: string;
  status?: string;
  trialEndsAt?: Date;
  subscriptionEndsAt?: Date;
} = {}) {
  const id = randomUUID();
  const email = `owner-${label}-${id}@example.test`;
  const authUser = await adminAuth.createUser({ email, password: PASSWORD });
  createdUsers.push(authUser.uid);
  const shopId = `shop-${label}-${id}`;

  await adminAuth.setCustomUserClaims(authUser.uid, {
    role: "owner",
    shopId,
  });

  const userRef = adminDb.collection("users").doc(authUser.uid);
  const shopRef = adminDb.collection("shops").doc(shopId);
  cleanupRefs.push(userRef, shopRef);

  await userRef.set({
    uid: authUser.uid,
    email,
    role: "owner",
    shopId,
    active: true,
    mustChangePassword: false,
    permissions: {},
    displayName: `Owner ${label}`,
  });

  await shopRef.set({
    id: shopId,
    name: `Emulator Shop ${label}`,
    ownerUid: authUser.uid,
    plan: options.plan || "pro",
    status: options.status || "active",
    subscriptionEndsAt: options.subscriptionEndsAt || new Date(Date.now() + 7 * 86400000),
    ...(options.trialEndsAt ? { trialEndsAt: options.trialEndsAt } : {}),
  });

  return {
    uid: authUser.uid,
    email,
    shopId,
    token: await signIn(email),
  };
}

async function createEmployee(
  emailPrefix: string,
  shopId: string,
  options: { mustChangePassword?: boolean; permissions?: Record<string, unknown> } = {},
) {
  const id = randomUUID();
  const email = `${emailPrefix}-${id}@example.test`;
  const authUser = await adminAuth.createUser({ email, password: PASSWORD });
  createdUsers.push(authUser.uid);
  await adminAuth.setCustomUserClaims(authUser.uid, { role: "employee", shopId });

  const userRef = adminDb.collection("users").doc(authUser.uid);
  cleanupRefs.push(userRef);
  await userRef.set({
    uid: authUser.uid,
    email,
    role: "employee",
    shopId,
    active: true,
    mustChangePassword: options.mustChangePassword === true,
    permissions: options.permissions || {},
    displayName: "Emulator Employee",
  });

  return { uid: authUser.uid, email, token: await signIn(email) };
}

async function apiRequest(
  token: string,
  path: string,
  options: { method?: string; body?: Record<string, unknown> } = {},
) {
  return fetch(`${baseUrl}${path}`, {
    method: options.method || "GET",
    headers: {
      authorization: `Bearer ${token}`,
      ...(options.body ? { "content-type": "application/json" } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

function validProduct(sku: string) {
  return {
    name: `Emulator product ${sku}`,
    category: "অন্যান্য",
    unit: "পিস",
    sku,
    costPrice: 10,
    sellingPrice: 12,
    stockQuantity: 5,
    lowStockThreshold: 1,
  };
}

before(async () => {
  assert.ok(AUTH_HOST, "FIREBASE_AUTH_EMULATOR_HOST is required. Start tests through Firebase Emulator Suite.");
  assert.ok(FIRESTORE_HOST, "FIRESTORE_EMULATOR_HOST is required. Start tests through Firebase Emulator Suite.");

  process.env.FIREBASE_PROJECT_ID = PROJECT_ID;
  process.env.FIRESTORE_DATABASE_ID = "(default)";
  // Empty values are intentional: dotenv must not inject production credentials
  // from a developer's server/.env while this test process initializes Firebase.
  process.env.FIREBASE_SERVICE_ACCOUNT = "";
  process.env.GOOGLE_APPLICATION_CREDENTIALS = "";

  const firebaseAdmin = await import("../../server/firebaseAdmin.ts");
  adminAuth = firebaseAdmin.adminAuth;
  adminDb = firebaseAdmin.adminDb;
  ({ getTodayDhakaDateKey } = await import("../../server/dateUtils.ts"));

  const { createApp } = await import("../../server/app.ts");
  server = createApp().listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Emulator security API failed to bind an ephemeral local port.");
  }
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server!.close((error) => error ? reject(error) : resolve());
    });
  }

  for (const ref of cleanupRefs.reverse()) {
    try { await ref.delete(); } catch { /* Emulator cleanup is best-effort. */ }
  }
  for (const uid of createdUsers) {
    try { await adminAuth?.deleteUser(uid); } catch { /* User may already be deleted. */ }
  }

  if (adminDb) await adminDb.terminate?.();
  const { deleteApp, getApps } = await import("firebase-admin/app");
  await Promise.all(getApps().map((app) => deleteApp(app)));
});

test("emulator bootstrap refuses production credential environment variables", async (t) => {
  for (const [label, variable, value] of [
    ["service-account JSON", "FIREBASE_SERVICE_ACCOUNT", "test-only-not-a-credential"],
    ["ADC credential path", "GOOGLE_APPLICATION_CREDENTIALS", "C:\\private\\production-service-account.json"],
  ]) {
    await t.test(label, () => {
      const env = {
        ...emulatorEnvironment(),
        [variable]: value,
      };
      const result = spawnSync(
        process.execPath,
        [
          "--import", "./tests/security/ts-resolution.mjs",
          "--input-type=module",
          "-e", "await import('./server/firebaseAdmin.ts')",
        ],
        { cwd: process.cwd(), env, encoding: "utf8", timeout: 15000 },
      );
      assert.notEqual(result.status, 0, "Emulator bootstrap unexpectedly accepted production credentials.");
      assert.match(
        result.stderr,
        /Production credential environment variables must be unset/,
      );
      assert.doesNotMatch(result.stderr, /test-only-not-a-credential|production-service-account/);
    });
  }
});

test("real Auth and Firestore emulators enforce tenant isolation for API reads and writes", async () => {
  const ownerA = await createOwner("a");
  const ownerB = await createOwner("b");

  const productARef = adminDb.collection("products").doc(`product-a-${randomUUID()}`);
  const productBRef = adminDb.collection("products").doc(`product-b-${randomUUID()}`);
  cleanupRefs.push(productARef, productBRef);

  await productARef.set({ ...validProduct("EMU-A"), shopId: ownerA.shopId, active: true });
  await productBRef.set({ ...validProduct("EMU-B"), shopId: ownerB.shopId, active: true });

  const readResponse = await apiRequest(ownerA.token, "/api/products?shopId=ignored");
  assert.equal(readResponse.status, 200);
  const readBody = await readResponse.json() as { products: Array<{ sku: string }> };
  assert.deepEqual(readBody.products.map((item) => item.sku), ["EMU-A"]);

  const crossShopUpdate = await apiRequest(
    ownerA.token,
    `/api/products/${productBRef.id}`,
    { method: "PUT", body: validProduct("EMU-B-TAMPERED") },
  );
  assert.equal(crossShopUpdate.status, 404);

  const spoofedCreate = await apiRequest(ownerA.token, "/api/products", {
    method: "POST",
    body: { ...validProduct("EMU-A-CREATED"), shopId: ownerB.shopId },
  });
  assert.equal(spoofedCreate.status, 201);

  const createdInA = await adminDb.collection("products")
    .where("shopId", "==", ownerA.shopId)
    .where("sku", "==", "EMU-A-CREATED")
    .get();
  const createdInB = await adminDb.collection("products")
    .where("shopId", "==", ownerB.shopId)
    .where("sku", "==", "EMU-A-CREATED")
    .get();
  assert.equal(createdInA.size, 1);
  assert.equal(createdInB.size, 0);
  cleanupRefs.push(...createdInA.docs.map((doc: any) => doc.ref));
});

test("real Auth Emulator rejects revoked and disabled ID tokens through Express middleware", async (t) => {
  await t.test("revoked refresh tokens", async () => {
    const principal = await createOwner("revoked");
    await adminAuth.revokeRefreshTokens(principal.uid);
    const response = await apiRequest(principal.token, "/api/products");
    assert.equal(response.status, 401);
  });

  await t.test("disabled Auth Emulator user", async () => {
    const principal = await createOwner("disabled");
    await adminAuth.updateUser(principal.uid, { disabled: true });
    const response = await apiRequest(principal.token, "/api/products");
    assert.equal(response.status, 401);
  });
});

test("first-login employees cannot access permission-protected business APIs", async () => {
  const owner = await createOwner("first-login");
  const employee = await createEmployee("first-login-employee", owner.shopId, {
    mustChangePassword: true,
    permissions: { products: { view: true, manage: false } },
  });

  const response = await apiRequest(employee.token, "/api/products");
  assert.equal(response.status, 403);
  const body = await response.json() as { message?: string };
  assert.match(body.message || "", /Password change is required/);
});

test("expired and suspended subscriptions reject real API writes", async (t) => {
  await t.test("expired trial", async () => {
    const owner = await createOwner("expired", {
      plan: "trial",
      status: "active",
      trialEndsAt: new Date(Date.now() - 60_000),
    });
    const response = await apiRequest(owner.token, "/api/products", {
      method: "POST",
      body: validProduct("EMU-EXPIRED"),
    });
    assert.equal(response.status, 402);
  });

  await t.test("suspended shop", async () => {
    const owner = await createOwner("suspended", {
      plan: "pro",
      status: "suspended",
    });
    const response = await apiRequest(owner.token, "/api/products", {
      method: "POST",
      body: validProduct("EMU-SUSPENDED"),
    });
    assert.equal(response.status, 402);
  });
});

test("Firestore Emulator preserves the closed state during concurrent cash update and close", async () => {
  const owner = await createOwner("cash-race");
  const date = getTodayDhakaDateKey();
  const sessionRef = adminDb.collection("cashSessions").doc(`${owner.shopId}_${date}`);
  cleanupRefs.push(sessionRef);
  await sessionRef.set({
    shopId: owner.shopId,
    date,
    openingCash: 50,
    bKashBalance: 0,
    nagadBalance: 0,
    bankBalance: 0,
    isClosed: false,
  });

  const [updateResponse, closeResponse] = await Promise.all([
    apiRequest(owner.token, "/api/cash/today", {
      method: "PATCH",
      body: { openingCash: 75 },
    }),
    apiRequest(owner.token, "/api/cash/today/close", {
      method: "POST",
      body: { actualClosingCash: 75 },
    }),
  ]);

  assert.ok([200, 400].includes(updateResponse.status));
  assert.equal(closeResponse.status, 200);

  const closedSession = await sessionRef.get();
  assert.equal(closedSession.data()?.isClosed, true);

  const afterCloseUpdate = await apiRequest(owner.token, "/api/cash/today", {
    method: "PATCH",
    body: { openingCash: 999 },
  });
  assert.equal(afterCloseUpdate.status, 400);
  assert.equal((await sessionRef.get()).data()?.isClosed, true);
});
