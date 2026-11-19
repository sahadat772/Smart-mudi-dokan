export type ShopMemberRole = "owner" | "employee";

export interface ShopPrincipal {
  uid: string;
  role: ShopMemberRole;
  shopId?: string;
}

export interface ShopMembershipRecord {
  exists: boolean;
  ownerUid?: string;
}

export interface LegacyShopBinding {
  ownerUid?: string;
  shopId?: string;
  enabled?: boolean;
}

export type MembershipDecision =
  | { allowed: true; provisionLegacyShop: boolean }
  | { allowed: false; reason: "missing_shop_id" | "missing_shop" | "owner_mismatch" | "missing_owner_uid" };

/** Check the principal against its Firestore shop record and narrow legacy binding. */
export function checkShopMembership(
  principal: ShopPrincipal,
  shop: ShopMembershipRecord,
  legacy: LegacyShopBinding = {},
): MembershipDecision {
  const shopId = principal.shopId?.trim();
  if (!shopId) return { allowed: false, reason: "missing_shop_id" };

  if (!shop.exists) {
    const exactLegacyShop = Boolean(legacy.shopId && shopId === legacy.shopId);
    if (
      principal.role === "owner" &&
      legacy.ownerUid === principal.uid &&
      exactLegacyShop
    ) {
      return { allowed: true, provisionLegacyShop: true };
    }
    if (principal.role === "employee" && legacy.enabled && exactLegacyShop) {
      return { allowed: true, provisionLegacyShop: true };
    }
    return { allowed: false, reason: "missing_shop" };
  }

  if (!shop.ownerUid?.trim()) {
    return { allowed: false, reason: "missing_owner_uid" };
  }
  if (principal.role === "owner" && shop.ownerUid !== principal.uid) {
    return { allowed: false, reason: "owner_mismatch" };
  }

  return { allowed: true, provisionLegacyShop: false };
}

/** True only for a signed employee already bound to the explicitly configured legacy shop. */
export function canBackfillLegacyEmployee(
  principal: ShopPrincipal,
  claims: Record<string, unknown>,
  legacy: LegacyShopBinding,
): boolean {
  return Boolean(
    principal.role === "employee" &&
      !principal.shopId?.trim() &&
      legacy.enabled === true &&
      legacy.shopId &&
      claims.role === "employee" &&
      claims.shopId === legacy.shopId,
  );
}

