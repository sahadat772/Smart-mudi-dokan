import type { Request, Response, NextFunction } from "express";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "./firebaseAdmin.js";
import { authClaimsMatchProfile } from "./authIdentity.js";
import {
  canBackfillLegacyEmployee,
  checkShopMembership,
} from "./shopMembership.js";

export type ModuleKey =
  | "dashboard"
  | "pos"
  | "products"
  | "customers"
  | "purchases"
  | "expenses"
  | "cash"
  | "reports"
  | "staff"
  | "settings";

export type PermissionAction = "view" | "manage";

export type Permission = {
  view: boolean;
  manage: boolean;
};

export type PermissionSet = Record<ModuleKey, Permission>;

export interface AuthUser {
  uid: string;
  email?: string;
  role: "owner" | "employee";
  shopId?: string;
  active: boolean;
  authTime: number;
  permissions: Partial<PermissionSet>;
  displayName?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

async function loadAuthUser(
  uid: string,
  email: string | undefined,
  authTime: number,
): Promise<AuthUser | null> {
  const userSnap = await adminDb.collection("users").doc(uid).get();

  if (!userSnap.exists) {
    return null;
  }

  const data = userSnap.data() || {};
  const role = data.role;

  if (role !== "owner" && role !== "employee") {
    return null;
  }

  if (data.active !== true) {
    return null;
  }

  return {
    uid,
    email: email || data.email,
    role,
    shopId:
      typeof data.shopId === "string" && data.shopId.trim()
        ? data.shopId.trim()
        : undefined,
    active: true,
    authTime,
    permissions: (data.permissions as Partial<PermissionSet>) || {},
    displayName: data.displayName,
  };
}

/** Verify Firebase ID token and load an active user profile. */
export async function verifyUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is required.",
      });
    }

    const idToken = authHeader.split(" ")[1];

    if (!idToken) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken, true);
    const authUser = await loadAuthUser(
      decodedToken.uid,
      decodedToken.email,
      decodedToken.auth_time,
    );

    if (!authUser) {
      return res.status(403).json({
        success: false,
        message: "Account is inactive or invalid.",
      });
    }

    // Recover a legacy owner binding from a shop record that already names this
    // UID. This does not grant a shop to employees or trust token claims/body.
    if (!authUser.shopId && authUser.role === "owner") {
      const ownedShops = await adminDb
        .collection("shops")
        .where("ownerUid", "==", authUser.uid)
        .limit(2)
        .get();
      if (ownedShops.size === 1) {
        authUser.shopId = ownedShops.docs[0].id;
        try {
          await adminDb.collection("users").doc(authUser.uid).set(
            { shopId: authUser.shopId },
            { merge: true },
          );
        } catch (error) {
          // The authenticated request can still proceed from the verified shop
          // ownership record; a later request can retry the profile backfill.
          console.error("Legacy owner shopId backfill failed:", error);
        }
      }
    }
    // A legacy deployment may not have a shops/{shopId} record yet. Only the
    // explicitly configured owner UID can use this compatibility mapping.
    const configuredShopId = process.env.SHOP_ID?.trim();
    const configuredOwnerUid = process.env.OWNER_UID?.trim();
    if (
      !authUser.shopId &&
      authUser.role === "owner" &&
      configuredShopId &&
      configuredOwnerUid === authUser.uid
    ) {
      authUser.shopId = configuredShopId;
      try {
        await adminDb.collection("users").doc(authUser.uid).set(
          { shopId: configuredShopId },
          { merge: true },
        );
      } catch (error) {
        console.error("Configured legacy shopId backfill failed:", error);
      }
    }

    // Safely migrate an old employee only when the legacy switch is enabled
    // and Firebase's signed claims already bind that employee to this shop.
    if (
      !authUser.shopId &&
      canBackfillLegacyEmployee(authUser, decodedToken, {
        ownerUid: configuredOwnerUid,
        shopId: configuredShopId,
        enabled: process.env.LEGACY_SINGLE_TENANT_MODE === "true",
      })
    ) {
      authUser.shopId = configuredShopId;
      await adminDb.collection("users").doc(authUser.uid).set(
        { shopId: configuredShopId },
        { merge: true },
      );
    }

    // Multi-tenant: every user must be bound to a shop.
    if (!authUser.shopId) {
      return res.status(403).json({
        success: false,
        message: "Shop is not linked to this account.",
      });
    }

    // Profile role and shop association are authoritative. Missing custom
    // claims remain compatible with older sessions; contradictory claims fail
    // closed instead of elevating a role or switching tenant context.
    if (!authClaimsMatchProfile(authUser, decodedToken)) {
      return res.status(403).json({
        success: false,
        message: "Account access information is inconsistent. Sign in again or contact support.",
      });
    }

    const shopRef = adminDb.collection("shops").doc(authUser.shopId);
    let shopSnap = await shopRef.get();
    let membership = checkShopMembership(
      authUser,
      { exists: shopSnap.exists, ownerUid: shopSnap.data()?.ownerUid },
      {
        ownerUid: configuredOwnerUid,
        shopId: configuredShopId,
        enabled: process.env.LEGACY_SINGLE_TENANT_MODE === "true",
      },
    );

    if (membership.allowed && membership.provisionLegacyShop) {
      // The only implicit migration is the exact configured legacy binding.
      // This creates the missing tenant record before any protected route runs.
      const legacyOwnerUid =
        authUser.role === "owner" ? authUser.uid : configuredOwnerUid;
      if (!legacyOwnerUid) {
        return res.status(403).json({
          success: false,
          message: "Shop membership could not be verified.",
        });
      }
      await adminDb.runTransaction(async (tx) => {
        const current = await tx.get(shopRef);
        if (!current.exists) {
          tx.create(shopRef, {
            id: authUser.shopId,
            name: process.env.SHOP_NAME?.trim() || authUser.shopId,
            phone: null,
            address: null,
            ownerUid: legacyOwnerUid,
            plan: "basic",
            status: "active",
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      });
      shopSnap = await shopRef.get();
      membership = checkShopMembership(
        authUser,
        { exists: shopSnap.exists, ownerUid: shopSnap.data()?.ownerUid },
      );
    }

    if (!membership.allowed) {
      return res.status(403).json({
        success: false,
        message: "Shop membership could not be verified.",
      });
    }

    req.user = authUser;
    next();
  } catch (error) {
    console.error("User verification failed:", error);

    return res.status(401).json({
      success: false,
      message: "Authentication failed.",
    });
  }
}

/** Require shop owner (any shop owner in multi-tenant mode). */
export async function verifyOwner(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  return verifyUser(req, res, () => {
    if (req.user?.role !== "owner") {
      return res.status(403).json({
        success: false,
        message: "Only the shop owner can perform this action.",
      });
    }

    // Legacy single-tenant lock — only when STRICT_OWNER_UID=true
    if (
      process.env.STRICT_OWNER_UID === "true" &&
      process.env.OWNER_UID &&
      req.user.uid !== process.env.OWNER_UID
    ) {
      return res.status(403).json({
        success: false,
        message: "Only the shop owner can perform this action.",
      });
    }

    next();
  });
}

/** Require module permission for employees; owners always pass. */
export function requirePermission(
  module: ModuleKey,
  action: PermissionAction = "view",
) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (user.role === "owner") {
      return next();
    }

    const permission = user.permissions?.[module];
    const allowed =
      action === "manage"
        ? permission?.manage === true
        : permission?.view === true || permission?.manage === true;

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission for this action.",
      });
    }

    next();
  };
}

