import type { Request, Response, NextFunction } from "express";
import { adminAuth, adminDb } from "./firebaseAdmin.js";

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
  mustChangePassword: boolean;
  permissions: Partial<PermissionSet>;
  displayName?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

async function loadAuthUser(uid: string, email?: string): Promise<AuthUser | null> {
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
    shopId: data.shopId || process.env.SHOP_ID || "default",
    active: true,
    mustChangePassword: data.mustChangePassword === true,
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

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const authUser = await loadAuthUser(decodedToken.uid, decodedToken.email);

    if (!authUser) {
      return res.status(403).json({
        success: false,
        message: "Account is inactive or invalid.",
      });
    }

    // Prefer custom claims when present (set at staff creation / owner bootstrap).
    const claimRole = decodedToken.role as string | undefined;
    if (claimRole === "owner" || claimRole === "employee") {
      authUser.role = claimRole;
    }
    if (typeof decodedToken.shopId === "string" && decodedToken.shopId) {
      authUser.shopId = decodedToken.shopId;
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

/** Require shop owner. */
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

    // Optional hard lock to a specific owner UID when configured.
    if (process.env.OWNER_UID && req.user.uid !== process.env.OWNER_UID) {
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

    if (user.mustChangePassword) {
      return res.status(403).json({
        success: false,
        message: "Password change is required before continuing.",
      });
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
