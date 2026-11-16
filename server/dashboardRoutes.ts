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
  addDateKeyDays,
  getDhakaDayBounds,
  getTodayDhakaDateKey,
} from "./dateUtils.js";

const router = Router();

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function dhakaDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function labelFor(dateKey: string, isToday: boolean) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const noon = new Date(Date.UTC(year, month - 1, day, 6, 0, 0));

  return {
    day: isToday
      ? "আজ"
      : new Intl.DateTimeFormat("bn-BD", {
          weekday: "short",
          timeZone: "Asia/Dhaka",
        }).format(noon),
    date: new Intl.DateTimeFormat("bn-BD", {
      day: "numeric",
      month: "short",
      timeZone: "Asia/Dhaka",
    }).format(noon),
  };
}

function saleProfit(data: Record<string, unknown>) {
  const revenue = Number(data.grandTotal) || 0;
  const cogs = Number(data.cogsTotal) || 0;
  const stored = Number(data.grossProfit);
  if (Number.isFinite(stored) && stored !== 0) return stored;
  if (revenue > 0) return revenue - cogs;
  return stored || 0;
}

router.use(verifyUser);

router.get("/", requirePermission("dashboard", "view"), async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const canViewProfit = authReq.user?.role === "owner";
    const sid = resolveShopId(authReq);
    const today = getTodayDhakaDateKey();
    const startKey = addDateKeyDays(today, -6);
    const { start } = getDhakaDayBounds(startKey);
    const { end } = getDhakaDayBounds(today);
    const startTs = Timestamp.fromDate(start);
    const endTs = Timestamp.fromDate(end);

    const [salesSnap, expSnap, custSnap] = await Promise.all([
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
        .collection("customers")
        .where("shopId", "==", sid)
        .where("active", "==", true)
        .get(),
    ]);

    const days: Record<
      string,
      { sales: number; profit: number; orders: number; expenses: number }
    > = {};

    for (let offset = -6; offset <= 0; offset += 1) {
      const key = addDateKeyDays(today, offset);
      days[key] = { sales: 0, profit: 0, orders: 0, expenses: 0 };
    }

    for (const docSnap of salesSnap.docs) {
      const data = docSnap.data() as Record<string, any>;
      const created = data.createdAt?.toDate?.();
      if (!created) continue;
      const key = dhakaDateKey(created);
      if (!days[key]) continue;
      days[key].sales += Number(data.grandTotal) || 0;
      days[key].profit += saleProfit(data);
      days[key].orders += 1;
    }

    for (const docSnap of expSnap.docs) {
      const data = docSnap.data() as Record<string, any>;
      const created = data.createdAt?.toDate?.();
      if (!created) continue;
      const key = dhakaDateKey(created);
      if (!days[key]) continue;
      days[key].expenses += Number(data.amount) || 0;
    }

    let customerTotalDues = 0;
    for (const docSnap of custSnap.docs) {
      customerTotalDues += Number(docSnap.data().currentDue) || 0;
    }

    const todayRow = days[today];
    const trend = Object.keys(days).map((key) => {
      const row = days[key];
      const isToday = key === today;
      const labels = labelFor(key, isToday);
      return {
        day: labels.day,
        date: labels.date,
        sales: round2(row.sales),
        profit: canViewProfit ? round2(row.profit) : 0,
        orders: row.orders,
        isToday,
      };
    });

    return res.json({
      success: true,
      dashboard: {
        date: today,
        canViewProfit,
        today: {
          salesRevenue: round2(todayRow.sales),
          grossProfit: canViewProfit ? round2(todayRow.profit) : 0,
          expenses: canViewProfit ? round2(todayRow.expenses) : 0,
          netProfit: canViewProfit
            ? round2(todayRow.profit - todayRow.expenses)
            : 0,
          invoices: todayRow.orders,
          customerTotalDues: round2(customerTotalDues),
        },
        trend,
      },
    });
  } catch (error) {
    console.error("Dashboard summary failed:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load dashboard.",
    });
  }
});

export default router;
