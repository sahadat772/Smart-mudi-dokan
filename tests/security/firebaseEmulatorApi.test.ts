import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { once } from "node:events";
import test, { after, before } from "node:test";
import type { Server } from "node:http";
import { randomUUID } from "node:crypto";
import { getDhakaDateKey } from "../../server/dateUtils.ts";

const PROJECT_ID = "demo-smart-mudi-security";
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST?.trim() || "";
const FIRESTORE_HOST = process.env.FIRESTORE_EMULATOR_HOST?.trim() || "";
const PASSWORD = "Local-emulator-only-Password-123!";
let cashActivityNow = new Date();
let cashActivityClockCalls = 0;

let adminAuth: any;
let adminDb: any;
let server: Server | undefined;
let baseUrl = "";
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

const CASH_PAYMENT_METHOD = "নগদ (Cash)";

type CashScenario = {
  owner: { shopId: string; token: string };
  sessionRef: any;
  productId: string;
  customerId: string;
  supplierId: string;
};

async function createCashScenario(label: string): Promise<CashScenario> {
  const owner = await createOwner(label);
  const sessionResponse = await apiRequest(owner.token, "/api/cash/today");
  assert.equal(sessionResponse.status, 200);

  const date = getDhakaDateKey(cashActivityNow);
  const sessionRef = adminDb.collection("cashSessions").doc(`${owner.shopId}_${date}`);
  cleanupRefs.push(sessionRef);

  const openingResponse = await apiRequest(owner.token, "/api/cash/today", {
    method: "PATCH",
    body: { openingCash: 100 },
  });
  assert.equal(openingResponse.status, 200);

  const productRef = adminDb.collection("products").doc(`cash-${randomUUID()}`);
  const customerRef = adminDb.collection("customers").doc(`cash-${randomUUID()}`);
  const supplierRef = adminDb.collection("suppliers").doc(`cash-${randomUUID()}`);
  cleanupRefs.push(productRef, customerRef, supplierRef);

  await Promise.all([
    productRef.set({
      ...validProduct(productRef.id),
      shopId: owner.shopId,
      active: true,
    }),
    customerRef.set({
      shopId: owner.shopId,
      name: "Cash race customer",
      phone: "01700000000",
      active: true,
      totalPurchased: 0,
      totalPaid: 0,
      currentDue: 100,
    }),
    supplierRef.set({
      shopId: owner.shopId,
      companyName: "Cash race supplier",
      active: true,
      totalSupplied: 0,
      totalPaid: 0,
      outstandingBalance: 100,
    }),
  ]);

  return {
    owner,
    sessionRef,
    productId: productRef.id,
    customerId: customerRef.id,
    supplierId: supplierRef.id,
  };
}

function installTransactionStartBarrier(
  participants: number,
  manualRelease = false,
) {
  const originalDescriptor = Object.getOwnPropertyDescriptor(adminDb, "runTransaction");
  const runTransaction = adminDb.runTransaction.bind(adminDb);
  const ready = new Set<number>();
  const waiters: Array<{ id: number; resolve: () => void }> = [];
  const pending: Array<() => void> = [];
  let nextId = 0;
  let open = false;

  function markReady(id: number) {
    ready.add(id);
    for (let index = waiters.length - 1; index >= 0; index--) {
      if (waiters[index].id === id) {
        waiters[index].resolve();
        waiters.splice(index, 1);
      }
    }
  }

  function startPendingTransactions() {
    if (open || pending.length < participants || manualRelease) return;
    open = true;
    for (const start of pending.splice(0)) start();
  }

  function release() {
    if (open) return;
    open = true;
    for (const start of pending.splice(0)) start();
  }

  Object.defineProperty(adminDb, "runTransaction", {
    configurable: true,
    value: (operation: (tx: any) => Promise<unknown>, options?: unknown) => {
      const id = ++nextId;
      return new Promise((resolve, reject) => {
        const start = () => {
          runTransaction(operation, options).then(resolve, reject);
        };
        if (open) {
          start();
          return;
        }
        pending.push(start);
        markReady(id);
        startPendingTransactions();
      });
    },
  });

  return {
    waitUntilQueued(id: number) {
      if (ready.has(id)) return Promise.resolve();
      return new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error(`Transaction ${id} did not reach the start barrier.`)),
          15000,
        );
        waiters.push({
          id,
          resolve: () => {
            clearTimeout(timer);
            resolve();
          },
        });
      });
    },
    release,
    restore() {
      release();
      if (originalDescriptor) {
        Object.defineProperty(adminDb, "runTransaction", originalDescriptor);
      } else {
        delete adminDb.runTransaction;
      }
    },
  };
}

async function cashLedgerCount(collectionName: string, shopId: string) {
  const snapshot = await adminDb
    .collection(collectionName)
    .where("shopId", "==", shopId)
    .get();
  cleanupRefs.push(...snapshot.docs.map((doc: any) => doc.ref));
  return snapshot.size;
}

async function runCashWriteAgainstClose(
  owner: CashScenario["owner"],
  path: string,
  body: Record<string, unknown>,
  closeFirst: boolean,
) {
  const barrier = installTransactionStartBarrier(2);
  try {
    let writePromise: Promise<Response>;
    let closePromise: Promise<Response>;

    if (closeFirst) {
      closePromise = apiRequest(owner.token, "/api/cash/today/close", {
        method: "POST",
        body: { actualClosingCash: 1000 },
      });
      await barrier.waitUntilQueued(1);
      writePromise = apiRequest(owner.token, path, { method: "POST", body });
      await barrier.waitUntilQueued(2);
    } else {
      writePromise = apiRequest(owner.token, path, { method: "POST", body });
      await barrier.waitUntilQueued(1);
      closePromise = apiRequest(owner.token, "/api/cash/today/close", {
        method: "POST",
        body: { actualClosingCash: 1000 },
      });
      await barrier.waitUntilQueued(2);
    }

    const [writeResponse, closeResponse] = await Promise.all([writePromise, closePromise]);
    return { writeResponse, closeResponse };
  } finally {
    barrier.restore();
  }
}

async function assertCashCloseTotals(
  closeResponse: Response,
  sessionRef: { get: () => Promise<any> },
  expected: {
    cashSales: number;
    cashDueCollected: number;
    cashExpenses: number;
    cashSupplierPaid: number;
  },
) {
  assert.equal(closeResponse.status, 200);
  const body = await closeResponse.json() as any;
  const expectedClosingCash =
    100 +
    expected.cashSales +
    expected.cashDueCollected -
    expected.cashExpenses -
    expected.cashSupplierPaid;
  assert.equal(body.session.cashSales, expected.cashSales);
  assert.equal(body.session.cashDueCollected, expected.cashDueCollected);
  assert.equal(body.session.cashExpenses, expected.cashExpenses);
  assert.equal(body.session.cashSupplierPaid, expected.cashSupplierPaid);
  assert.equal(body.session.expectedClosingCash, expectedClosingCash);

  const stored = (await sessionRef.get()).data();
  assert.equal(stored?.isClosed, true);
  assert.equal(stored?.isClosing, false);
  assert.equal(Object.hasOwn(stored || {}, "closingToken"), false);
  assert.equal(Object.hasOwn(stored || {}, "closingStartedAt"), false);
  assert.equal(stored?.expectedClosingCash, expectedClosingCash);
  return body;
}

async function cashWriteWasAccepted(response: Response) {
  assert.ok(
    response.status === 201 || response.status === 409,
    `Cash write must commit or conflict safely; received ${response.status}.`,
  );
  await response.json();
  return response.status === 201;
}

async function assertCashWriteRejected(response: Response) {
  assert.equal(response.status, 409);
  await response.json();
}

async function cashBalanceSnapshot(scenario: CashScenario) {
  const [productSnap, customerSnap, supplierSnap] = await Promise.all([
    adminDb.collection("products").doc(scenario.productId).get(),
    adminDb.collection("customers").doc(scenario.customerId).get(),
    adminDb.collection("suppliers").doc(scenario.supplierId).get(),
  ]);
  const product = productSnap.data() || {};
  const customer = customerSnap.data() || {};
  const supplier = supplierSnap.data() || {};

  return {
    product: {
      stockQuantity: product.stockQuantity,
      costPrice: product.costPrice,
    },
    customer: {
      totalPurchased: customer.totalPurchased,
      totalPaid: customer.totalPaid,
      currentDue: customer.currentDue,
    },
    supplier: {
      totalSupplied: supplier.totalSupplied,
      totalPaid: supplier.totalPaid,
      outstandingBalance: supplier.outstandingBalance,
    },
  };
}

async function cashSessionSnapshot(sessionRef: { get: () => Promise<any> }) {
  const data = (await sessionRef.get()).data() || {};
  return {
    date: data.date,
    isClosed: data.isClosed,
    isClosing: data.isClosing,
    cashActivityVersion: data.cashActivityVersion,
    openingCash: data.openingCash,
    bKashBalance: data.bKashBalance,
    nagadBalance: data.nagadBalance,
    bankBalance: data.bankBalance,
    actualClosingCash: data.actualClosingCash,
    expectedClosingCash: data.expectedClosingCash,
    updatedAt: data.updatedAt?.toMillis?.() ?? data.updatedAt,
  };
}

async function assertRejectedWriteLeavesBalancesUnchanged(
  request: () => Promise<Response>,
  scenario: CashScenario,
) {
  const before = await cashBalanceSnapshot(scenario);
  const sessionBefore = await cashSessionSnapshot(scenario.sessionRef);
  await assertCashWriteRejected(await request());
  assert.deepEqual(await cashBalanceSnapshot(scenario), before);
  assert.deepEqual(await cashSessionSnapshot(scenario.sessionRef), sessionBefore);
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

  const { createApp } = await import("../../server/app.ts");
  server = createApp({
    cashEventClock: () => {
      cashActivityClockCalls++;
      return new Date(cashActivityNow.getTime());
    },
  }).listen(0, "127.0.0.1");
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
  const cases: Array<{ label: string; overrides: Record<string, string>; expected: RegExp }> = [
    {
      label: "service-account JSON is rejected",
      overrides: { FIREBASE_SERVICE_ACCOUNT: "test-only-not-a-credential" },
      expected: /Production credential environment variables must be unset/,
    },
    {
      label: "ADC credential path is rejected",
      overrides: { GOOGLE_APPLICATION_CREDENTIALS: "C:\\private\\production-service-account.json" },
      expected: /Production credential environment variables must be unset/,
    },
    {
      label: "both emulator hosts are required",
      overrides: { FIRESTORE_EMULATOR_HOST: " " },
      expected: /requires both FIREBASE_AUTH_EMULATOR_HOST and FIRESTORE_EMULATOR_HOST/,
    },
    {
      label: "the dedicated demo project is required",
      overrides: { FIREBASE_PROJECT_ID: "production-project" },
      expected: /requires FIREBASE_PROJECT_ID=demo-smart-mudi-security/,
    },
    {
      label: "only the default Firestore database is allowed",
      overrides: { FIRESTORE_DATABASE_ID: "production-database" },
      expected: /only permits Firestore database \(default\)/,
    },
    {
      label: "remote emulator hosts are rejected",
      overrides: { FIRESTORE_EMULATOR_HOST: "firebase.google.com:8080" },
      expected: /remote hosts are not allowed/,
    },
  ];

  for (const item of cases) {
    await t.test(item.label, () => {
      const result = spawnSync(
        process.execPath,
        [
          "--import", "./tests/security/ts-resolution.mjs",
          "--input-type=module",
          "-e", "await import('./server/firebaseAdmin.ts')",
        ],
        {
          cwd: process.cwd(),
          env: { ...emulatorEnvironment(), ...item.overrides },
          encoding: "utf8",
          timeout: 15000,
        },
      );
      assert.notEqual(result.status, 0, "Emulator bootstrap unexpectedly accepted contradictory configuration.");
      assert.match(result.stderr, item.expected);
      assert.doesNotMatch(result.stderr, /test-only-not-a-credential|production-service-account/);
    });
  }

  await t.test("a preinitialized credentialed Admin app cannot be reused", () => {
    const result = spawnSync(
      process.execPath,
      [
        "--import", "./tests/security/ts-resolution.mjs",
        "--input-type=module",
        "-e",
        "import { applicationDefault, initializeApp } from 'firebase-admin/app'; initializeApp({ projectId: 'demo-smart-mudi-security', credential: applicationDefault() }); await import('./server/firebaseAdmin.ts')",
      ],
      {
        cwd: process.cwd(),
        env: emulatorEnvironment(),
        encoding: "utf8",
        timeout: 15000,
      },
    );
    assert.notEqual(result.status, 0, "Emulator bootstrap reused a credentialed Firebase Admin app.");
    assert.match(result.stderr, /cannot reuse a Firebase Admin app initialized with production credentials/);
  });
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

  const [productsInA, productsInB] = await Promise.all([
    adminDb.collection("products").where("shopId", "==", ownerA.shopId).get(),
    adminDb.collection("products").where("shopId", "==", ownerB.shopId).get(),
  ]);
  const createdInA = productsInA.docs.filter((doc: any) => doc.data().sku === "EMU-A-CREATED");
  const createdInB = productsInB.docs.filter((doc: any) => doc.data().sku === "EMU-A-CREATED");
  assert.equal(createdInA.length, 1);
  assert.equal(createdInB.length, 0);
  cleanupRefs.push(...createdInA.map((doc: any) => doc.ref));
});

test("real Auth Emulator rejects revoked and disabled ID tokens through Express middleware", async (t) => {
  await t.test("revoked refresh tokens", async () => {
    const principal = await createOwner("revoked");
    // Firebase ID token auth_time has second precision; ensure it predates
    // tokensValidAfterTime so the revocation assertion is deterministic.
    await new Promise((resolve) => setTimeout(resolve, 1100));
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
  const sessionRef = adminDb.collection("cashSessions").doc(`${owner.shopId}_cash-race`);
  cleanupRefs.push(sessionRef);
  await sessionRef.set({
    shopId: owner.shopId,
    date: new Date().toISOString().slice(0, 10),
    openingCash: 50,
    bKashBalance: 0,
    nagadBalance: 0,
    bankBalance: 0,
    isClosed: false,
  });

  const {
    closeCashSessionInTransaction,
    updateCashSessionInTransaction,
  } = await import("../../server/cashSessionTransactions.ts");

  const [updateOutcome, closeOutcome] = await Promise.all([
    adminDb.runTransaction((tx: any) =>
      updateCashSessionInTransaction(tx, sessionRef, { openingCash: 75 }),
    ),
    adminDb.runTransaction((tx: any) =>
      closeCashSessionInTransaction(tx, sessionRef, {
        actualClosingCash: 75,
        expectedClosingCash: 75,
      }),
    ),
  ]);

  assert.equal(typeof updateOutcome.closed, "boolean");
  assert.equal(closeOutcome.alreadyClosed, false);
  assert.equal((await sessionRef.get()).data()?.isClosed, true);

  const afterCloseOutcome = await adminDb.runTransaction((tx: any) =>
    updateCashSessionInTransaction(tx, sessionRef, { openingCash: 999 }),
  );
  assert.equal(afterCloseOutcome.closed, true);
  assert.equal((await sessionRef.get()).data()?.isClosed, true);
});

test("Firestore Emulator accounts for a sale racing with cash close", async () => {
  const scenario = await createCashScenario("cash-sale-close");
  const body = {
    items: [{ productId: scenario.productId, quantity: 1 }],
    customerId: scenario.customerId,
    paidAmount: 12,
    paymentMethod: CASH_PAYMENT_METHOD,
  };
  const { writeResponse, closeResponse } = await runCashWriteAgainstClose(
    scenario.owner,
    "/api/sales",
    body,
    false,
  );

  const accepted = await cashWriteWasAccepted(writeResponse);
  assert.equal(await cashLedgerCount("sales", scenario.owner.shopId), accepted ? 1 : 0);
  await assertCashCloseTotals(closeResponse, scenario.sessionRef, {
    cashSales: accepted ? 12 : 0,
    cashDueCollected: 0,
    cashExpenses: 0,
    cashSupplierPaid: 0,
  });
  await assertRejectedWriteLeavesBalancesUnchanged(
    () => apiRequest(scenario.owner.token, "/api/sales", {
      method: "POST",
      body,
    }),
    scenario,
  );
  assert.equal(await cashLedgerCount("sales", scenario.owner.shopId), accepted ? 1 : 0);
});

test("Firestore Emulator accounts for an expense racing with cash close", async () => {
  const scenario = await createCashScenario("cash-expense-close");
  const body = {
    category: "অন্যান্য খরচ",
    title: "Concurrent cash expense",
    amount: 5,
    paymentMethod: CASH_PAYMENT_METHOD,
  };
  const { writeResponse, closeResponse } = await runCashWriteAgainstClose(
    scenario.owner,
    "/api/expenses",
    body,
    true,
  );

  const accepted = await cashWriteWasAccepted(writeResponse);
  assert.equal(await cashLedgerCount("expenses", scenario.owner.shopId), accepted ? 1 : 0);
  await assertCashCloseTotals(closeResponse, scenario.sessionRef, {
    cashSales: 0,
    cashDueCollected: 0,
    cashExpenses: accepted ? 5 : 0,
    cashSupplierPaid: 0,
  });
  await assertRejectedWriteLeavesBalancesUnchanged(
    () => apiRequest(scenario.owner.token, "/api/expenses", {
      method: "POST",
      body,
    }),
    scenario,
  );
  assert.equal(await cashLedgerCount("expenses", scenario.owner.shopId), accepted ? 1 : 0);
});

test("Firestore Emulator accounts for a purchase racing with cash close", async () => {
  const scenario = await createCashScenario("cash-purchase-close");
  const body = {
    supplierId: scenario.supplierId,
    productId: scenario.productId,
    quantity: 1,
    costPrice: 10,
    paidAmount: 7,
    paymentMethod: CASH_PAYMENT_METHOD,
  };
  const { writeResponse, closeResponse } = await runCashWriteAgainstClose(
    scenario.owner,
    "/api/purchases",
    body,
    false,
  );

  const accepted = await cashWriteWasAccepted(writeResponse);
  assert.equal(await cashLedgerCount("purchases", scenario.owner.shopId), accepted ? 1 : 0);
  await assertCashCloseTotals(closeResponse, scenario.sessionRef, {
    cashSales: 0,
    cashDueCollected: 0,
    cashExpenses: 0,
    cashSupplierPaid: accepted ? 7 : 0,
  });
  await assertRejectedWriteLeavesBalancesUnchanged(
    () => apiRequest(scenario.owner.token, "/api/purchases", {
      method: "POST",
      body,
    }),
    scenario,
  );
  assert.equal(await cashLedgerCount("purchases", scenario.owner.shopId), accepted ? 1 : 0);
});

test("Firestore Emulator accounts for a due collection racing with cash close", async () => {
  const scenario = await createCashScenario("cash-due-close");
  const path = `/api/customers/${scenario.customerId}/collect-due`;
  const body = { amount: 3, paymentMethod: CASH_PAYMENT_METHOD };
  const { writeResponse, closeResponse } = await runCashWriteAgainstClose(
    scenario.owner,
    path,
    body,
    true,
  );

  const accepted = await cashWriteWasAccepted(writeResponse);
  assert.equal(await cashLedgerCount("dueCollections", scenario.owner.shopId), accepted ? 1 : 0);
  await assertCashCloseTotals(closeResponse, scenario.sessionRef, {
    cashSales: 0,
    cashDueCollected: accepted ? 3 : 0,
    cashExpenses: 0,
    cashSupplierPaid: 0,
  });
  await assertRejectedWriteLeavesBalancesUnchanged(
    () => apiRequest(scenario.owner.token, path, {
      method: "POST",
      body,
    }),
    scenario,
  );
  assert.equal(await cashLedgerCount("dueCollections", scenario.owner.shopId), accepted ? 1 : 0);
});

test("Firestore Emulator accounts for a supplier payment racing with cash close", async () => {
  const scenario = await createCashScenario("cash-supplier-payment-close");
  const path = `/api/purchases/suppliers/${scenario.supplierId}/pay`;
  const body = { amount: 4, paymentMethod: CASH_PAYMENT_METHOD };
  const { writeResponse, closeResponse } = await runCashWriteAgainstClose(
    scenario.owner,
    path,
    body,
    false,
  );

  const accepted = await cashWriteWasAccepted(writeResponse);
  assert.equal(await cashLedgerCount("supplierPayments", scenario.owner.shopId), accepted ? 1 : 0);
  await assertCashCloseTotals(closeResponse, scenario.sessionRef, {
    cashSales: 0,
    cashDueCollected: 0,
    cashExpenses: 0,
    cashSupplierPaid: accepted ? 4 : 0,
  });
  await assertRejectedWriteLeavesBalancesUnchanged(
    () => apiRequest(scenario.owner.token, path, {
      method: "POST",
      body,
    }),
    scenario,
  );
  assert.equal(await cashLedgerCount("supplierPayments", scenario.owner.shopId), accepted ? 1 : 0);
});

test("Firestore Emulator counts multiple simultaneous cash writes exactly once", async () => {
  const scenario = await createCashScenario("cash-multiple-close");
  const barrier = installTransactionStartBarrier(4);
  try {
    const salePromise = apiRequest(scenario.owner.token, "/api/sales", {
      method: "POST",
      body: {
        items: [{ productId: scenario.productId, quantity: 1 }],
        customerId: scenario.customerId,
        paidAmount: 12,
        paymentMethod: CASH_PAYMENT_METHOD,
      },
    });
    await barrier.waitUntilQueued(1);

    const expensePromise = apiRequest(scenario.owner.token, "/api/expenses", {
      method: "POST",
      body: {
        category: "অন্যান্য খরচ",
        title: "Concurrent cash expense",
        amount: 5,
        paymentMethod: CASH_PAYMENT_METHOD,
      },
    });
    await barrier.waitUntilQueued(2);

    const duePromise = apiRequest(
      scenario.owner.token,
      `/api/customers/${scenario.customerId}/collect-due`,
      {
        method: "POST",
        body: { amount: 3, paymentMethod: CASH_PAYMENT_METHOD },
      },
    );
    await barrier.waitUntilQueued(3);

    const closePromise = apiRequest(scenario.owner.token, "/api/cash/today/close", {
      method: "POST",
      body: { actualClosingCash: 1000 },
    });
    await barrier.waitUntilQueued(4);

    const [saleResponse, expenseResponse, dueResponse, closeResponse] = await Promise.all([
      salePromise,
      expensePromise,
      duePromise,
      closePromise,
    ]);

    const saleAccepted = await cashWriteWasAccepted(saleResponse);
    const expenseAccepted = await cashWriteWasAccepted(expenseResponse);
    const dueAccepted = await cashWriteWasAccepted(dueResponse);
    assert.equal(await cashLedgerCount("sales", scenario.owner.shopId), saleAccepted ? 1 : 0);
    assert.equal(await cashLedgerCount("expenses", scenario.owner.shopId), expenseAccepted ? 1 : 0);
    assert.equal(await cashLedgerCount("dueCollections", scenario.owner.shopId), dueAccepted ? 1 : 0);
    await assertCashCloseTotals(closeResponse, scenario.sessionRef, {
      cashSales: saleAccepted ? 12 : 0,
      cashDueCollected: dueAccepted ? 3 : 0,
      cashExpenses: expenseAccepted ? 5 : 0,
      cashSupplierPaid: 0,
    });
  } finally {
    barrier.restore();
  }
});

test("cash routes keep the request-start business day across Dhaka midnight", async (t) => {
  const beforeMidnight = new Date("2026-11-23T17:59:59.999Z");
  const afterMidnight = new Date("2026-11-23T18:00:00.001Z");
  const previousClock = cashActivityNow;
  const cases: Array<{
    label: string;
    collection: string;
    path: (scenario: CashScenario) => string;
    body: (scenario: CashScenario) => Record<string, unknown>;
    responseTimestamp?: (response: Record<string, any>) => string;
    totals: {
      cashSales: number;
      cashDueCollected: number;
      cashExpenses: number;
      cashSupplierPaid: number;
    };
  }> = [
    {
      label: "sale",
      collection: "sales",
      path: () => "/api/sales",
      body: (scenario) => ({
        items: [{ productId: scenario.productId, quantity: 1 }],
        customerId: scenario.customerId,
        paidAmount: 12,
        paymentMethod: CASH_PAYMENT_METHOD,
      }),
      responseTimestamp: (response) => response.sale.createdAt,
      totals: { cashSales: 12, cashDueCollected: 0, cashExpenses: 0, cashSupplierPaid: 0 },
    },
    {
      label: "expense",
      collection: "expenses",
      path: () => "/api/expenses",
      body: () => ({
        category: "অন্যান্য খরচ",
        title: "Midnight cash expense",
        amount: 5,
        paymentMethod: CASH_PAYMENT_METHOD,
      }),
      totals: { cashSales: 0, cashDueCollected: 0, cashExpenses: 5, cashSupplierPaid: 0 },
    },
    {
      label: "purchase",
      collection: "purchases",
      path: () => "/api/purchases",
      body: (scenario) => ({
        supplierId: scenario.supplierId,
        productId: scenario.productId,
        quantity: 1,
        costPrice: 10,
        paidAmount: 7,
        paymentMethod: CASH_PAYMENT_METHOD,
      }),
      responseTimestamp: (response) => response.purchase.date,
      totals: { cashSales: 0, cashDueCollected: 0, cashExpenses: 0, cashSupplierPaid: 7 },
    },
    {
      label: "due collection",
      collection: "dueCollections",
      path: (scenario) => `/api/customers/${scenario.customerId}/collect-due`,
      body: () => ({ amount: 3, paymentMethod: CASH_PAYMENT_METHOD }),
      responseTimestamp: (response) => response.collection.date,
      totals: { cashSales: 0, cashDueCollected: 3, cashExpenses: 0, cashSupplierPaid: 0 },
    },
    {
      label: "supplier payment",
      collection: "supplierPayments",
      path: (scenario) => `/api/purchases/suppliers/${scenario.supplierId}/pay`,
      body: () => ({ amount: 4, paymentMethod: CASH_PAYMENT_METHOD }),
      responseTimestamp: (response) => response.payment.createdAt,
      totals: { cashSales: 0, cashDueCollected: 0, cashExpenses: 0, cashSupplierPaid: 4 },
    },
  ];

  try {
    for (const scenarioCase of cases) {
      await t.test(scenarioCase.label, async () => {
        cashActivityNow = new Date(beforeMidnight);
        const scenario = await createCashScenario(`midnight-${scenarioCase.label.replace(/\s+/g, "-")}`);
        const expectedDate = getDhakaDateKey(beforeMidnight);
        const callsBeforeRequest = cashActivityClockCalls;
        const barrier = installTransactionStartBarrier(1, true);
        let responseTimestamp: string | undefined;

        try {
          const responsePromise = apiRequest(
            scenario.owner.token,
            scenarioCase.path(scenario),
            {
              method: "POST",
              body: scenarioCase.body(scenario),
            },
          );
          await barrier.waitUntilQueued(1);
          assert.equal(cashActivityClockCalls, callsBeforeRequest + 1);
          cashActivityNow = new Date(afterMidnight);
          barrier.release();

          const response = await responsePromise;
          assert.equal(response.status, 201);
          const responseBody = await response.json() as Record<string, any>;
          responseTimestamp = scenarioCase.responseTimestamp?.(responseBody);
          if (scenarioCase.responseTimestamp) {
            assert.equal(responseTimestamp, beforeMidnight.toISOString());
          }
          assert.equal(cashActivityClockCalls, callsBeforeRequest + 1);
        } finally {
          barrier.restore();
        }

        const ledgerSnapshot = await adminDb
          .collection(scenarioCase.collection)
          .where("shopId", "==", scenario.owner.shopId)
          .get();
        cleanupRefs.push(...ledgerSnapshot.docs.map((doc: any) => doc.ref));
        assert.equal(ledgerSnapshot.size, 1);
        const ledger = ledgerSnapshot.docs[0].data();
        assert.equal(ledger.createdAt.toMillis(), beforeMidnight.getTime());
        assert.equal(getDhakaDateKey(ledger.createdAt.toDate()), expectedDate);
        if (scenarioCase.responseTimestamp) {
          assert.equal(responseTimestamp, ledger.createdAt.toDate().toISOString());
        }

        const session = (await scenario.sessionRef.get()).data();
        assert.equal(session?.date, expectedDate);
        assert.equal(session?.cashActivityVersion, 1);

        cashActivityNow = new Date(beforeMidnight);
        await assertCashCloseTotals(
          await apiRequest(scenario.owner.token, "/api/cash/today/close", {
            method: "POST",
            body: { actualClosingCash: 1000 },
          }),
          scenario.sessionRef,
          scenarioCase.totals,
        );
      });
    }
  } finally {
    cashActivityNow = previousClock;
  }
});

test("non-cash writes after close do not change the cash session", async () => {
  const scenario = await createCashScenario("noncash-after-close");
  const closeResponse = await apiRequest(scenario.owner.token, "/api/cash/today/close", {
    method: "POST",
    body: { actualClosingCash: 100 },
  });
  assert.equal(closeResponse.status, 200);
  await closeResponse.json();
  const sessionBefore = await cashSessionSnapshot(scenario.sessionRef);

  const requests: Array<{ path: string; body: Record<string, unknown> }> = [
    {
      path: "/api/sales",
      body: {
        items: [{ productId: scenario.productId, quantity: 1 }],
        paidAmount: 12,
        paymentMethod: "বিকাশ (bKash)",
      },
    },
    {
      path: "/api/expenses",
      body: {
        category: "অন্যান্য খরচ",
        title: "Non-cash after close",
        amount: 5,
        paymentMethod: "বিকাশ (bKash)",
      },
    },
    {
      path: "/api/purchases",
      body: {
        supplierId: scenario.supplierId,
        productId: scenario.productId,
        quantity: 1,
        costPrice: 10,
        paidAmount: 7,
        paymentMethod: "বিকাশ (bKash)",
      },
    },
    {
      path: `/api/customers/${scenario.customerId}/collect-due`,
      body: { amount: 3, paymentMethod: "বিকাশ (bKash)" },
    },
    {
      path: `/api/purchases/suppliers/${scenario.supplierId}/pay`,
      body: { amount: 4, paymentMethod: "বিকাশ (bKash)" },
    },
  ];

  for (const request of requests) {
    const response = await apiRequest(scenario.owner.token, request.path, {
      method: "POST",
      body: request.body,
    });
    assert.equal(response.status, 201, `${request.path} should remain independent of cash close.`);
    await response.json();
    assert.deepEqual(await cashSessionSnapshot(scenario.sessionRef), sessionBefore);
  }

  const sessionResponse = await apiRequest(scenario.owner.token, "/api/cash/today");
  assert.equal(sessionResponse.status, 200);
  const sessionBody = await sessionResponse.json() as any;
  assert.equal(sessionBody.session.isClosed, true);
  assert.equal(sessionBody.session.cashSales, 0);
  assert.equal(sessionBody.session.cashDueCollected, 0);
  assert.equal(sessionBody.session.cashExpenses, 0);
  assert.equal(sessionBody.session.cashSupplierPaid, 0);
});

test("transaction retries keep the captured date and exhaustion leaves no partial writes", async () => {
  const beforeMidnight = new Date("2026-11-23T17:59:59.999Z");
  const afterMidnight = new Date("2026-11-23T18:00:00.001Z");
  const previousClock = cashActivityNow;
  cashActivityNow = new Date(beforeMidnight);
  const scenario = await createCashScenario("retry-exhaustion");
  const before = await cashBalanceSnapshot(scenario);
  const sessionBefore = await cashSessionSnapshot(scenario.sessionRef);
  const originalDescriptor = Object.getOwnPropertyDescriptor(adminDb, "runTransaction");
  const runTransaction = adminDb.runTransaction.bind(adminDb);
  const clockCallsBeforeRequest = cashActivityClockCalls;
  let attempts = 0;
  let maxAttempts = 0;

  Object.defineProperty(adminDb, "runTransaction", {
    configurable: true,
    value: (
      operation: (tx: any) => Promise<unknown>,
      options?: { maxAttempts?: number },
    ) => {
      maxAttempts = options?.maxAttempts || 0;
      return runTransaction(async (tx: any) => {
        attempts++;
        cashActivityNow = new Date(afterMidnight);
        await operation(tx);
        throw Object.assign(new Error("Synthetic transaction abort."), { code: 10 });
      }, options);
    },
  });

  try {
    const response = await apiRequest(scenario.owner.token, "/api/sales", {
      method: "POST",
      body: {
        items: [{ productId: scenario.productId, quantity: 1 }],
        paidAmount: 12,
        paymentMethod: CASH_PAYMENT_METHOD,
      },
    });
    assert.equal(response.status, 409);
    await response.json();
  } finally {
    cashActivityNow = previousClock;
    if (originalDescriptor) {
      Object.defineProperty(adminDb, "runTransaction", originalDescriptor);
    } else {
      delete adminDb.runTransaction;
    }
  }

  assert.equal(attempts, 5);
  assert.equal(maxAttempts, 5);
  assert.equal(cashActivityClockCalls, clockCallsBeforeRequest + 1);
  assert.equal((await scenario.sessionRef.get()).data()?.date, getDhakaDateKey(beforeMidnight));
  assert.deepEqual(await cashBalanceSnapshot(scenario), before);
  assert.deepEqual(await cashSessionSnapshot(scenario.sessionRef), sessionBefore);
  assert.equal(await cashLedgerCount("sales", scenario.owner.shopId), 0);
});

test("Firestore Emulator allows only one of two concurrent cash closes", async () => {
  const scenario = await createCashScenario("cash-double-close");
  const barrier = installTransactionStartBarrier(2);
  try {
    const firstClose = apiRequest(scenario.owner.token, "/api/cash/today/close", {
      method: "POST",
      body: { actualClosingCash: 1000 },
    });
    await barrier.waitUntilQueued(1);

    const secondClose = apiRequest(scenario.owner.token, "/api/cash/today/close", {
      method: "POST",
      body: { actualClosingCash: 2000 },
    });
    await barrier.waitUntilQueued(2);

    const [firstResponse, secondResponse] = await Promise.all([firstClose, secondClose]);

    const winner = firstResponse.status === 200 ? firstResponse : secondResponse;
    const loser = firstResponse.status === 200 ? secondResponse : firstResponse;
    assert.equal(winner.status, 200);
    assert.ok(loser.status === 400 || loser.status === 409);
    await loser.json();
    const winnerBody = await assertCashCloseTotals(winner, scenario.sessionRef, {
      cashSales: 0,
      cashDueCollected: 0,
      cashExpenses: 0,
      cashSupplierPaid: 0,
    });
    assert.ok([1000, 2000].includes(winnerBody.session.actualClosingCash));
    assert.equal(
      (await scenario.sessionRef.get()).data()?.actualClosingCash,
      winnerBody.session.actualClosingCash,
    );
  } finally {
    barrier.restore();
  }
});
