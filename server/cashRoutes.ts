import { randomUUID } from "node:crypto";
import { Router } from "express";
import {
  FieldValue,
  Timestamp,
} from "firebase-admin/firestore";
import { adminDb } from "./firebaseAdmin.js";
import {
  getDhakaDayBounds,
  addDateKeyDays,
} from "./dateUtils.js";
import { captureCashEventTime } from "./cashEventTime.js";
import {
  verifyUser,
  requirePermission,
  type AuthenticatedRequest,
} from "./authMiddleware.js";
import { resolveShopId } from "./shopContext.js";
import {
  CASH_TRANSACTION_MAX_ATTEMPTS,
  claimCashSessionCloseInTransaction,
  ensureCashSessionInTransaction,
  finishCashSessionCloseInTransaction,
  getCashTransactionErrorStatus,
  releaseCashSessionCloseInTransaction,
  updateCashSessionInTransaction,
} from "./cashSessionTransactions.js";

const router = Router();

function mapSession(
  date: string,
  stored: Record<string, any>,
  computed: {
    cashSales: number;
    cashDueCollected: number;
    cashExpenses: number;
    cashSupplierPaid: number;
  },
) {
  const openingCash = Number(stored.openingCash) || 0;
  const expectedClosingCash =
    openingCash +
    computed.cashSales +
    computed.cashDueCollected -
    computed.cashExpenses -
    computed.cashSupplierPaid;

  const actualClosingCash =
    stored.actualClosingCash != null
      ? Number(stored.actualClosingCash)
      : undefined;

  const discrepancy =
    actualClosingCash != null
      ? actualClosingCash - expectedClosingCash
      : undefined;

  return {
    date,
    openingCash,
    cashSales: computed.cashSales,
    cashDueCollected: computed.cashDueCollected,
    cashSupplierPaid: computed.cashSupplierPaid,
    cashExpenses: computed.cashExpenses,
    expectedClosingCash,
    actualClosingCash,
    discrepancy,
    bKashBalance: Number(stored.bKashBalance) || 0,
    nagadBalance: Number(stored.nagadBalance) || 0,
    bankBalance: Number(stored.bankBalance) || 0,
    isClosed: stored.isClosed === true,
  };
}

type CashTotals = {
  cashSales: number;
  cashDueCollected: number;
  cashExpenses: number;
  cashSupplierPaid: number;
};

async function computeCashTotals(
  dateStr: string,
  sid: string,
): Promise<CashTotals> {
  const { start, end } = getDhakaDayBounds(dateStr);
  const startTs = Timestamp.fromDate(start);
  const endTs = Timestamp.fromDate(end);
  const queries = [
    adminDb
      .collection("sales")
      .where("shopId", "==", sid)
      .where("createdAt", ">=", startTs)
      .where("createdAt", "<=", endTs),
    adminDb
      .collection("dueCollections")
      .where("shopId", "==", sid)
      .where("createdAt", ">=", startTs)
      .where("createdAt", "<=", endTs),
    adminDb
      .collection("expenses")
      .where("shopId", "==", sid)
      .where("createdAt", ">=", startTs)
      .where("createdAt", "<=", endTs),
    adminDb
      .collection("supplierPayments")
      .where("shopId", "==", sid)
      .where("createdAt", ">=", startTs)
      .where("createdAt", "<=", endTs),
    adminDb
      .collection("purchases")
      .where("shopId", "==", sid)
      .where("createdAt", ">=", startTs)
      .where("createdAt", "<=", endTs),
  ];
  // All essential queries must succeed.
  // Never return partial or misleading cash totals.
  const snapshots = await Promise.all(queries.map((query) => query.get()));
  const [salesSnap, dueSnap, expSnap, paySnap, purchSnap] = snapshots;

  let cashSales = 0;
  let cashDueCollected = 0;
  let cashExpenses = 0;
  let cashSupplierPaid = 0;

  for (const docSnap of salesSnap.docs) {
    const data = docSnap.data();
    const payments = Array.isArray(data.payments) ? data.payments : [];

    for (const payment of payments) {
      if (payment?.method === "নগদ (Cash)") {
        cashSales += Number(payment.amount) || 0;
      }
    }
  }

  for (const docSnap of dueSnap.docs) {
    const data = docSnap.data();

    if (data.paymentMethod === "নগদ (Cash)") {
      cashDueCollected += Number(data.amount) || 0;
    }
  }

  for (const docSnap of expSnap.docs) {
    const data = docSnap.data();

    if (data.paymentMethod === "নগদ (Cash)") {
      cashExpenses += Number(data.amount) || 0;
    }
  }

  for (const docSnap of paySnap.docs) {
    const data = docSnap.data();

    if (data.paymentMethod === "নগদ (Cash)") {
      cashSupplierPaid += Number(data.amount) || 0;
    }
  }

  // Include cash paid at purchase time.
  for (const docSnap of purchSnap.docs) {
    const data = docSnap.data();

    if (data.paymentMethod === "নগদ (Cash)") {
      cashSupplierPaid += Number(data.paidAmount) || 0;
    }
  }

  return {
    cashSales,
    cashDueCollected,
    cashExpenses,
    cashSupplierPaid,
  };
}

router.use(verifyUser);

/** Get today's cash session (create if missing) */
router.get("/today", requirePermission("cash", "view"), async (req, res) => {
  try {
    const sid = resolveShopId(req as AuthenticatedRequest);
    const date = captureCashEventTime(req).date;
    const docId = `${sid}_${date}`;
    const ref = adminDb.collection("cashSessions").doc(docId);
    const previousDate = addDateKeyDays(date, -1);
    const previousRef = adminDb.collection("cashSessions").doc(`${sid}_${previousDate}`);
    const stored = await adminDb.runTransaction(
      (tx) => ensureCashSessionInTransaction(tx, ref, previousRef, {
        shopId: sid,
        date,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }),
      { maxAttempts: CASH_TRANSACTION_MAX_ATTEMPTS },
    );

    const computed = await computeCashTotals(date, sid);
    return res.json({
      success: true,
      session: mapSession(date, stored, computed),
    });
  } catch (error) {
    console.error("Get cash session failed:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load cash session.",
    });
  }
});

/** Set / update opening cash and digital balances (if not closed) */
router.patch(
  "/today",
  requirePermission("cash", "manage"),
  async (req, res) => {
    try {
      const sid = resolveShopId(req as AuthenticatedRequest);
      const date = captureCashEventTime(req).date;
      const docId = `${sid}_${date}`;
      const ref = adminDb.collection("cashSessions").doc(docId);

      const body = req.body || {};
      const updates: Record<string, any> = {
        shopId: sid,
        date,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (body.openingCash != null) {
        const v = Number(body.openingCash);
        if (!Number.isFinite(v) || v < 0) {
          return res.status(400).json({
            success: false,
            message: "Invalid opening cash.",
          });
        }
        updates.openingCash = v;
      }

      for (const key of [
        "bKashBalance",
        "nagadBalance",
        "bankBalance",
      ] as const) {
        if (body[key] != null) {
          const v = Number(body[key]);
          if (!Number.isFinite(v) || v < 0) {
            return res.status(400).json({
              success: false,
              message: `Invalid ${key}.`,
            });
          }
          updates[key] = v;
        }
      }

      const outcome = await adminDb.runTransaction(
        (tx) => updateCashSessionInTransaction(tx, ref, updates),
        { maxAttempts: CASH_TRANSACTION_MAX_ATTEMPTS },
      );
      if (outcome.closed) {
        return res.status(400).json({
          success: false,
          message: "Today's cash session is already closed.",
        });
      }

      const computed = await computeCashTotals(date, sid);

      return res.json({
        success: true,
        message: "Cash session updated.",
        session: mapSession(date, outcome.session || {}, computed),
      });
    } catch (error) {
      const status = getCashTransactionErrorStatus(error);
      if (status !== 409) console.error("Update cash session failed:", error);
      return res.status(status).json({
        success: false,
        message: status === 409
          ? "Cash session changed during this update. Please retry."
          : "Unable to update cash session.",
      });
    }
  },
);

/** Close today's cash with actual counted amount */
router.post(
  "/today/close",
  requirePermission("cash", "manage"),
  async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const sid = resolveShopId(authReq);
      const date = captureCashEventTime(req).date;
      const docId = `${sid}_${date}`;
      const ref = adminDb.collection("cashSessions").doc(docId);

      const actualClosingCash = Number(req.body?.actualClosingCash);
      if (!Number.isFinite(actualClosingCash) || actualClosingCash < 0) {
        return res.status(400).json({
          success: false,
          message: "Valid actual closing cash is required.",
        });
      }

      const closedBy =
        authReq.user?.displayName ||
        authReq.user?.email ||
        (authReq.user?.role === "owner" ? "Owner" : "Employee");

      const closeId = randomUUID();
      const closeStartedAt = Timestamp.now();
      const claim = await adminDb.runTransaction(
        (tx) => claimCashSessionCloseInTransaction(
          tx,
          ref,
          closeId,
          closeStartedAt,
          { shopId: sid, date },
        ),
        { maxAttempts: CASH_TRANSACTION_MAX_ATTEMPTS },
      );
      if (claim === "alreadyClosed") {
        return res.status(400).json({
          success: false,
          message: "Already closed for today.",
        });
      }
      if (claim === "inProgress") {
        return res.status(409).json({
          success: false,
          message: "Cash session is already closing. Please retry.",
        });
      }

      try {
        const computed = await computeCashTotals(date, sid);
        const outcome = await adminDb.runTransaction(
          (tx) => finishCashSessionCloseInTransaction(
            tx,
            ref,
            closeId,
            Timestamp.now(),
            (current) => {
              const openingCash = Number(current.openingCash) || 0;
              const expectedClosingCash =
                openingCash +
                computed.cashSales +
                computed.cashDueCollected -
                computed.cashExpenses -
                computed.cashSupplierPaid;
              return {
                shopId: sid,
                date,
                openingCash,
                bKashBalance: Number(current.bKashBalance) || 0,
                nagadBalance: Number(current.nagadBalance) || 0,
                bankBalance: Number(current.bankBalance) || 0,
                actualClosingCash,
                expectedClosingCash,
                discrepancy: actualClosingCash - expectedClosingCash,
                closedAt: FieldValue.serverTimestamp(),
                closedBy,
                closedByUid: authReq.user?.uid,
                updatedAt: FieldValue.serverTimestamp(),
                createdAt: current.createdAt || FieldValue.serverTimestamp(),
              };
            },
          ),
          { maxAttempts: CASH_TRANSACTION_MAX_ATTEMPTS },
        );
        if (outcome.alreadyClosed) {
          return res.status(400).json({
            success: false,
            message: "Already closed for today.",
          });
        }
        if (outcome.conflict) {
          try {
            await adminDb.runTransaction(
              (tx) => releaseCashSessionCloseInTransaction(tx, ref, closeId),
              { maxAttempts: CASH_TRANSACTION_MAX_ATTEMPTS },
            );
          } catch (releaseError) {
            console.error("Release expired cash closing claim failed:", releaseError);
          }
          return res.status(409).json({
            success: false,
            message: "Cash session changed during closing. Please retry.",
          });
        }
        if (!outcome.session) {
          throw new Error("Cash close did not return its committed session.");
        }

        return res.json({
          success: true,
          message: "Cash session closed.",
          session: mapSession(date, outcome.session, computed),
        });
      } catch (error) {
        try {
          await adminDb.runTransaction(
            (tx) => releaseCashSessionCloseInTransaction(tx, ref, closeId),
            { maxAttempts: CASH_TRANSACTION_MAX_ATTEMPTS },
          );
        } catch (releaseError) {
          console.error("Release cash closing lock failed:", releaseError);
        }
        throw error;
      }
    } catch (error) {
      const status = getCashTransactionErrorStatus(error);
      if (status !== 409) console.error("Close cash session failed:", error);
      return res.status(status).json({
        success: false,
        message: status === 409
          ? "Cash session changed during closing. Please retry."
          : "Unable to close cash session.",
      });
    }
  },
);

export default router;
