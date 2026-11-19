import type { DocumentReference, Transaction } from "firebase-admin/firestore";

export type CashSessionData = Record<string, any>;

const emptyBalances: CashSessionData = {
  openingCash: 0,
  bKashBalance: 0,
  nagadBalance: 0,
  bankBalance: 0,
  isClosed: false,
};

export async function ensureCashSessionInTransaction(
  tx: Transaction,
  sessionRef: DocumentReference,
  previousRef: DocumentReference,
  identity: { shopId: string; date: string; createdAt: unknown; updatedAt: unknown },
): Promise<CashSessionData> {
  const sessionSnap = await tx.get(sessionRef);
  if (sessionSnap.exists) return sessionSnap.data() || {};

  const previousSnap = await tx.get(previousRef);
  const previous = previousSnap.data() || {};
  const openingCash = previous.actualClosingCash != null
    ? Number(previous.actualClosingCash) || 0
    : Number(previous.openingCash) || 0;
  const session: CashSessionData = {
    ...emptyBalances,
    shopId: identity.shopId,
    date: identity.date,
    openingCash,
    bKashBalance: Number(previous.bKashBalance) || 0,
    nagadBalance: Number(previous.nagadBalance) || 0,
    bankBalance: Number(previous.bankBalance) || 0,
    createdAt: identity.createdAt,
    updatedAt: identity.updatedAt,
  };
  tx.create(sessionRef, session);
  return session;
}

export async function updateCashSessionInTransaction(
  tx: Transaction,
  ref: DocumentReference,
  updates: CashSessionData,
): Promise<{ closed: boolean; session?: CashSessionData }> {
  const snap = await tx.get(ref);
  const stored = snap.exists ? snap.data() || {} : {};
  if (stored.isClosed === true) return { closed: true };

  const session = {
    ...emptyBalances,
    ...stored,
    ...updates,
    createdAt: stored.createdAt ?? updates.createdAt,
    isClosed: false,
  };
  tx.set(ref, session, { merge: true });
  return { closed: false, session };
}

export async function closeCashSessionInTransaction(
  tx: Transaction,
  ref: DocumentReference,
  closingFields: CashSessionData | ((stored: CashSessionData) => CashSessionData),
): Promise<{ alreadyClosed: boolean; session?: CashSessionData }> {
  const snap = await tx.get(ref);
  const stored = snap.exists ? snap.data() || {} : {};
  if (stored.isClosed === true) return { alreadyClosed: true };

  const closeUpdates = typeof closingFields === "function"
    ? closingFields(stored)
    : closingFields;
  const session = { ...emptyBalances, ...stored, ...closeUpdates, isClosed: true };
  tx.set(ref, session, { merge: true });
  return { alreadyClosed: false, session };
}

