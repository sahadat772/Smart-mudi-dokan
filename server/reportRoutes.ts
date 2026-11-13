import { Router } from "express";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "./firebaseAdmin.js";
import { verifyUser, requirePermission } from "./authMiddleware.js";

const router = Router();

const shopId = () => process.env.SHOP_ID || "default";

function periodBounds(period: "daily" | "monthly") {
  const now = new Date();
  if (period === "daily") {
    const date = now.toISOString().slice(0, 10);
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(`${date}T23:59:59.999Z`);
    return {
      period,
      periodLabel: `আজকের রিপোর্ট (${date})`,
      start,
      end,
      date,
    };
  }

  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const start = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
  const monthName = start.toLocaleString("bn-BD", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return {
    period,
    periodLabel: `চলতি মাসের হিসাব (${monthName})`,
    start,
    end,
    date: now.toISOString().slice(0, 10),
  };
}

router.use(verifyUser);

router.get(
  "/summary",
  requirePermission("reports", "view"),
  async (req, res) => {
    try {
      const periodParam =
        req.query.period === "monthly" ? "monthly" : "daily";
      const bounds = periodBounds(periodParam);
      const startTs = Timestamp.fromDate(bounds.start);
      const endTs = Timestamp.fromDate(bounds.end);
      const sid = shopId();

      let salesRevenue = 0;
      let cogs = 0;
      let grossProfit = 0;
      let dueSalesIncluded = 0;
      let totalInvoices = 0;
      const productQty: Record<
        string,
        { name: string; quantity: number; revenue: number }
      > = {};

      try {
        const salesSnap = await adminDb
          .collection("sales")
          .where("shopId", "==", sid)
          .where("createdAt", ">=", startTs)
          .where("createdAt", "<=", endTs)
          .get();

        totalInvoices = salesSnap.size;

        for (const docSnap of salesSnap.docs) {
          const data = docSnap.data();
          salesRevenue += Number(data.grandTotal) || 0;
          cogs += Number(data.cogsTotal) || 0;
          grossProfit += Number(data.grossProfit) || 0;
          dueSalesIncluded += Number(data.dueAmount) || 0;

          const items = Array.isArray(data.items) ? data.items : [];
          for (const item of items) {
            const pid = item.productId || item.product?.id || "unknown";
            const name =
              item.productName || item.product?.name || "অজানা পণ্য";
            const qty = Number(item.quantity) || 0;
            const rev =
              Number(item.total) ||
              Number(item.totalPrice) ||
              (Number(item.unitPrice) || 0) * qty;

            if (!productQty[pid]) {
              productQty[pid] = { name, quantity: 0, revenue: 0 };
            }
            productQty[pid].quantity += qty;
            productQty[pid].revenue += rev;
          }
        }
      } catch (e) {
        console.warn("Reports sales query failed:", e);
      }

      // If grossProfit not stored consistently, derive
      if (grossProfit === 0 && salesRevenue > 0) {
        grossProfit = salesRevenue - cogs;
      }

      let expenses = 0;
      try {
        const expSnap = await adminDb
          .collection("expenses")
          .where("shopId", "==", sid)
          .where("createdAt", ">=", startTs)
          .where("createdAt", "<=", endTs)
          .get();

        for (const docSnap of expSnap.docs) {
          expenses += Number(docSnap.data().amount) || 0;
        }
      } catch (e) {
        console.warn("Reports expenses query failed:", e);
      }

      let dueCollectedCash = 0;
      try {
        const dueSnap = await adminDb
          .collection("dueCollections")
          .where("shopId", "==", sid)
          .where("createdAt", ">=", startTs)
          .where("createdAt", "<=", endTs)
          .get();

        for (const docSnap of dueSnap.docs) {
          dueCollectedCash += Number(docSnap.data().amount) || 0;
        }
      } catch (e) {
        console.warn("Reports due collections query failed:", e);
      }

      let customerTotalDues = 0;
      try {
        const custSnap = await adminDb
          .collection("customers")
          .where("shopId", "==", sid)
          .where("active", "==", true)
          .get();

        for (const docSnap of custSnap.docs) {
          customerTotalDues += Number(docSnap.data().currentDue) || 0;
        }
      } catch (e) {
        console.warn("Reports customers query failed:", e);
      }

      let supplierTotalDues = 0;
      try {
        const suppSnap = await adminDb
          .collection("suppliers")
          .where("shopId", "==", sid)
          .where("active", "==", true)
          .get();

        for (const docSnap of suppSnap.docs) {
          supplierTotalDues +=
            Number(docSnap.data().outstandingBalance) || 0;
        }
      } catch (e) {
        console.warn("Reports suppliers query failed:", e);
      }

      const netProfit = grossProfit - expenses;
      const grossMarginPercent =
        salesRevenue > 0
          ? Math.round((grossProfit / salesRevenue) * 10000) / 100
          : 0;

      const topProducts = Object.entries(productQty)
        .map(([id, v]) => ({
          productId: id,
          name: v.name,
          quantity: v.quantity,
          revenue: Math.round(v.revenue * 100) / 100,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      return res.json({
        success: true,
        report: {
          period: bounds.period,
          periodLabel: bounds.periodLabel,
          salesRevenue: Math.round(salesRevenue * 100) / 100,
          cogs: Math.round(cogs * 100) / 100,
          grossProfit: Math.round(grossProfit * 100) / 100,
          grossMarginPercent,
          expenses: Math.round(expenses * 100) / 100,
          netProfit: Math.round(netProfit * 100) / 100,
          dueSalesIncluded: Math.round(dueSalesIncluded * 100) / 100,
          dueCollectedCash: Math.round(dueCollectedCash * 100) / 100,
          customerTotalDues: Math.round(customerTotalDues * 100) / 100,
          supplierTotalDues: Math.round(supplierTotalDues * 100) / 100,
          totalInvoices,
          topProducts,
        },
      });
    } catch (error) {
      console.error("Reports summary failed:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to generate report.",
      });
    }
  },
);

export default router;
