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
 * Keep expired/suspended shops read-only. Legacy single-shop installs without
 * a shops/{shopId} record continue to work until they are migrated.
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
    path.startsWith("/auth/");

  if (!WRITE_METHODS.has(req.method) || exempt) return next();

  return verifyUser(req as AuthenticatedRequest, res, async () => {
    try {
      const authReq = req as AuthenticatedRequest;
      const shopId = resolveShopId(authReq);
      const shopSnap = await adminDb.collection("shops").doc(shopId).get();

      // Existing single-tenant shops may not have a shops document yet.
      if (!shopSnap.exists) return next();

      const shop = shopSnap.data() || {};
      const status =
        typeof shop.status === "string" ? shop.status : "active";
      const trialEnd = toDate(shop.trialEndsAt);
      const trialExpired =
        shop.plan === "trial" && (!trialEnd || trialEnd.getTime() <= Date.now());

      if (status !== "active" || trialExpired) {
        return res.status(402).json({
          success: false,
          code: "subscription_required",
          message: trialExpired
            ? "আপনার ট্রায়ালের মেয়াদ শেষ হয়েছে। নতুন পরিবর্তন করতে সাবস্ক্রিপশন চালু করুন।"
            : "এই দোকানের সাবস্ক্রিপশন সক্রিয় নেই। সহায়তার জন্য অ্যাডমিনের সাথে যোগাযোগ করুন।",
          subscription: {
            plan: shop.plan || "trial",
            status,
            trialEndsAt: trialEnd?.toISOString() || null,
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
