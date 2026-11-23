import assert from "node:assert/strict";
import test from "node:test";
import {
  Timestamp,
  type DocumentReference,
  type Transaction,
} from "firebase-admin/firestore";
import {
  claimCashSessionCloseInTransaction,
  closeCashSessionInTransaction,
  finishCashSessionCloseInTransaction,
  recordCashActivityInTransaction,
  updateCashSessionInTransaction,
} from "../../server/cashSessionTransactions.ts";

class MemorySessionDocument {
  private tail: Promise<void> = Promise.resolve();
  data: Record<string, unknown> | null = null;

  run<T>(operation: (tx: Transaction) => Promise<T>): Promise<T> {
    const result = this.tail.then(async () => {
      let pendingWrite: Record<string, unknown> | null = null;
      const tx = {
        get: async () => ({
          exists: this.data !== null,
          data: () => this.data ? { ...this.data } : undefined,
        }),
        set: (_ref: unknown, value: Record<string, unknown>) => {
          pendingWrite = { ...(this.data || {}), ...value };
        },
        create: (_ref: unknown, value: Record<string, unknown>) => {
          if (this.data) throw new Error("already exists");
          pendingWrite = { ...value };
        },
      } as unknown as Transaction;

      const outcome = await operation(tx);
      if (pendingWrite) this.data = pendingWrite;
      return outcome;
    });
    this.tail = result.then(() => undefined, () => undefined);
    return result;
  }
}

const sessionRef = {} as DocumentReference;

test("concurrent cash patches preserve both updates", async () => {
  const store = new MemorySessionDocument();
  const [first, second] = await Promise.all([
    store.run((tx) => updateCashSessionInTransaction(tx, sessionRef, {
      shopId: "shop-a",
      date: "2026-11-19",
      openingCash: 500,
    })),
    store.run((tx) => updateCashSessionInTransaction(tx, sessionRef, {
      shopId: "shop-a",
      date: "2026-11-19",
      bKashBalance: 1200,
    })),
  ]);

  assert.equal(first.closed, false);
  assert.equal(second.closed, false);
  assert.equal(store.data?.openingCash, 500);
  assert.equal(store.data?.bKashBalance, 1200);
});

test("cash patches omit undefined fields when the session has no createdAt", async () => {
  const store = new MemorySessionDocument();

  const outcome = await store.run((tx) => updateCashSessionInTransaction(tx, sessionRef, {
    openingCash: 500,
    createdAt: undefined,
    optionalField: undefined,
  }));

  assert.equal(outcome.closed, false);
  assert.equal(Object.hasOwn(store.data || {}, "createdAt"), false);
  assert.equal(Object.hasOwn(store.data || {}, "optionalField"), false);
});

test("cash patches preserve an existing createdAt", async () => {
  const store = new MemorySessionDocument();
  const createdAt = new Date("2026-11-19T00:00:00.000Z");
  store.data = { createdAt, openingCash: 100, isClosed: false };

  await store.run((tx) => updateCashSessionInTransaction(tx, sessionRef, {
    openingCash: 500,
    createdAt: new Date("2026-11-20T00:00:00.000Z"),
  }));

  assert.equal(store.data?.createdAt, createdAt);
});

test("cash close claim fences cash writes and rejects a concurrent close", async () => {
  const store = new MemorySessionDocument();
  const firstStartedAt = Timestamp.fromMillis(1_000);
  const secondStartedAt = Timestamp.fromMillis(1_001);

  const firstClaim = await store.run((tx) =>
    claimCashSessionCloseInTransaction(
      tx,
      sessionRef,
      "close-1",
      firstStartedAt,
      { shopId: "shop-a", date: "2026-11-19" },
    ),
  );
  const secondClaim = await store.run((tx) =>
    claimCashSessionCloseInTransaction(
      tx,
      sessionRef,
      "close-2",
      secondStartedAt,
      { shopId: "shop-a", date: "2026-11-19" },
    ),
  );

  assert.equal(firstClaim, "claimed");
  assert.equal(secondClaim, "inProgress");
  assert.equal(
    (await store.run((tx) => updateCashSessionInTransaction(tx, sessionRef, {
      openingCash: 900,
    }))).closed,
    true,
  );
  await assert.rejects(() =>
    store.run((tx) => recordCashActivityInTransaction(
      tx,
      sessionRef,
      {} as DocumentReference,
      {
        shopId: "shop-a",
        date: "2026-11-19",
        createdAt: firstStartedAt,
        updatedAt: firstStartedAt,
      },
    )),
  );
});

test("a stale cash close claim can be reclaimed", async () => {
  const store = new MemorySessionDocument();
  store.data = {
    shopId: "shop-a",
    date: "2026-11-19",
    isClosed: false,
    isClosing: true,
    closingToken: "stale-close",
    closingStartedAt: Timestamp.fromMillis(1_000),
  };

  const outcome = await store.run((tx) =>
    claimCashSessionCloseInTransaction(
      tx,
      sessionRef,
      "replacement-close",
      Timestamp.fromMillis(121_001),
      { shopId: "shop-a", date: "2026-11-19" },
    ),
  );

  assert.equal(outcome, "claimed");
  assert.equal(store.data?.closingToken, "replacement-close");
});

test("an expired cash close claim cannot finalize", async () => {
  const store = new MemorySessionDocument();
  store.data = {
    shopId: "shop-a",
    date: "2026-11-19",
    isClosed: false,
    isClosing: true,
    closingToken: "expired-close",
    closingStartedAt: Timestamp.fromMillis(1_000),
  };

  const outcome = await store.run((tx) =>
    finishCashSessionCloseInTransaction(
      tx,
      sessionRef,
      "expired-close",
      Timestamp.fromMillis(121_001),
      { actualClosingCash: 900 },
    ),
  );

  assert.equal(outcome.alreadyClosed, false);
  assert.equal(outcome.conflict, true);
  assert.equal(store.data?.isClosed, false);
  assert.equal(store.data?.closingToken, "expired-close");
  assert.equal(store.data?.actualClosingCash, undefined);
});

test("a patch racing after close cannot reopen or overwrite the session", async () => {
  const store = new MemorySessionDocument();
  store.data = {
    shopId: "shop-a",
    date: "2026-11-19",
    openingCash: 100,
    isClosed: false,
  };

  const close = store.run((tx) => closeCashSessionInTransaction(tx, sessionRef, {
    actualClosingCash: 100,
    expectedClosingCash: 100,
  }));
  const patch = store.run((tx) => updateCashSessionInTransaction(tx, sessionRef, {
    bKashBalance: 999,
  }));
  const [closeResult, patchResult] = await Promise.all([close, patch]);

  assert.equal(closeResult.alreadyClosed, false);
  assert.equal(patchResult.closed, true);
  assert.equal(store.data?.isClosed, true);
  assert.equal(store.data?.bKashBalance, 0);
});

