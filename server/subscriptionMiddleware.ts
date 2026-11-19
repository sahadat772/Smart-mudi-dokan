import type { Request, Response, NextFunction } from "express";
import { adminDb } from "./firebaseAdmin.js";
import {
  verifyUser,
  type AuthenticatedRequest,
} from "./authMiddleware.js";
import { resolveShopId } from "./shopContext.js";

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function toDate(value: unknown): Date | null {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date : null;
  }
  if (value && typeof value === "object" && "toDate" in value) {
    const convert = (value as { toDate?: () => unknown }).toDate;
    if (typeof convert === "function") {
      const date = convert.call(value);
      if (date instanceof Date && Number.isFinite(date.getTime())) return date;
    }
  }
  return null;
}

/**
 * Keep expired/suspended shops read-only. verifyUser provisions only the
 * explicitly configured legacy shop before reaching this middleware.
 */
export function enforceActiveSubscription(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const path = req.path.replace(/\/+$/, "") || "/";
  const exempt =
    path === "/shops/register" ||
    path === "/assistant" ||
    path.startsWith("/assistant/") ||
    path === "/auth" ||
    path.startsWith("/auth/") ||
    path === "/subscriptions/manual-payment" ||
    path === "/subscriptions/admin" ||
    path.startsWith("/subscriptions/admin/");

  if (!WRITE_METHODS.has(req.method) || exempt) return next();

  return verifyUser(req as AuthenticatedRequest, res, async () => {
    try {
      const authReq = req as AuthenticatedRequest;
      const shopId = resolveShopId(authReq);
      const shopSnap = await adminDb.collection("shops").doc(shopId).get();

      if (!shopSnap.exists) {
        return res.status(403).json({
          success: false,
          code: "shop_membership_invalid",
          message: "Shop membership could not be verified.",
        });
      }

      const shop = shopSnap.data() || {};
      const status =
        typeof shop.status === "string" ? shop.status : "active";
      const trialEnd = toDate(shop.trialEndsAt);
      const subscriptionEnd = toDate(shop.subscriptionEndsAt);
      const trialExpired =
        shop.plan === "trial" && (!trialEnd || trialEnd.getTime() <= Date.now());
      const paidPlanExpired =
        (shop.plan === "basic" || shop.plan === "pro") &&
        subscriptionEnd !== null &&
        subscriptionEnd.getTime() <= Date.now();

      if (status !== "active" || trialExpired || paidPlanExpired) {
        return res.status(402).json({
          success: false,
          code: "subscription_required",
          message: trialExpired || paidPlanExpired
            ? "সাবস্ক্রিপশনের মেয়াদ শেষ হয়েছে। নতুন পরিবর্তন করতে plan নবায়ন করুন।"
            : "এই দোকানের সাবস্ক্রিপশন সক্রিয় নেই। সহায়তার জন্য অ্যাডমিনের সাথে যোগাযোগ করুন।",
          subscription: {
            plan: shop.plan || "trial",
            status,
            trialEndsAt: trialEnd?.toISOString() || null,
            subscriptionEndsAt: subscriptionEnd?.toISOString() || null,
          },
        });
      }

      return next();
    } catch (error) {
      console.error(
        "Shop subscription verification failed:",
        error instanceof Error ? error.name : "UnknownError",
      );
      return res.status(503).json({
        success: false,
        code: "subscription_check_unavailable",
        message: "সাবস্ক্রিপশন যাচাই করা যাচ্ছে না। একটু পরে আবার চেষ্টা করুন।",
      });
    }
  });
}

