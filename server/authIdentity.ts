export type AuthRole = "owner" | "employee";

export interface FirestoreAuthIdentity {
  role: AuthRole;
  shopId?: string;
}

/**
 * Firestore is the authority for account role and tenant binding. Custom claims
 * are accepted when absent for older tokens, but may not contradict the profile.
 */
export function authClaimsMatchProfile(
  profile: FirestoreAuthIdentity,
  claims: Record<string, unknown>,
): boolean {
  if (claims.role !== undefined && claims.role !== profile.role) return false;

  if (claims.shopId !== undefined) {
    if (typeof claims.shopId !== "string" || !claims.shopId.trim()) return false;
    if (claims.shopId.trim() !== profile.shopId?.trim()) return false;
  }

  return true;
}

