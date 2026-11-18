import { randomUUID } from "node:crypto";
import { Router, type Response } from "express";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./firebaseAdmin.js";
import {
  verifyOwner,
  type AuthenticatedRequest,
} from "./authMiddleware.js";

const router = Router();
type Plan = "basic" | "pro";
type BillingCycle = "monthly" | "yearly";

interface PlanOption {
  plan: Plan;
  cycle: BillingCycle;
  amount: number;
  currency: "BDT";
  available: boolean;
}

interface ValidatedTransaction {
  status?: string;
  tran_id?: string;
  val_id?: string;
  amount?: string | number;
  currency?: string;
  currency_type?: string;
  risk_level?: string | number;
}

function getGatewayConfig() {
  const storeId = process.env.SSLCOMMERZ_STORE_ID?.trim();
  const storePassword = process.env.SSLCOMMERZ_STORE_PASSWD?.trim();
  const isSandbox =
    (process.env.SSLCOMMERZ_IS_SANDBOX || "true").toLowerCase() !== "false";

  return {
    storeId,
    storePassword,
    isSandbox,
    baseUrl: isSandbox
      ? "https://sandbox.sslcommerz.com"
      : "https://securepay.sslcommerz.com",
  };
}

function configuredPrice(plan: Plan, cycle: BillingCycle): number | null {
  const envKey =
    `SSLCOMMERZ_${plan.toUpperCase()}_${cycle.toUpperCase()}_PRICE_BDT`;
  const raw = process.env[envKey]?.trim();
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

function isPlan(value: unknown): value is Plan {
  return value === "basic" || value === "pro";
}

function isBillingCycle(value: unknown): value is BillingCycle {
  return value === "monthly" || value === "yearly";
}

function normalizePublicUrl(envKey: string): string {
  const raw = process.env[envKey]?.trim();
  if (!raw) throw new Error(`${envKey} is not configured`);
  const parsed = new URL(raw);
  const isLocalhost =
    parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  if (parsed.protocol !== "https:" && !(isLocalhost && parsed.protocol === "http:")) {
    throw new Error(`${envKey} must use HTTPS outside localhost`);
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error(`${envKey} must be a base URL without credentials or query`);
  }
  return parsed.toString().replace(/\/$/, "");
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

function safeRedirectUrl(status: "success" | "failed" | "cancelled" | "review") {
  return `${normalizePublicUrl("APP_PUBLIC_URL")}/?subscription=${status}`;
}

function replyToGateway(res: Response, status: "success" | "failed" | "cancelled" | "review") {
  try {
    return res.redirect(303, safeRedirectUrl(status));
  } catch {
    return res.status(503).send("Payment return URL is not configured.");
  }
}

async function validateWithGateway(valId: string): Promise<ValidatedTransaction> {
  const config = getGatewayConfig();
  if (!config.storeId || !config.storePassword) {
    throw new Error("SSLCommerz credentials are not configured");
  }

  const url = new URL("/validator/api/validationserverAPI.php", config.baseUrl);
  url.searchParams.set("val_id", valId);
  url.searchParams.set("store_id", config.storeId);
  url.searchParams.set("store_passwd", config.storePassword);
  url.searchParams.set("v", "1");
  url.searchParams.set("format", "json");

  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error("SSLCommerz validation request failed");
  return (await response.json()) as ValidatedTransaction;
}

async function markUnpaidTransaction(tranId: string, status: "failed" | "cancelled") {
  if (!/^[A-Z0-9]{10,30}$/.test(tranId)) return;
  const ref = adminDb.collection("subscriptionPayments").doc(tranId);
  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (
      !snap.exists ||
      !["initiating", "pending"].includes(String(snap.data()?.status))
    ) {
      return;
    }
    tx.update(ref, {
      status,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

async function confirmPayment(tranId: string, valId: string) {
  if (!/^[A-Z0-9]{10,30}$/.test(tranId) || !valId || valId.length > 80) {
    return { outcome: "invalid" as const };
  }

  const paymentRef = adminDb.collection("subscriptionPayments").doc(tranId);
  const paymentSnap = await paymentRef.get();
  if (!paymentSnap.exists) return { outcome: "invalid" as const };
  const payment = paymentSnap.data() || {};

  if (payment.status === "paid") return { outcome: "success" as const };

  const validated = await validateWithGateway(valId);
  if (
    (validated.status !== "VALID" && validated.status !== "VALIDATED") ||
    validated.tran_id !== tranId
  ) {
    return { outcome: "invalid" as const };
  }

  const confirmedAmount = Number(validated.amount);
  const amountMatches =
    Number.isFinite(confirmedAmount) &&
    Math.round(confirmedAmount * 100) === Math.round(Number(payment.amount) * 100);
  const currency = validated.currency || validated.currency_type;
  if (!amountMatches || currency !== "BDT") return { outcome: "invalid" as const };

  if (String(validated.risk_level) === "1") {
    await paymentRef.set(
      {
        status: "review_required",
        valId,
        riskLevel: 1,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return { outcome: "review" as const };
  }

  if (!isPlan(payment.plan) || !isBillingCycle(payment.billingCycle)) {
    return { outcome: "invalid" as const };
  }

  const shopRef = adminDb.collection("shops").doc(String(payment.shopId || ""));
  const outcome = await adminDb.runTransaction(async (tx) => {
    const [currentPayment, shopSnap] = await Promise.all([
      tx.get(paymentRef),
      tx.get(shopRef),
    ]);
    if (!currentPayment.exists || !shopSnap.exists) {
      return "invalid" as const;
    }
    if (currentPayment.data()?.status === "paid") {
      return "success" as const;
    }
    const shop = shopSnap.data() || {};
    if (
      shop.ownerUid !== payment.ownerUid ||
      !Number.isFinite(Number(payment.amount))
    ) {
      return "invalid" as const;
    }

    const now = new Date();
    const existingEnd = asDate(shop.subscriptionEndsAt);
    const startsAt =
      existingEnd && existingEnd.getTime() > now.getTime() ? existingEnd : now;
    const endsAt = addBillingCycle(startsAt, payment.billingCycle);

    tx.update(shopRef, {
      plan: payment.plan,
      status: "active",
      subscriptionEndsAt: endsAt,
      trialEndsAt: FieldValue.delete(),
      lastPaymentId: tranId,
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.update(paymentRef, {
      status: "paid",
      valId,
      riskLevel: 0,
      paidAt: FieldValue.serverTimestamp(),
      subscriptionStartsAt: startsAt,
      subscriptionEndsAt: endsAt,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return "success" as const;
  });

  return { outcome };
}

async function handleSuccess(req: AuthenticatedRequest, res: Response, isIpn = false) {
  const body = req.body || {};
  const tranId = typeof body.tran_id === "string" ? body.tran_id : "";
  const valId = typeof body.val_id === "string" ? body.val_id : "";

  try {
    const { outcome } = await confirmPayment(tranId, valId);
    if (outcome === "success") {
      return isIpn ? res.status(200).send("OK") : replyToGateway(res, "success");
    }
    if (outcome === "review") {
      return isIpn ? res.status(200).send("REVIEW") : replyToGateway(res, "review");
    }
    return isIpn
      ? res.status(400).send("Invalid payment")
      : replyToGateway(res, "failed");
  } catch (error) {
    console.error(
      "Subscription payment validation failed:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return isIpn
      ? res.status(503).send("Retry")
      : replyToGateway(res, "failed");
  }
}

router.get("/plans", (_req, res) => {
  const config = getGatewayConfig();
  const credentialsAvailable = Boolean(config.storeId && config.storePassword);
  const urlsAvailable = Boolean(
    process.env.API_PUBLIC_URL?.trim() && process.env.APP_PUBLIC_URL?.trim(),
  );
  return res.json({
    success: true,
    plans: getPlanOptions().map((option) => ({
      ...option,
      available: option.available && credentialsAvailable && urlsAvailable,
    })),
  });
});

router.post("/sslcommerz/success", (req, res) =>
  handleSuccess(req as AuthenticatedRequest, res),
);
router.post("/sslcommerz/ipn", (req, res) =>
  handleSuccess(req as AuthenticatedRequest, res, true),
);
router.post("/sslcommerz/fail", async (req, res) => {
  const tranId = typeof req.body?.tran_id === "string" ? req.body.tran_id : "";
  try {
    await markUnpaidTransaction(tranId, "failed");
  } catch (error) {
    console.error("Failed to update failed payment:", error);
  }
  return replyToGateway(res, "failed");
});
router.post("/sslcommerz/cancel", async (req, res) => {
  const tranId = typeof req.body?.tran_id === "string" ? req.body.tran_id : "";
  try {
    await markUnpaidTransaction(tranId, "cancelled");
  } catch (error) {
    console.error("Failed to update cancelled payment:", error);
  }
  return replyToGateway(res, "cancelled");
});

router.post("/checkout", verifyOwner, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const plan = req.body?.plan;
  const cycle = req.body?.cycle;
  if (!isPlan(plan) || !isBillingCycle(cycle)) {
    return res.status(400).json({
      success: false,
      message: "সঠিক plan ও billing cycle নির্বাচন করুন।",
    });
  }

  const amount = configuredPrice(plan, cycle);
  const config = getGatewayConfig();
  if (
    !amount ||
    !config.storeId ||
    !config.storePassword ||
    !process.env.API_PUBLIC_URL ||
    !process.env.APP_PUBLIC_URL
  ) {
    return res.status(503).json({
      success: false,
      message: "অনলাইন পেমেন্ট চালু নেই। অ্যাডমিনের সাথে যোগাযোগ করুন।",
    });
  }

  const phone =
    typeof req.body?.phone === "string" ? req.body.phone.trim() : "";
  const address =
    typeof req.body?.address === "string" ? req.body.address.trim() : "";
  const city = typeof req.body?.city === "string" ? req.body.city.trim() : "";
  const postcode =
    typeof req.body?.postcode === "string" ? req.body.postcode.trim() : "";
  if (!phone || !address || !city || !postcode) {
    return res.status(400).json({
      success: false,
      message: "পেমেন্টের জন্য ফোন, ঠিকানা, শহর ও পোস্টকোড দিন।",
    });
  }

  try {
    const shopId = user.shopId;
    if (!shopId) {
      return res.status(403).json({
        success: false,
        message: "এই অ্যাকাউন্টের সাথে দোকান যুক্ত নেই।",
      });
    }
    const shopRef = adminDb.collection("shops").doc(shopId);
    const shopSnap = await shopRef.get();
    if (!shopSnap.exists || shopSnap.data()?.ownerUid !== user.uid) {
      return res.status(403).json({
        success: false,
        message: "দোকানের সাবস্ক্রিপশন মালিকের অ্যাকাউন্ট থেকেই চালু করতে হবে।",
      });
    }

    const apiUrl = normalizePublicUrl("API_PUBLIC_URL");
    const tranId = `SM${Date.now().toString(36).toUpperCase()}${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
    const paymentRef = adminDb
      .collection("subscriptionPayments")
      .doc(tranId);
    await paymentRef.set({
      tranId,
      shopId,
      ownerUid: user.uid,
      plan,
      billingCycle: cycle,
      amount,
      currency: "BDT",
      provider: "sslcommerz",
      status: "initiating",
      createdAt: FieldValue.serverTimestamp(),
    });

    const form = new URLSearchParams({
      store_id: config.storeId!,
      store_passwd: config.storePassword!,
      total_amount: amount.toFixed(2),
      currency: "BDT",
      tran_id: tranId,
      success_url: `${apiUrl}/api/subscriptions/sslcommerz/success`,
      fail_url: `${apiUrl}/api/subscriptions/sslcommerz/fail`,
      cancel_url: `${apiUrl}/api/subscriptions/sslcommerz/cancel`,
      ipn_url: `${apiUrl}/api/subscriptions/sslcommerz/ipn`,
      cus_name: (user.displayName || user.email || "Shop owner").slice(0, 60),
      cus_email: (user.email || "").slice(0, 80),
      cus_phone: phone.slice(0, 20),
      cus_add1: address.slice(0, 50),
      cus_city: city.slice(0, 50),
      cus_postcode: postcode.slice(0, 10),
      cus_country: "Bangladesh",
      shipping_method: "NO",
      num_of_item: "1",
      product_name: `Smart Mudi ${plan} ${cycle} subscription`,
      product_category: "Software",
      product_profile: "non-physical-goods",
    });

    const response = await fetch(
      `${config.baseUrl}/gwprocess/v4/api.php`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form,
        signal: AbortSignal.timeout(20_000),
      },
    );
    if (!response.ok) throw new Error("SSLCommerz session request failed");
    const session = (await response.json()) as {
      status?: string;
      sessionkey?: string;
      GatewayPageURL?: string;
    };
    const paymentUrl = session.GatewayPageURL
      ? new URL(session.GatewayPageURL)
      : null;
    if (
      session.status !== "SUCCESS" ||
      !session.sessionkey ||
      !paymentUrl ||
      paymentUrl.protocol !== "https:" ||
      paymentUrl.hostname !==
        (config.isSandbox ? "sandbox.sslcommerz.com" : "securepay.sslcommerz.com")
    ) {
      await paymentRef.update({
        status: "initiation_failed",
        updatedAt: FieldValue.serverTimestamp(),
      });
      return res.status(502).json({
        success: false,
        message: "পেমেন্ট সেশন তৈরি হয়নি। পরে আবার চেষ্টা করুন।",
      });
    }

    await paymentRef.update({
      status: "pending",
      sessionKey: session.sessionkey,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return res.json({
      success: true,
      paymentUrl: paymentUrl.toString(),
    });
  } catch (error) {
    console.error(
      "Subscription checkout failed:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return res.status(502).json({
      success: false,
      message: "পেমেন্ট চালু করা যায়নি। একটু পরে আবার চেষ্টা করুন।",
    });
  }
});

export default router;
