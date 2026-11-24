import assert from "node:assert/strict";
import { once } from "node:events";
import test, { after, before } from "node:test";
import { InMemoryFirestore, plain } from "./fakes/inMemoryFirestore.ts";
import { getTodayDhakaDateKey } from "../../server/dateUtils.ts";

const database = new InMemoryFirestore();
const tokenClaims = new Map<string, Record<string, unknown>>();
let baseUrl = "";
let server: ReturnType<ReturnType<typeof createApp>['listen']> | undefined;
let adminDb: any;
let adminAuth: any;
let createApp: () => import("express").Express;

const userProfile = (
  uid: string,
  role: "owner" | "employee",
  shopId: string,
  permissions: Record<string, { view: boolean; manage: boolean }> = {},
) => ({
  uid,
  email: `${uid}@test.invalid`,
  displayName: uid,
  role,
  shopId,
  active: true,
  permissions,
});

const permissions = (grants: string[]) => Object.fromEntries(
  ["dashboard", "pos", "products", "customers", "purchases", "expenses", "cash", "reports", "staff", "settings"]
    .map((key) => [key, { view: grants.includes(key), manage: grants.includes(`${key}:manage`) }]),
);

function seedFixtures() {
  const now = new Date();
  const today = getTodayDhakaDateKey();
  const grantsA = permissions(["dashboard", "pos", "products", "customers", "purchases", "expenses", "cash", "reports", "staff", "settings"]);
  const staffGrants = permissions(["dashboard", "pos", "products", "customers"]);
  const settingsViewGrants = permissions(["settings"]);
  const passwordManagementGrants = permissions(["products", "settings:manage"]);

  database.seed("shops", "shop-a", { id: "shop-a", name: "Shop A", ownerUid: "owner-a", plan: "pro", status: "active" });
  database.seed("shops", "shop-b", { id: "shop-b", name: "Shop B", ownerUid: "owner-b", plan: "pro", status: "active" });
  database.seed("users", "owner-a", userProfile("owner-a", "owner", "shop-a", grantsA));
  database.seed("users", "owner-b", userProfile("owner-b", "owner", "shop-b", grantsA));
  database.seed("users", "employee-a", userProfile("employee-a", "employee", "shop-a", staffGrants));
  database.seed("users", "employee-b", userProfile("employee-b", "employee", "shop-b", staffGrants));
  database.seed("users", "employee-settings-view", userProfile("employee-settings-view", "employee", "shop-a", settingsViewGrants));
  database.seed("users", "employee-password-change", {
    ...userProfile("employee-password-change", "employee", "shop-a", passwordManagementGrants),
    mustChangePassword: true,
  });

  database.seed("products", "product-a", {
    shopId: "shop-a", name: "Rice A", category: "চাল ও ডাল", unit: "কেজি", sku: "A-RICE",
    costPrice: 60, sellingPrice: 80, stockQuantity: 20, lowStockThreshold: 2, active: true,
    createdAt: now, updatedAt: now,
  });
  database.seed("products", "product-b", {
    shopId: "shop-b", name: "Rice B", category: "চাল ও ডাল", unit: "কেজি", sku: "B-RICE",
    costPrice: 70, sellingPrice: 90, stockQuantity: 30, lowStockThreshold: 3, active: true,
    createdAt: now, updatedAt: now,
  });
  database.seed("customers", "customer-a", {
    shopId: "shop-a", name: "Customer A", phone: "01700000001", totalPurchased: 0,
    totalPaid: 0, currentDue: 0, active: true, lastTransactionAt: now,
  });
  database.seed("customers", "customer-b", {
    shopId: "shop-b", name: "Customer B", phone: "01700000002", totalPurchased: 100,
    totalPaid: 0, currentDue: 100, active: true, lastTransactionAt: now,
  });
  database.seed("sales", "sale-a", {
    shopId: "shop-a", invoiceNo: "A-001", customerName: "Customer A", items: [],
    subtotal: 80, discount: 0, grandTotal: 80, paidAmount: 80, dueAmount: 0,
    payments: [{ method: "নগদ (Cash)", amount: 80 }], status: "completed",
    soldBy: "owner-a", cogsTotal: 60, grossProfit: 20, createdAt: now,
  });
  database.seed("sales", "sale-b", {
    shopId: "shop-b", invoiceNo: "B-001", customerName: "Customer B", items: [],
    subtotal: 90, discount: 0, grandTotal: 90, paidAmount: 90, dueAmount: 0,
    payments: [{ method: "নগদ (Cash)", amount: 90 }], status: "completed",
    soldBy: "owner-b", cogsTotal: 70, grossProfit: 20, createdAt: now,
  });
  database.seed("suppliers", "supplier-a", {
    shopId: "shop-a", companyName: "Supplier A", phone: "01800000001", active: true,
    totalSupplied: 100, totalPaid: 0, outstandingBalance: 100,
  });
  database.seed("suppliers", "supplier-b", {
    shopId: "shop-b", companyName: "Supplier B", phone: "01800000002", active: true,
    totalSupplied: 200, totalPaid: 0, outstandingBalance: 200,
  });
  database.seed("purchases", "purchase-a", {
    shopId: "shop-a", supplierId: "supplier-a", supplierName: "Supplier A",
    items: [], totalAmount: 100, paidAmount: 0, dueAmount: 100, paymentMethod: "নগদ (Cash)", createdAt: now,
  });
  database.seed("purchases", "purchase-b", {
    shopId: "shop-b", supplierId: "supplier-b", supplierName: "Supplier B",
    items: [], totalAmount: 200, paidAmount: 0, dueAmount: 200, paymentMethod: "নগদ (Cash)", createdAt: now,
  });
  database.seed("expenses", "expense-a", {
    shopId: "shop-a", category: "অন্যান্য খরচ", title: "Expense A", amount: 10,
    paymentMethod: "নগদ (Cash)", expenseDate: today, createdAt: now,
  });
  database.seed("expenses", "expense-b", {
    shopId: "shop-b", category: "অন্যান্য খরচ", title: "Expense B", amount: 99,
    paymentMethod: "নগদ (Cash)", expenseDate: today, createdAt: now,
  });
  database.seed("dueCollections", "due-a", {
    shopId: "shop-a", customerId: "customer-a", amount: 5, paymentMethod: "নগদ (Cash)", createdAt: now,
  });
  database.seed("dueCollections", "due-b", {
    shopId: "shop-b", customerId: "customer-b", amount: 50, paymentMethod: "নগদ (Cash)", createdAt: now,
  });
  database.seed("cashSessions", `shop-a_${today}`, {
    shopId: "shop-a", date: today, openingCash: 111, bKashBalance: 10, nagadBalance: 20,
    bankBalance: 30, isClosed: false,
  });
  database.seed("cashSessions", `shop-b_${today}`, {
    shopId: "shop-b", date: today, openingCash: 999, bKashBalance: 90, nagadBalance: 80,
    bankBalance: 70, isClosed: false,
  });
  database.seed("shopSettings", "shop-a", { shopId: "shop-a", shopName: "Settings A", phone: "01700000001", address: "Address A" });
  database.seed("shopSettings", "shop-b", { shopId: "shop-b", shopName: "Settings B", phone: "01700000002", address: "Address B" });

  for (const [token, uid, role, shopId] of [
    ["owner-a-token", "owner-a", "owner", "shop-a"],
    ["owner-b-token", "owner-b", "owner", "shop-b"],
    ["employee-a-token", "employee-a", "employee", "shop-a"],
    ["employee-b-token", "employee-b", "employee", "shop-b"],
    ["employee-settings-view-token", "employee-settings-view", "employee", "shop-a"],
    ["employee-password-change-token", "employee-password-change", "employee", "shop-a"],
    ["owner-a-claim-shop-b", "owner-a", "owner", "shop-b"],
    ["employee-a-claim-shop-b", "employee-a", "employee", "shop-b"],
    ["owner-a-claim-employee", "owner-a", "employee", "shop-a"],
    ["missing-shop-token", "missing-shop-user", "employee", ""],
  ]) {
    tokenClaims.set(token, {
      uid,
      email: `${uid}@test.invalid`,
      role,
      auth_time: Math.floor(Date.now() / 1000),
      ...(shopId ? { shopId } : {}),
    });
  }
  database.seed("users", "missing-shop-user", userProfile("missing-shop-user", "employee", ""));
}

async function request(
  token: string,
  path: string,
  options: { method?: string; body?: Record<string, unknown>; headers?: Record<string, string> } = {},
) {
  const headers: Record<string, string> = {
    authorization: `Bearer ${token}`,
    ...(options.headers || {}),
  };
  if (options.body) headers["content-type"] = "application/json";
  return fetch(`${baseUrl}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

function snapshot(collection: string, ids: string[]) {
  return Object.fromEntries(ids.map((id) => [id, plain(database.read(collection, id))]));
}

before(async () => {
  process.env.NODE_ENV = "test";
  process.env.FIREBASE_EMULATOR_ENABLED = "true";
  process.env.FIREBASE_PROJECT_ID = "demo-smart-mudi-security";
  process.env.FIRESTORE_DATABASE_ID = "(default)";
  process.env.FIREBASE_SERVICE_ACCOUNT = "";
  process.env.GOOGLE_APPLICATION_CREDENTIALS = "";
  process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
  process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
  process.env.OWNER_UID = "";
  process.env.SHOP_ID = "";
  process.env.LEGACY_SINGLE_TENANT_MODE = "false";
  process.env.PLATFORM_ADMIN_UIDS = "";
  process.env.GEMINI_API_KEY = "";

  const firebaseAdmin = await import("../../server/firebaseAdmin.ts");
  assert.equal(process.env.FIREBASE_SERVICE_ACCOUNT, "");
  assert.equal(process.env.GOOGLE_APPLICATION_CREDENTIALS, "");
  adminDb = firebaseAdmin.adminDb;
  adminAuth = firebaseAdmin.adminAuth;
  Object.defineProperty(adminDb, "collection", {
    configurable: true,
    value: (name: string) => database.collection(name),
  });
  Object.defineProperty(adminDb, "runTransaction", {
    configurable: true,
    value: (operation: (tx: any) => Promise<unknown>) => database.runTransaction(operation),
  });
  Object.defineProperty(adminDb, "batch", {
    configurable: true,
    value: () => database.batch(),
  });
  Object.defineProperty(adminAuth, "verifyIdToken", {
    configurable: true,
    value: async (token: string) => {
      const claims = tokenClaims.get(token);
      if (!claims) throw new Error("Invalid test token");
      return claims;
    },
  });
  Object.defineProperty(adminAuth, "getUser", {
    configurable: true,
    value: async (uid: string) => ({ uid, customClaims: tokenClaims.get(`${uid}-claims`) || {} }),
  });

  seedFixtures();
  ({ createApp } = await import("../../server/app.ts"));
  server = createApp().listen(0);
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test API failed to bind an ephemeral port.");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (server) await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()));
  if (adminDb) adminDb.terminate?.();
  const { deleteApp, getApps } = await import("firebase-admin/app");
  await Promise.all(getApps().map((app) => deleteApp(app)));
});

test("test environment keeps Firebase credentials unset during initialization", () => {
  assert.equal(process.env.FIREBASE_PROJECT_ID, "demo-smart-mudi-security");
  assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, "127.0.0.1:9099");
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST, "127.0.0.1:8080");
  assert.equal(process.env.FIREBASE_SERVICE_ACCOUNT, "");
  assert.equal(process.env.GOOGLE_APPLICATION_CREDENTIALS, "");
});

test("settings and password changes enforce employee permissions and shop isolation", async (t) => {
  await t.test("employee without settings.view is denied", async () => {
    const response = await request("employee-a-token", "/api/settings");
    assert.equal(response.status, 403);
  });

  await t.test("employee with settings.view can read only their authenticated shop", async () => {
    const response = await request("employee-settings-view-token", "/api/settings?shopId=shop-b", {
      headers: { "x-shop-id": "shop-b" },
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json() as any).settings.shopName, "Settings A");
  });

  await t.test("legacy password-change flag does not block permitted requests", async () => {
    const response = await request("employee-password-change-token", "/api/products");
    assert.equal(response.status, 200);
  });
});

test("self-service password changes require permission and update only the caller", async (t) => {
  const updates: Array<{ uid: string; password?: string }> = [];
  const originalUpdateUser = adminAuth.updateUser;
  adminAuth.updateUser = async (uid: string, update: { password?: string }) => {
    updates.push({ uid, password: update.password });
    return { uid };
  };

  try {
    await t.test("settings.view alone cannot change a password", async () => {
      const response = await request(
        "employee-settings-view-token",
        "/api/staff/me/password",
        {
          method: "POST",
          body: { newPassword: "Replacement-password-123", uid: "owner-b" },
        },
      );
      assert.equal(response.status, 403);
      assert.equal(updates.length, 0);
    });

    await t.test("settings.manage changes only the authenticated employee password", async () => {
      const response = await request(
        "employee-password-change-token",
        "/api/staff/me/password",
        {
          method: "POST",
          body: { newPassword: "Replacement-password-123", uid: "owner-b" },
        },
      );
      assert.equal(response.status, 200);
      assert.deepEqual(updates, [{
        uid: "employee-password-change",
        password: "Replacement-password-123",
      }]);
    });

    await t.test("stale authentication must be refreshed before a password change", async () => {
      const claims = tokenClaims.get("employee-password-change-token")!;
      tokenClaims.set("employee-password-change-token", { ...claims, auth_time: 0 });
      try {
        const response = await request(
          "employee-password-change-token",
          "/api/staff/me/password",
          { method: "POST", body: { newPassword: "Replacement-password-456" } },
        );
        assert.equal(response.status, 401);
        assert.equal((await response.json() as any).code, "reauthentication_required");
        assert.equal(updates.length, 1);
      } finally {
        tokenClaims.set("employee-password-change-token", claims);
      }
    });
  } finally {
    adminAuth.updateUser = originalUpdateUser;
  }
});

test("authenticated owners resolve their own shop and employee permission remains shop-local", async (t) => {
  await t.test("Owner A sees Shop A", async () => {
    const response = await request("owner-a-token", "/api/shops/me?shopId=shop-b");
    assert.equal(response.status, 200);
    assert.equal((await response.json() as any).shop.id, "shop-a");
  });

  await t.test("Owner B sees Shop B", async () => {
    const response = await request("owner-b-token", "/api/shops/me");
    assert.equal(response.status, 200);
    assert.equal((await response.json() as any).shop.id, "shop-b");
  });

  await t.test("Employee A can use a permitted Shop A module", async () => {
    const response = await request("employee-a-token", "/api/products");
    assert.equal(response.status, 200);
    const body = await response.json() as any;
    assert.deepEqual(body.products.map((item: any) => item.id), ["product-a"]);
  });

  await t.test("Employee A cannot use an ungranted module", async () => {
    const response = await request("employee-a-token", "/api/reports/summary");
    assert.equal(response.status, 403);
  });
});

test("shop ID in query, header, or body cannot switch the authenticated tenant", async (t) => {
  await t.test("query and header spoofing still returns only Shop A products", async () => {
    const response = await request("owner-a-token", "/api/products?shopId=shop-b", {
      headers: { "x-shop-id": "shop-b", "x-shopid": "shop-b" },
    });
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json() as any).products.map((item: any) => item.id), ["product-a"]);
  });

  await t.test("body and header spoofing create a product only in Shop A", async () => {
    const shopBBefore = snapshot("products", ["product-b"]);
    const response = await request("owner-a-token", "/api/products", {
      method: "POST",
      headers: { "x-shop-id": "shop-b" },
      body: {
        shopId: "shop-b", name: "New A Product", category: "অন্যান্য", unit: "পিস",
        sku: "NEW-A", costPrice: 1, sellingPrice: 2, stockQuantity: 1, lowStockThreshold: 0,
      },
    });
    assert.equal(response.status, 201);
    const created = database.dump("products").find((item) => item.id !== "product-a" && item.id !== "product-b");
    assert.equal(created?.data.shopId, "shop-a");
    assert.deepEqual(snapshot("products", ["product-b"]), shopBBefore);
  });
});

test("Shop A cannot read Shop B business data through API list endpoints", async (t) => {
  const cases: Array<{ label: string; path: string; collection: string; ownId: string; otherId: string; field?: string }> = [
    { label: "products", path: "/api/products?shopId=shop-b", collection: "products", ownId: "product-a", otherId: "product-b", field: "name" },
    { label: "sales", path: "/api/sales?shopId=shop-b", collection: "sales", ownId: "sale-a", otherId: "sale-b", field: "invoiceNo" },
    { label: "customers", path: "/api/customers?shopId=shop-b", collection: "customers", ownId: "customer-a", otherId: "customer-b", field: "name" },
    { label: "suppliers", path: "/api/purchases/suppliers?shopId=shop-b", collection: "suppliers", ownId: "supplier-a", otherId: "supplier-b", field: "companyName" },
    { label: "purchases", path: "/api/purchases?shopId=shop-b", collection: "purchases", ownId: "purchase-a", otherId: "purchase-b", field: "supplierName" },
    { label: "expenses", path: "/api/expenses?shopId=shop-b", collection: "expenses", ownId: "expense-a", otherId: "expense-b", field: "title" },
  ];
  for (const item of cases) {
    await t.test(item.label, async () => {
      const response = await request("owner-a-token", item.path);
      assert.equal(response.status, 200);
      const body = await response.json() as any;
      const collectionKey = item.collection === "suppliers" ? "suppliers" : item.collection;
      const rows = body[collectionKey];
      assert.ok(Array.isArray(rows), `expected ${collectionKey} response`);
      assert.ok(rows.some((row: any) => row[item.field!] === database.read(item.collection, item.ownId)?.[item.field!]));
      assert.ok(!rows.some((row: any) => row[item.field!] === database.read(item.collection, item.otherId)?.[item.field!]));
    });
  }

  await t.test("cash session only returns Shop A balances", async () => {
    const response = await request("owner-a-token", "/api/cash/today?shopId=shop-b");
    assert.equal(response.status, 200);
    assert.equal((await response.json() as any).session.openingCash, 111);
  });

  await t.test("report and dashboard aggregates use Shop A only", async () => {
    const reportResponse = await request("owner-a-token", "/api/reports/summary?period=daily&shopId=shop-b");
    assert.equal(reportResponse.status, 200);
    const report = (await reportResponse.json() as any).report;
    assert.equal(report.salesRevenue, 80);
    assert.equal(report.expenses, 10);

    const dashboardResponse = await request("owner-a-token", "/api/dashboard?shopId=shop-b");
    assert.equal(dashboardResponse.status, 200);
    assert.equal((await dashboardResponse.json() as any).dashboard.today.salesRevenue, 80);
  });

  await t.test("settings and staff list remain bound to Shop A", async () => {
    const settingsResponse = await request("owner-a-token", "/api/settings?shopId=shop-b");
    assert.equal(settingsResponse.status, 200);
    assert.equal((await settingsResponse.json() as any).settings.shopName, "Settings A");

    const staffResponse = await request("owner-a-token", "/api/staff?shopId=shop-b");
    assert.equal(staffResponse.status, 200);
    const staff = (await staffResponse.json() as any).employees;
    assert.ok(staff.some((item: any) => item.uid === "employee-a"));
    assert.ok(!staff.some((item: any) => item.uid === "employee-b"));
  });

  await t.test("B customer collection history is filtered by Shop A", async () => {
    const response = await request("owner-a-token", "/api/customers/customer-b/collections");
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json() as any).collections, []);
  });
});

test("Shop A cannot mutate Shop B records through direct document endpoints or references", async (t) => {
  const productBefore = snapshot("products", ["product-b"]);
  const customerBefore = snapshot("customers", ["customer-b"]);
  const supplierBefore = snapshot("suppliers", ["supplier-b"]);
  const staffBefore = snapshot("users", ["employee-b"]);
  const purchaseBefore = snapshot("purchases", ["purchase-b"]);
  const salesBefore = snapshot("sales", ["sale-b"]);

  const validProductBody = {
    name: "Tampered Product", category: "চাল ও ডাল", unit: "কেজি", sku: "B-RICE",
    costPrice: 1, sellingPrice: 1, stockQuantity: 1, lowStockThreshold: 0,
  };
  const attempts: Array<[string, string, { method: string; body?: Record<string, unknown> }, number]> = [
    ["update Shop B product", "/api/products/product-b", { method: "PUT", body: validProductBody }, 404],
    ["delete Shop B product", "/api/products/product-b", { method: "DELETE" }, 404],
    ["collect Shop B customer due", "/api/customers/customer-b/collect-due", { method: "POST", body: { amount: 10, paymentMethod: "নগদ (Cash)" } }, 404],
    ["pay Shop B supplier", "/api/purchases/suppliers/supplier-b/pay", { method: "POST", body: { amount: 10, paymentMethod: "নগদ (Cash)" } }, 404],
    ["purchase Shop B product", "/api/purchases", { method: "POST", body: { supplierId: "supplier-a", productId: "product-b", quantity: 1, costPrice: 1, paidAmount: 0, paymentMethod: "নগদ (Cash)" } }, 404],
    ["modify Shop B employee status", "/api/staff/employee-b/status", { method: "PATCH", body: { active: false } }, 404],
    ["modify Shop B employee permissions", "/api/staff/employee-b/permissions", { method: "PATCH", body: { permissions: permissions(["products:manage"]), jobRole: "manager" } }, 404],
    ["modify Shop B sale", "/api/sales/sale-b", { method: "PATCH", body: { shopId: "shop-a", grandTotal: 1 } }, 404],
    ["modify Shop B purchase", "/api/purchases/purchase-b", { method: "DELETE" }, 404],
  ];

  for (const [label, path, options, expected] of attempts) {
    await t.test(label, async () => {
      const response = await request("owner-a-token", path, options);
      assert.equal(response.status, expected);
    });
  }

  assert.deepEqual(snapshot("products", ["product-b"]), productBefore);
  assert.deepEqual(snapshot("customers", ["customer-b"]), customerBefore);
  assert.deepEqual(snapshot("suppliers", ["supplier-b"]), supplierBefore);
  assert.deepEqual(snapshot("users", ["employee-b"]), staffBefore);
  assert.deepEqual(snapshot("purchases", ["purchase-b"]), purchaseBefore);
  assert.deepEqual(snapshot("sales", ["sale-b"]), salesBefore);
});

test("cross-shop sale requests and body spoofing do not change Shop B data", async () => {
  const shopBBefore = {
    products: snapshot("products", ["product-b"]),
    customers: snapshot("customers", ["customer-b"]),
    sales: snapshot("sales", ["sale-b"]),
  };
  const response = await request("owner-a-token", "/api/sales", {
    method: "POST",
    headers: { "x-shop-id": "shop-b" },
    body: {
      shopId: "shop-b", items: [{ productId: "product-b", quantity: 1 }],
      paidAmount: 90, paymentMethod: "নগদ (Cash)", customerId: "customer-b",
    },
  });
  assert.ok(response.status === 400 || response.status === 404);
  assert.deepEqual(snapshot("products", ["product-b"]), shopBBefore.products);
  assert.deepEqual(snapshot("customers", ["customer-b"]), shopBBefore.customers);
  assert.deepEqual(snapshot("sales", ["sale-b"]), shopBBefore.sales);
});

test("business writes with spoofed shopId affect only the authenticated shop", async (t) => {
  const expenseBBefore = snapshot("expenses", ["expense-b"]);
  const cashBBefore = snapshot("cashSessions", [`shop-b_${getTodayDhakaDateKey()}`]);
  const settingsBBefore = snapshot("shopSettings", ["shop-b"]);

  await t.test("expense body shopId cannot switch tenant", async () => {
    const response = await request("owner-a-token", "/api/expenses", {
      method: "POST",
      headers: { "x-shop-id": "shop-b" },
      body: { shopId: "shop-b", category: "অন্যান্য খরচ", title: "New A expense", amount: 2, paymentMethod: "নগদ (Cash)" },
    });
    assert.equal(response.status, 201);
    const added = database.dump("expenses").find((item) => item.data.title === "New A expense");
    assert.equal(added?.data.shopId, "shop-a");
  });

  await t.test("cash body shopId cannot switch session", async () => {
    const response = await request("owner-a-token", "/api/cash/today", {
      method: "PATCH",
      body: { shopId: "shop-b", openingCash: 222 },
    });
    assert.equal(response.status, 200);
    assert.equal(database.read("cashSessions", `shop-a_${getTodayDhakaDateKey()}`)?.openingCash, 222);
  });

  await t.test("settings body shopId cannot switch document", async () => {
    const response = await request("owner-a-token", "/api/settings", {
      method: "PUT",
      body: { shopId: "shop-b", shopName: "Updated A", phone: "01711111111", address: "New A address" },
    });
    assert.equal(response.status, 200);
    assert.equal(database.read("shopSettings", "shop-a")?.shopName, "Updated A");
  });

  assert.deepEqual(snapshot("expenses", ["expense-b"]), expenseBBefore);
  assert.deepEqual(snapshot("cashSessions", [`shop-b_${getTodayDhakaDateKey()}`]), cashBBefore);
  assert.deepEqual(snapshot("shopSettings", ["shop-b"]), settingsBBefore);
});

test("missing membership and mismatched signed claims are denied by actual API middleware", async (t) => {
  for (const [label, token] of [
    ["missing shop association", "missing-shop-token"],
    ["Owner A token claiming Shop B", "owner-a-claim-shop-b"],
    ["Employee A token claiming Shop B", "employee-a-claim-shop-b"],
    ["owner profile with employee claim", "owner-a-claim-employee"],
  ]) {
    await t.test(label, async () => {
      const response = await request(token, "/api/products");
      assert.equal(response.status, 403);
    });
  }
});

