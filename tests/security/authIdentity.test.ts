import assert from "node:assert/strict";
import test from "node:test";
import { authClaimsMatchProfile } from "../../server/authIdentity.ts";
import { validateBootstrapOwnerConfig } from "../../server/bootstrapConfig.ts";
import {
  canBackfillLegacyEmployee,
  checkShopMembership,
} from "../../server/shopMembership.ts";

test("legacy token without role or shop claims uses the Firestore profile", () => {
  assert.equal(
    authClaimsMatchProfile({ role: "owner", shopId: "shop-a" }, {}),
    true,
  );
});

test("matching role and shop claims are accepted", () => {
  assert.equal(
    authClaimsMatchProfile(
      { role: "employee", shopId: "shop-a" },
      { role: "employee", shopId: "shop-a" },
    ),
    true,
  );
});

test("stale owner claim cannot elevate an employee profile", () => {
  assert.equal(
    authClaimsMatchProfile(
      { role: "employee", shopId: "shop-a" },
      { role: "owner", shopId: "shop-a" },
    ),
    false,
  );
});

test("stale employee claim cannot demote or replace an owner profile", () => {
  assert.equal(
    authClaimsMatchProfile(
      { role: "owner", shopId: "shop-a" },
      { role: "employee", shopId: "shop-a" },
    ),
    false,
  );
});

test("claim for another shop is rejected for an owner", () => {
  assert.equal(
    authClaimsMatchProfile(
      { role: "owner", shopId: "shop-a" },
      { role: "owner", shopId: "shop-b" },
    ),
    false,
  );
});

test("claim for another shop is rejected for an employee", () => {
  assert.equal(
    authClaimsMatchProfile(
      { role: "employee", shopId: "shop-a" },
      { role: "employee", shopId: "shop-b" },
    ),
    false,
  );
});

test("shop claim cannot supply a missing Firestore shop association", () => {
  assert.equal(
    authClaimsMatchProfile({ role: "employee" }, { shopId: "shop-a" }),
    false,
  );
});

test("empty or malformed shop claims fail closed", () => {
  assert.equal(
    authClaimsMatchProfile({ role: "owner", shopId: "shop-a" }, { shopId: " " }),
    false,
  );
  assert.equal(
    authClaimsMatchProfile({ role: "owner", shopId: "shop-a" }, { shopId: 123 }),
    false,
  );
});

test("owner with matching shop ownerUid is allowed", () => {
  assert.deepEqual(
    checkShopMembership(
      { uid: "owner-a", role: "owner", shopId: "shop-a" },
      { exists: true, ownerUid: "owner-a" },
    ),
    { allowed: true, provisionLegacyShop: false },
  );
});

test("owner cannot use a shop owned by someone else", () => {
  assert.equal(
    checkShopMembership(
      { uid: "owner-a", role: "owner", shopId: "shop-b" },
      { exists: true, ownerUid: "owner-b" },
    ).allowed,
    false,
  );
});

test("missing shop document is allowed only for the exact configured legacy owner", () => {
  assert.deepEqual(
    checkShopMembership(
      { uid: "legacy-owner", role: "owner", shopId: "legacy-shop" },
      { exists: false },
      { ownerUid: "legacy-owner", shopId: "legacy-shop" },
    ),
    { allowed: true, provisionLegacyShop: true },
  );
  assert.equal(
    checkShopMembership(
      { uid: "owner-a", role: "owner", shopId: "shop-a" },
      { exists: false },
      { ownerUid: "owner-a", shopId: "shop-b" },
    ).allowed,
    false,
  );
});

test("owner membership rejects a shop record without ownerUid", () => {
  assert.deepEqual(
    checkShopMembership(
      { uid: "owner-a", role: "owner", shopId: "shop-a" },
      { exists: true },
    ),
    { allowed: false, reason: "missing_owner_uid" },
  );
});

test("employee with an existing shop membership is allowed", () => {
  assert.equal(
    checkShopMembership(
      { uid: "employee-a", role: "employee", shopId: "shop-a" },
      { exists: true, ownerUid: "owner-a" },
    ).allowed,
    true,
  );
});

test("employee profile for another shop does not match the configured shop", () => {
  assert.equal(
    checkShopMembership(
      { uid: "employee-a", role: "employee", shopId: "shop-a" },
      { exists: false },
      { ownerUid: "owner-b", shopId: "shop-b", enabled: true },
    ).allowed,
    false,
  );
});

test("missing employee shopId is rejected", () => {
  assert.deepEqual(
    checkShopMembership(
      { uid: "employee-a", role: "employee" },
      { exists: true, ownerUid: "owner-a" },
    ),
    { allowed: false, reason: "missing_shop_id" },
  );
});

test("legacy employee migration requires exact signed employee claims", () => {
  const principal = { uid: "employee-a", role: "employee" as const };
  const legacy = { ownerUid: "owner-a", shopId: "legacy-shop", enabled: true };
  assert.equal(
    canBackfillLegacyEmployee(principal, { role: "employee", shopId: "legacy-shop" }, legacy),
    true,
  );
  assert.equal(
    canBackfillLegacyEmployee(principal, { role: "employee", shopId: "other-shop" }, legacy),
    false,
  );
  assert.equal(
    canBackfillLegacyEmployee(principal, {}, legacy),
    false,
  );
});

test("bootstrap owner refuses to use an implicit default shop id", () => {
  assert.deepEqual(
    validateBootstrapOwnerConfig("owner/a", "shop-a"),
    { ok: false, message: "OWNER_UID is missing or invalid on the server." },
  );
  assert.deepEqual(
    validateBootstrapOwnerConfig("owner-a", undefined),
    { ok: false, message: "SHOP_ID is missing or invalid on the server." },
  );
  assert.deepEqual(
    validateBootstrapOwnerConfig("owner-a", "shop/a"),
    { ok: false, message: "SHOP_ID is missing or invalid on the server." },
  );
  assert.deepEqual(validateBootstrapOwnerConfig(" owner-a ", " shop-a "), {
    ok: true,
    ownerUid: "owner-a",
    shopId: "shop-a",
  });
});

