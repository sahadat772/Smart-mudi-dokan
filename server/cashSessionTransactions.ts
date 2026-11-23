import {
  FieldValue,
  Timestamp,
  type DocumentReference,
  type Transaction,
} from "firebase-admin/firestore";

export type CashSessionData = Record<string, any>;
type CashSessionIdentity = {
  shopId: string;
  date: string;
  createdAt: unknown;
  updatedAt: unknown;
};

export const CASH_TRANSACTION_MAX_ATTEMPTS = 5;
export const CASH_SESSION_CLOSE_LEASE_MS = 120_000;

export class CashSessionClosedError extends Error {
  readonly status = 409;

  constructor() {
    super("Today's cash session is already closed.");
    this.name = "CashSessionClosedError";
  }
}

export function getCashTransactionErrorStatus(error: unknown): number {
  if (typeof error === "object" && error !== null) {
    if ("status" in error && typeof error.status === "number") {
      return error.status;
    }

    if ("code" in error) {
      const code = String(error.code).toLowerCase();
      if (code === "10" || code === "aborted") return 409;
    }
  }
  return 500;
}

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
  identity: CashSessionIdentity,
): Promise<CashSessionData> {
  const sessionSnap = await tx.get(sessionRef);
  if (sessionSnap.exists) return sessionSnap.data() || {};

  const previousSnap = await tx.get(previousRef);
  const previous = previousSnap.data() || {};
  const session = createCashSession(previous, identity);
  tx.create(sessionRef, session);
  return session;
}

export async function recordCashActivityInTransaction(
  tx: Transaction,
  sessionRef: DocumentReference,
  previousRef: DocumentReference,
  identity: CashSessionIdentity,
): Promise<CashSessionData> {
  const sessionSnap = await tx.get(sessionRef);
  if (sessionSnap.exists) {
    const stored = sessionSnap.data() || {};
    if (stored.isClosed === true || stored.isClosing === true) {
      throw new CashSessionClosedError();
    }

    const currentVersion = Number(stored.cashActivityVersion);
    const cashActivityVersion =
      Number.isSafeInteger(currentVersion) && currentVersion >= 0
        ? currentVersion + 1
        : 1;
    tx.update(sessionRef, {
      cashActivityVersion,
      updatedAt: identity.updatedAt,
    });
    return { ...stored, cashActivityVersion };
  }

  const previousSnap = await tx.get(previousRef);
  const previous = previousSnap.data() || {};
  const session = createCashSession(previous, identity);
  session.cashActivityVersion = 1;
  tx.create(sessionRef, session);
  return session;
}

export async function claimCashSessionCloseInTransaction(
  tx: Transaction,
  ref: DocumentReference,
  closeId: string,
  startedAt: Timestamp,
  identity: { shopId: string; date: string },
): Promise<"claimed" | "alreadyClosed" | "inProgress"> {
  const snap = await tx.get(ref);
  const stored = snap.exists ? snap.data() || {} : {};
  if (stored.isClosed === true) return "alreadyClosed";

  const currentStartedAt = stored.closingStartedAt;
  const currentStartedAtMillis =
    typeof currentStartedAt?.toMillis === "function"
      ? currentStartedAt.toMillis()
      : undefined;
  const closeIsInProgress =
    stored.isClosing === true &&
    currentStartedAtMillis != null &&
    startedAt.toMillis() - currentStartedAtMillis < CASH_SESSION_CLOSE_LEASE_MS;
  if (closeIsInProgress) return "inProgress";

  tx.set(ref, {
    ...emptyBalances,
    ...stored,
    shopId: identity.shopId,
    date: identity.date,
    createdAt: stored.createdAt || FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    isClosing: true,
    closingToken: closeId,
    closingStartedAt: startedAt,
  }, { merge: true });
  return "claimed";
}

export async function finishCashSessionCloseInTransaction(
  tx: Transaction,
  ref: DocumentReference,
  closeId: string,
  finishedAt: Timestamp,
  closingFields: CashSessionData | ((stored: CashSessionData) => CashSessionData),
): Promise<{
  alreadyClosed: boolean;
  conflict: boolean;
  session?: CashSessionData;
}> {
  const snap = await tx.get(ref);
  const stored = snap.exists ? snap.data() || {} : {};
  if (stored.isClosed === true) {
    return { alreadyClosed: true, conflict: false };
  }
  if (stored.isClosing !== true || stored.closingToken !== closeId) {
    return { alreadyClosed: false, conflict: true };
  }
  const closingStartedAt = stored.closingStartedAt;
  const closingStartedAtMillis =
    typeof closingStartedAt?.toMillis === "function"
      ? closingStartedAt.toMillis()
      : undefined;
  const leaseAge =
    closingStartedAtMillis == null
      ? undefined
      : finishedAt.toMillis() - closingStartedAtMillis;
  if (
    leaseAge == null ||
    leaseAge < 0 ||
    leaseAge >= CASH_SESSION_CLOSE_LEASE_MS
  ) {
    return { alreadyClosed: false, conflict: true };
  }

  const closeUpdates = typeof closingFields === "function"
    ? closingFields(stored)
    : closingFields;
  const session = {
    ...emptyBalances,
    ...stored,
    ...closeUpdates,
    isClosed: true,
    isClosing: false,
    closingToken: FieldValue.delete(),
    closingStartedAt: FieldValue.delete(),
  };
  tx.set(ref, session, { merge: true });
  return { alreadyClosed: false, conflict: false, session };
}

export async function releaseCashSessionCloseInTransaction(
  tx: Transaction,
  ref: DocumentReference,
  closeId: string,
): Promise<void> {
  const snap = await tx.get(ref);
  const stored = snap.exists ? snap.data() || {} : {};
  if (
    stored.isClosed === true ||
    stored.isClosing !== true ||
    stored.closingToken !== closeId
  ) {
    return;
  }

  tx.update(ref, {
    isClosing: false,
    closingToken: FieldValue.delete(),
    closingStartedAt: FieldValue.delete(),
  });
}

function createCashSession(
  previous: CashSessionData,
  identity: CashSessionIdentity,
): CashSessionData {
  const openingCash = previous.actualClosingCash != null
    ? Number(previous.actualClosingCash) || 0
    : Number(previous.openingCash) || 0;
  return {
    ...emptyBalances,
    shopId: identity.shopId,
    date: identity.date,
    openingCash,
    bKashBalance: Number(previous.bKashBalance) || 0,
    nagadBalance: Number(previous.nagadBalance) || 0,
    bankBalance: Number(previous.bankBalance) || 0,
    createdAt: identity.createdAt,
    updatedAt: identity.updatedAt,
    cashActivityVersion: 0,
  };
}

export async function updateCashSessionInTransaction(
  tx: Transaction,
  ref: DocumentReference,
  updates: CashSessionData,
): Promise<{ closed: boolean; session?: CashSessionData }> {
  const snap = await tx.get(ref);
  const stored = snap.exists ? snap.data() || {} : {};
  if (stored.isClosed === true || stored.isClosing === true) {
    return { closed: true };
  }

  const definedUpdates = Object.fromEntries(
    Object.entries(updates).filter(([, value]) => value !== undefined),
  );
  const session: CashSessionData = {
    ...emptyBalances,
    ...stored,
    ...definedUpdates,
    isClosed: false,
  };
  if (stored.createdAt !== undefined) {
    session.createdAt = stored.createdAt;
  } else if (definedUpdates.createdAt === undefined) {
    delete session.createdAt;
  }
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

