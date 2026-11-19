import assert from "node:assert/strict";
import test from "node:test";
import type { DocumentReference, Transaction } from "firebase-admin/firestore";
import {
  closeCashSessionInTransaction,
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

