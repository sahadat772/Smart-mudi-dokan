import { Router, type NextFunction, type Response } from "express";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./firebaseAdmin.js";
import {
  verifyOwner,
  verifyUser,
  type AuthenticatedRequest,
} from "./authMiddleware.js";

const router = Router();
type Plan = "basic" | "pro";
type BillingCycle = "monthly" | "yearly";
type PaymentMethod = "bkash" | "nagad" | "bank" | "cash";

interface PlanOption {
  plan: Plan;
  cycle: BillingCycle;
  amount: number;
  currency: "BDT";
  available: boolean;
}

function configuredPrice(plan: Plan, cycle: BillingCycle): number | null {
  const currentKey = `SUBSCRIPTION_${plan.toUpperCase()}_${cycle.toUpperCase()}_PRICE_BDT`;
  const raw = process.env[currentKey]?.trim();
  if (!raw) return null;
  const amount = Number(raw);
  return Number.isFinite(amount) && amount > 0
    ? Math.round(amount * 100) / 100
    : null;
}

function getPlanOptions(): PlanOption[] {
  return (["basic", "pro"] as const).flatMap((plan) =>
    (["monthly", "yearly"] as const).map((cycle) => {
      const amount = configuredPrice(plan, cycle);
      return {
        plan,
        cycle,
        amount: amount || 0,
        currency: "BDT" as const,
        available: amount !== null,
      };
    }),
  );
}

function getPaymentMethods() {
  const entries: Array<{
    id: PaymentMethod;
    label: string;
    envKey: string;
  }> = [
    { id: "bkash", label: "বিকাশ", envKey: "MANUAL_PAYMENT_BKASH_INSTRUCTIONS" },
    { id: "nagad", label: "নগদ", envKey: "MANUAL_PAYMENT_NAGAD_INSTRUCTIONS" },
    { id: "bank", label: "ব্যাংক ট্রান্সফার", envKey: "MANUAL_PAYMENT_BANK_INSTRUCTIONS" },
    { id: "cash", label: "নগদ টাকা", envKey: "MANUAL_PAYMENT_CASH_INSTRUCTIONS" },
  ];
  return entries.map(({ id, label, envKey }) => ({
    id,
    label,
    instructions: process.env[envKey]?.trim() || "",
    available: Boolean(process.env[envKey]?.trim()),
  }));
}

function isPlan(value: unknown): value is Plan {
  return value === "basic" || value === "pro";
}

function isBillingCycle(value: unknown): value is BillingCycle {
  return value === "monthly" || value === "yearly";
}

function isPaymentMethod(value: unknown): value is PaymentMethod {
  return value === "bkash" || value === "nagad" || value === "bank" || value === "cash";
}

function addBillingCycle(start: Date, cycle: BillingCycle): Date {
  const months = cycle === "yearly" ? 12 : 1;
  const result = new Date(start);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

function asDate(value: unknown): Date | null {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value;
  if (value && typeof value === "object" && "toDate" in value) {
    const convert = (value as { toDate?: () => unknown }).toDate;
    if (typeof convert === "function") {
      const result = convert.call(value);
      if (result instanceof Date && Number.isFinite(result.getTime())) return result;
    }
  }
  return null;
}

function toIso(value: unknown): string | null {
  return asDate(value)?.toISOString() || null;
}

function requirePlatformAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const allowedUids = (process.env.PLATFORM_ADMIN_UIDS || "")
    .split(",")
    .map((uid) => uid.trim())
    .filter(Boolean);
  if (!req.user || !allowedUids.includes(req.user.uid)) {
    return res.status(403).json({
      success: false,
      message: "Platform admin access is required.",
    });
  }
  return next();
}

function toPaymentResponse(id: string, data: Record<string, any>) {
  return {
    id,
    plan: data.plan,
    billingCycle: data.billingCycle,
    amount: Number(data.amount) || 0,
    currency: data.currency || "BDT",
    paymentMethod: data.paymentMethod,
    paymentReference: data.paymentReference || "",
    payerPhone: data.payerPhone || "",
    status: data.status,
    rejectionReason: data.rejectionReason || "",
    shopId: data.shopId,
    shopName: data.shopName || data.shopId,
    ownerUid: data.ownerUid,
    ownerName: data.ownerName || "",
    ownerEmail: data.ownerEmail || "",
    createdAt: toIso(data.createdAt),
    reviewedAt: toIso(data.reviewedAt),
  };
}

router.get("/plans", (_req, res) => {
  return res.json({
    success: true,
    plans: getPlanOptions(),
    paymentMethods: getPaymentMethods(),
  });
});

/** Submit a manual payment for an owner-configured plan; the amount is server-set. */
router.post("/manual-payment", verifyOwner, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { plan, cycle, method } = req.body || {};
  const paymentReference =
    typeof req.body?.paymentReference === "string"
      ? req.body.paymentReference.trim().slice(0, 120)
      : "";
  const payerPhone =
    typeof req.body?.payerPhone === "string"
      ? req.body.payerPhone.trim().slice(0, 30)
      : "";

  if (!isPlan(plan) || !isBillingCycle(cycle) || !isPaymentMethod(method)) {
    return res.status(400).json({
      success: false,
      message: "সঠিক plan, মেয়াদ ও payment method নির্বাচন করুন।",
    });
  }
  const price = configuredPrice(plan, cycle);
  if (!price) {
    return res.status(503).json({
      success: false,
      message: "এই plan-এর মূল্য এখনো নির্ধারণ করা হয়নি। অ্যাডমিনের সাথে যোগাযোগ করুন।",
    });
  }
  const paymentMethod = getPaymentMethods().find((item) => item.id === method);
  if (!paymentMethod?.available) {
    return res.status(503).json({
      success: false,
      message: "এই payment method-এর নির্দেশনা এখনো দেওয়া হয়নি।",
    });
  }
  if (method !== "cash" && !paymentReference) {
    return res.status(400).json({
      success: false,
      message: "Transaction ID বা payment reference লিখুন।",
    });
  }

  const shopId = user.shopId;
  if (!shopId) {
    return res.status(403).json({
      success: false,
      message: "এই account-এর সাথে shop যুক্ত নেই।",
    });
  }

  try {
    const shopRef = adminDb.collection("shops").doc(shopId);
    const paymentRef = adminDb.collection("subscriptionPayments").doc();
    const submitted = await adminDb.runTransaction(async (tx) => {
      const shopSnap = await tx.get(shopRef);
      if (!shopSnap.exists || shopSnap.data()?.ownerUid !== user.uid) {
        return "not_owner" as const;
      }

      const pendingId = shopSnap.data()?.pendingManualPaymentId;
      if (typeof pendingId === "string" && pendingId) {
        const pendingRef = adminDb.collection("subscriptionPayments").doc(pendingId);
        const pendingSnap = await tx.get(pendingRef);
        if (pendingSnap.exists && pendingSnap.data()?.status === "pending_review") {
          return "already_pending" as const;
        }
      }

      tx.create(paymentRef, {
        shopId,
        shopName: shopSnap.data()?.name || process.env.SHOP_NAME || shopId,
        ownerUid: user.uid,
        ownerName: user.displayName || "",
        ownerEmail: user.email || "",
        plan,
        billingCycle: cycle,
        amount: price,
        currency: "BDT",
        provider: "manual",
        paymentMethod: method,
        paymentReference: paymentReference || (method === "cash" ? "Cash payment" : ""),
        payerPhone,
        status: "pending_review",
        createdAt: FieldValue.serverTimestamp(),
      });
      tx.update(shopRef, {
        pendingManualPaymentId: paymentRef.id,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return "created" as const;
    });

    if (submitted === "not_owner") {
      return res.status(403).json({
        success: false,
        message: "শুধু shop owner payment request করতে পারবেন।",
      });
    }
    if (submitted === "already_pending") {
      return res.status(409).json({
        success: false,
        message: "আপনার একটি payment request admin review-এ আছে।",
      });
    }
    return res.status(201).json({
      success: true,
      requestId: paymentRef.id,
      message: "Payment request জমা হয়েছে। Admin যাচাই করে plan চালু করবেন।",
    });
  } catch (error) {
    console.error(
      "Manual subscription request failed:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return res.status(500).json({
      success: false,
      message: "Payment request জমা হয়নি। পরে আবার চেষ্টা করুন।",
    });
  }
});

router.get("/payments", verifyOwner, async (req: AuthenticatedRequest, res) => {
  try {
    const shopId = req.user!.shopId;
    if (!shopId) return res.status(403).json({ success: false });
    const snapshot = await adminDb
      .collection("subscriptionPayments")
      .where("shopId", "==", shopId)
      .limit(100)
      .get();
    const payments = snapshot.docs
      .map((item) => toPaymentResponse(item.id, item.data()))
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    return res.json({ success: true, payments });
  } catch (error) {
    console.error("Subscription history load failed:", error);
    return res.status(500).json({
      success: false,
      message: "Payment history লোড করা যায়নি।",
    });
  }
});

router.get("/admin/me", verifyUser, requirePlatformAdmin, (_req, res) =>
  res.json({ success: true, isPlatformAdmin: true }),
);

router.get(
  "/admin/manual-payments",
  verifyUser,
  requirePlatformAdmin,
  async (_req, res) => {
    try {
      const snapshot = await adminDb
        .collection("subscriptionPayments")
        .where("status", "==", "pending_review")
        .get();
      const requests = snapshot.docs
        .map((item) => toPaymentResponse(item.id, item.data()))
        .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
      return res.json({ success: true, requests });
    } catch (error) {
      console.error("Pending manual payments load failed:", error);
      return res.status(500).json({
        success: false,
        message: "Pending payment request লোড করা যায়নি।",
      });
    }
  },
);

router.post(
  "/admin/manual-payments/:id/approve",
  verifyUser,
  requirePlatformAdmin,
  async (req: AuthenticatedRequest, res) => {
    const paymentRef = adminDb
      .collection("subscriptionPayments")
      .doc(req.params.id);
    try {
      const outcome = await adminDb.runTransaction(async (tx) => {
        const paymentSnap = await tx.get(paymentRef);
        if (!paymentSnap.exists) return "not_found" as const;
        const payment = paymentSnap.data() || {};
        if (payment.status !== "pending_review") {
          return payment.status === "approved"
            ? ("already_approved" as const)
            : ("not_pending" as const);
        }
        if (!isPlan(payment.plan) || !isBillingCycle(payment.billingCycle)) {
          return "invalid" as const;
        }

        const shopRef = adminDb.collection("shops").doc(String(payment.shopId || ""));
        const shopSnap = await tx.get(shopRef);
        if (
          !shopSnap.exists ||
          shopSnap.data()?.ownerUid !== payment.ownerUid ||
          !Number.isFinite(Number(payment.amount))
        ) {
          return "invalid" as const;
        }

        const now = new Date();
        const existingEnd = asDate(shopSnap.data()?.subscriptionEndsAt);
        const startsAt =
          existingEnd && existingEnd.getTime() > now.getTime() ? existingEnd : now;
        const endsAt = addBillingCycle(startsAt, payment.billingCycle);
        tx.update(shopRef, {
          plan: payment.plan,
          status: "active",
          subscriptionEndsAt: endsAt,
          trialEndsAt: FieldValue.delete(),
          lastPaymentId: paymentRef.id,
          ...(shopSnap.data()?.pendingManualPaymentId === paymentRef.id
            ? { pendingManualPaymentId: FieldValue.delete() }
            : {}),
          updatedAt: FieldValue.serverTimestamp(),
        });
        tx.update(paymentRef, {
          status: "approved",
          reviewedByUid: req.user!.uid,
          reviewedAt: FieldValue.serverTimestamp(),
          subscriptionStartsAt: startsAt,
          subscriptionEndsAt: endsAt,
          updatedAt: FieldValue.serverTimestamp(),
        });
        return "approved" as const;
      });

      if (outcome === "not_found") return res.status(404).json({ success: false });
      if (outcome === "already_approved") return res.json({ success: true, alreadyApproved: true });
      if (outcome !== "approved") {
        return res.status(409).json({
          success: false,
          message: "এই request approve করা যাচ্ছে না। তথ্য যাচাই করুন।",
        });
      }
      return res.json({ success: true, message: "Payment approve হয়েছে; plan চালু হয়েছে।" });
    } catch (error) {
      console.error("Manual payment approval failed:", error);
      return res.status(500).json({ success: false, message: "Payment approve হয়নি।" });
    }
  },
);

router.post(
  "/admin/manual-payments/:id/reject",
  verifyUser,
  requirePlatformAdmin,
  async (req: AuthenticatedRequest, res) => {
    const paymentRef = adminDb
      .collection("subscriptionPayments")
      .doc(req.params.id);
    const reason =
      typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 300) : "";
    try {
      const outcome = await adminDb.runTransaction(async (tx) => {
        const paymentSnap = await tx.get(paymentRef);
        if (!paymentSnap.exists) return "not_found" as const;
        const payment = paymentSnap.data() || {};
        if (payment.status !== "pending_review") return "not_pending" as const;
        const shopRef = adminDb.collection("shops").doc(String(payment.shopId || ""));
        const shopSnap = await tx.get(shopRef);
        if (!shopSnap.exists) return "invalid" as const;
        tx.update(paymentRef, {
          status: "rejected",
          rejectionReason: reason,
          reviewedByUid: req.user!.uid,
          reviewedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        if (shopSnap.data()?.pendingManualPaymentId === paymentRef.id) {
          tx.update(shopRef, {
            pendingManualPaymentId: FieldValue.delete(),
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
        return "rejected" as const;
      });
      if (outcome === "not_found") return res.status(404).json({ success: false });
      if (outcome !== "rejected") {
        return res.status(409).json({ success: false, message: "এই request আর pending নেই।" });
      }
      return res.json({ success: true, message: "Payment request reject করা হয়েছে।" });
    } catch (error) {
      console.error("Manual payment rejection failed:", error);
      return res.status(500).json({ success: false, message: "Payment reject করা যায়নি।" });
    }
  },
);

export default router;

