import type { AuthenticatedRequest } from "./authMiddleware.js";

/**
 * Resolve the active shop for an authenticated request.
 * Resolve a shop only from the authenticated principal. Legacy records and users
 * must be migrated or explicitly enabled with LEGACY_SINGLE_TENANT_MODE.
 */
export function resolveShopId(req: AuthenticatedRequest): string {
  const fromUser = req.user?.shopId?.trim();
  if (fromUser) return fromUser;

  throw new Error("Authenticated user is not linked to a shop.");
}

/** True only for the explicitly configured legacy owner/shop pair. */
export function isConfiguredLegacyShopOwner(
  req: AuthenticatedRequest,
  shopId: string,
): boolean {
  const ownerUid = process.env.OWNER_UID?.trim();
  const configuredShopId = process.env.SHOP_ID?.trim();
  return Boolean(
    req.user?.role === "owner" &&
      ownerUid &&
      req.user.uid === ownerUid &&
      configuredShopId &&
      shopId === configuredShopId,
  );
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
