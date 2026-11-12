import { Router } from "express";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "./firebaseAdmin.js";
import {
  verifyUser,
  requirePermission,
  type AuthenticatedRequest,
} from "./authMiddleware.js";

const router = Router();

const shopId = () => process.env.SHOP_ID || "default";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function dayBounds(dateStr: string) {
  const start = new Date(`${dateStr}T00:00:00.000Z`);
  const end = new Date(`${dateStr}T23:59:59.999Z`);
  return { start, end };
}

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

async function computeCashTotals(dateStr: string) {
  const { start, end } = dayBounds(dateStr);
  const startTs = Timestamp.fromDate(start);
  const endTs = Timestamp.fromDate(end);
  const sid = shopId();

  let cashSales = 0;
  let cashDueCollected = 0;
  let cashExpenses = 0;
  let cashSupplierPaid = 0;

  try {
    const salesSnap = await adminDb
      .collection("sales")
      .where("shopId", "==", sid)
      .where("createdAt", ">=", startTs)
      .where("createdAt", "<=", endTs)
      .get();

    for (const docSnap of salesSnap.docs) {
      const data = docSnap.data();
      const payments = Array.isArray(data.payments) ? data.payments : [];
      for (const p of payments) {
        if (p?.method === "নগদ (Cash)") {
          cashSales += Number(p.amount) || 0;
        }
      }
    }
  } catch (e) {
    console.warn("cashSales query failed (index?):", e);
  }

  try {
    const dueSnap = await adminDb
      .collection("dueCollections")
      .where("shopId", "==", sid)
      .where("createdAt", ">=", startTs)
      .where("createdAt", "<=", endTs)
      .get();

    for (const docSnap of dueSnap.docs) {
      const data = docSnap.data();
      if (data.paymentMethod === "নগদ (Cash)") {
        cashDueCollected += Number(data.amount) || 0;
      }
    }
  } catch (e) {
    console.warn("cashDueCollected query failed (index?):", e);
  }

  try {
    const expSnap = await adminDb
      .collection("expenses")
      .where("shopId", "==", sid)
      .where("createdAt", ">=", startTs)
      .where("createdAt", "<=", endTs)
      .get();

    for (const docSnap of expSnap.docs) {
      const data = docSnap.data();
      if (data.paymentMethod === "নগদ (Cash)") {
        cashExpenses += Number(data.amount) || 0;
      }
    }
  } catch (e) {
    console.warn("cashExpenses query failed (index?):", e);
  }

  try {
    const paySnap = await adminDb
      .collection("supplierPayments")
      .where("shopId", "==", sid)
      .where("createdAt", ">=", startTs)
      .where("createdAt", "<=", endTs)
      .get();

    for (const docSnap of paySnap.docs) {
      const data = docSnap.data();
      if (data.paymentMethod === "নগদ (Cash)") {
        cashSupplierPaid += Number(data.amount) || 0;
      }
    }
  } catch (e) {
    console.warn("cashSupplierPaid query failed (index?):", e);
  }

  // Also include cash paid at purchase time
  try {
    const purchSnap = await adminDb
      .collection("purchases")
      .where("shopId", "==", sid)
      .where("createdAt", ">=", startTs)
      .where("createdAt", "<=", endTs)
      .get();

    for (const docSnap of purchSnap.docs) {
      const data = docSnap.data();
      if (data.paymentMethod === "নগদ (Cash)") {
        cashSupplierPaid += Number(data.paidAmount) || 0;
      }
    }
  } catch (e) {
    console.warn("purchase cash query failed (index?):", e);
  }

  return { cashSales, cashDueCollected, cashExpenses, cashSupplierPaid };
}

router.use(verifyUser);

/** Get today's cash session (create if missing) */
router.get(
  "/today",
  requirePermission("cash", "view"),
  async (_req, res) => {
    try {
      const date = todayKey();
      const docId = `${shopId()}_${date}`;
      const ref = adminDb.collection("cashSessions").doc(docId);
      const snap = await ref.get();

      let stored: Record<string, any>;

      if (!snap.exists) {
        // Carry forward previous actual closing as opening if available
        let openingCash = 0;
        const y = new Date();
        y.setUTCDate(y.getUTCDate() - 1);
        const prevDate = y.toISOString().slice(0, 10);
        const prevSnap = await adminDb
          .collection("cashSessions")
          .doc(`${shopId()}_${prevDate}`)
          .get();

        if (prevSnap.exists) {
          const prev = prevSnap.data() || {};
          if (prev.actualClosingCash != null) {
            openingCash = Number(prev.actualClosingCash) || 0;
          } else {
            openingCash = Number(prev.openingCash) || 0;
          }
        }

        stored = {
          shopId: shopId(),
          date,
          openingCash,
          bKashBalance: Number(prevSnap.data()?.bKashBalance) || 0,
          nagadBalance: Number(prevSnap.data()?.nagadBalance) || 0,
          bankBalance: Number(prevSnap.data()?.bankBalance) || 0,
          isClosed: false,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };

        await ref.set(stored);
      } else {
        stored = snap.data() || {};
      }

      const computed = await computeCashTotals(date);
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
  },
);

/** Set / update opening cash and digital balances (if not closed) */
router.patch(
  "/today",
  requirePermission("cash", "manage"),
  async (req, res) => {
    try {
      const date = todayKey();
      const docId = `${shopId()}_${date}`;
      const ref = adminDb.collection("cashSessions").doc(docId);
      const snap = await ref.get();

      if (snap.exists && snap.data()?.isClosed === true) {
        return res.status(400).json({
          success: false,
          message: "Today's cash session is already closed.",
        });
      }

      const body = req.body || {};
      const updates: Record<string, any> = {
        shopId: shopId(),
        date,
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

      for (const key of ["bKashBalance", "nagadBalance", "bankBalance"] as const) {
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

      if (!snap.exists) {
        await ref.set({
          openingCash: 0,
          bKashBalance: 0,
          nagadBalance: 0,
          bankBalance: 0,
          isClosed: false,
          createdAt: FieldValue.serverTimestamp(),
          ...updates,
        });
      } else {
        await ref.set(updates, { merge: true });
      }

      const fresh = (await ref.get()).data() || {};
      const computed = await computeCashTotals(date);

      return res.json({
        success: true,
        message: "Cash session updated.",
        session: mapSession(date, fresh, computed),
      });
    } catch (error) {
      console.error("Update cash session failed:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to update cash session.",
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
      const date = todayKey();
      const docId = `${shopId()}_${date}`;
      const ref = adminDb.collection("cashSessions").doc(docId);
      const snap = await ref.get();

      if (snap.exists && snap.data()?.isClosed === true) {
        return res.status(400).json({
          success: false,
          message: "Already closed for today.",
        });
      }

      const actualClosingCash = Number(req.body?.actualClosingCash);
      if (!Number.isFinite(actualClosingCash) || actualClosingCash < 0) {
        return res.status(400).json({
          success: false,
          message: "Valid actual closing cash is required.",
        });
      }

      const computed = await computeCashTotals(date);
      const stored = snap.exists
        ? snap.data() || {}
        : { openingCash: 0, bKashBalance: 0, nagadBalance: 0, bankBalance: 0 };

      const openingCash = Number(stored.openingCash) || 0;
      const expectedClosingCash =
        openingCash +
        computed.cashSales +
        computed.cashDueCollected -
        computed.cashExpenses -
        computed.cashSupplierPaid;

      const discrepancy = actualClosingCash - expectedClosingCash;

      const closedBy =
        authReq.user?.displayName ||
        authReq.user?.email ||
        (authReq.user?.role === "owner" ? "Owner" : "Employee");

      await ref.set(
        {
          shopId: shopId(),
          date,
          openingCash,
          bKashBalance: Number(stored.bKashBalance) || 0,
          nagadBalance: Number(stored.nagadBalance) || 0,
          bankBalance: Number(stored.bankBalance) || 0,
          actualClosingCash,
          expectedClosingCash,
          discrepancy,
          isClosed: true,
          closedAt: FieldValue.serverTimestamp(),
          closedBy,
          closedByUid: authReq.user?.uid,
          updatedAt: FieldValue.serverTimestamp(),
          createdAt: stored.createdAt || FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      const fresh = (await ref.get()).data() || {};

      return res.json({
        success: true,
        message: "Cash session closed.",
        session: mapSession(date, fresh, computed),
      });
    } catch (error) {
      console.error("Close cash session failed:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to close cash session.",
      });
    }
  },
);

export default router;
