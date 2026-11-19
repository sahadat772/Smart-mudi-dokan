import assert from "node:assert/strict";
import test from "node:test";
import { authClaimsMatchProfile } from "../../server/authIdentity.ts";

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

