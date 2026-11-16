import { Router } from "express";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "./firebaseAdmin.js";
import {
  verifyUser,
  requirePermission,
  type AuthenticatedRequest,
} from "./authMiddleware.js";
import { resolveShopId } from "./shopContext.js";
import {
  getTodayDhakaDateKey,
  getDhakaDayBounds,
  addDateKeyDays,
} from "./dateUtils.js";

const router = Router();

function periodBounds(period: "daily" | "monthly") {
  const today = getTodayDhakaDateKey();

  if (period === "daily") {
    const { start, end } = getDhakaDayBounds(today);
    return {
      period,
      periodLabel: `আজকের রিপোর্ট (${today})`,
      start,
      end,
      date: today,
    };
  }

  const [year, month] = today.split("-").map(Number);
  const startKey = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextMonthDate = new Date(Date.UTC(year, month, 1));
  const nextMonthKey = [
    nextMonthDate.getUTCFullYear(),
    String(nextMonthDate.getUTCMonth() + 1).padStart(2, "0"),
    "01",
  ].join("-");
  const endKey = addDateKeyDays(nextMonthKey, -1);
  const { start } = getDhakaDayBounds(startKey);
  const { end } = getDhakaDayBounds(endKey);
  const monthName = new Intl.DateTimeFormat("bn-BD", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Dhaka",
  }).format(start);

  return {
    period,
    periodLabel: `চলতি মাসের হিসাব (${monthName})`,
    start,
    end,
    date: today,
  };
}

router.use(verifyUser);

router.get(
  "/summary",
  requirePermission("reports", "view"),
  async (req, res) => {
    try {
      const periodParam = req.query.period === "monthly" ? "monthly" : "daily";
      const bounds = periodBounds(periodParam);
      const startTs = Timestamp.fromDate(bounds.start);
      const endTs = Timestamp.fromDate(bounds.end);
      const sid = resolveShopId(req as AuthenticatedRequest);

      const [salesSnap, expSnap, dueSnap, custSnap, suppSnap] =
        await Promise.all([
          adminDb
            .collection("sales")
            .where("shopId", "==", sid)
            .where("createdAt", ">=", startTs)
            .where("createdAt", "<=", endTs)
            .get(),
          adminDb
            .collection("expenses")
            .where("shopId", "==", sid)
            .where("createdAt", ">=", startTs)
            .where("createdAt", "<=", endTs)
            .get(),
          adminDb
            .collection("dueCollections")
            .where("shopId", "==", sid)
            .where("createdAt", ">=", startTs)
            .where("createdAt", "<=", endTs)
            .get(),
          adminDb
            .collection("customers")
            .where("shopId", "==", sid)
            .where("active", "==", true)
            .get(),
          adminDb
            .collection("suppliers")
            .where("shopId", "==", sid)
            .get(),
        ]);

      let salesRevenue = 0;
      let cogs = 0;
      let grossProfit = 0;
      let dueSalesIncluded = 0;
      let totalInvoices = 0;
      const productQty: Record<
        string,
        { name: string; quantity: number; revenue: number }
      > = {};

      for (const docSnap of salesSnap.docs) {
        const data = docSnap.data() as Record<string, any>;
        totalInvoices += 1;
        const grand = Number(data.grandTotal) || 0;
        salesRevenue += grand;
        cogs += Number(data.cogsTotal) || 0;
        grossProfit += Number(data.grossProfit) || 0;
        dueSalesIncluded += Number(data.dueAmount) || 0;

        for (const item of data.items || []) {
          const pid = item.productId || item.productName || "unknown";
          const qty = Number(item.quantity) || 0;
          const netRevenue = Number(item.total) || 0;
          if (!productQty[pid]) {
            productQty[pid] = {
              name: item.productName || pid,
              quantity: 0,
              revenue: 0,
            };
          }
          productQty[pid].quantity += qty;
          productQty[pid].revenue += netRevenue;
        }
      }

      if (grossProfit === 0 && salesRevenue > 0) {
        grossProfit = salesRevenue - cogs;
      }

      let expenses = 0;
      for (const docSnap of expSnap.docs) {
        expenses += Number(docSnap.data().amount) || 0;
      }

      let dueCollectedCash = 0;
      for (const docSnap of dueSnap.docs) {
        dueCollectedCash += Number(docSnap.data().amount) || 0;
      }

      let customerTotalDues = 0;
      for (const docSnap of custSnap.docs) {
        customerTotalDues += Number(docSnap.data().currentDue) || 0;
      }

      let supplierTotalDues = 0;
      for (const docSnap of suppSnap.docs) {
        supplierTotalDues += Number(docSnap.data().outstandingBalance) || 0;
      }

      const netProfit = grossProfit - expenses;
      const grossMarginPercent =
        salesRevenue > 0
          ? Math.round((grossProfit / salesRevenue) * 10000) / 100
          : 0;

      const topProducts = Object.entries(productQty)
        .map(([id, value]) => ({
          productId: id,
          name: value.name,
          quantity: value.quantity,
          revenue: Math.round(value.revenue * 100) / 100,
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
