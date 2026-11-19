import type { AuthenticatedRequest } from "./authMiddleware.js";

/** Resolve only the shop bound to a membership-validated authenticated principal. */
export function resolveShopId(req: AuthenticatedRequest): string {
  const fromUser = req.user?.shopId?.trim();
  if (fromUser) return fromUser;

  throw new Error("Authenticated user is not linked to a shop.");
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

