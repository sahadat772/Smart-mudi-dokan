import type { AuthenticatedRequest } from "./authMiddleware.js";

/**
 * Resolve the active shop for an authenticated request.
 * Prefer JWT / user profile shopId; fall back to SHOP_ID for legacy single-tenant.
 */
export function resolveShopId(req: AuthenticatedRequest): string {
  const fromUser = req.user?.shopId?.trim();
  if (fromUser) return fromUser;

  const fromEnv = process.env.SHOP_ID?.trim();
  if (fromEnv) return fromEnv;

  return "default";
}

export type ShopPlan = "trial" | "basic" | "pro";

export type ShopStatus = "active" | "suspended" | "cancelled";

export interface ShopRecord {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  ownerUid: string;
  plan: ShopPlan;
  status: ShopStatus;
  trialEndsAt?: FirebaseFirestore.Timestamp | Date | null;
  createdAt?: unknown;
}
