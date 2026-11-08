import { Router } from "express";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "./firebaseAdmin.js";
import { verifyOwner } from "./authMiddleware.js";

const router = Router();

const modules = [
  "dashboard",
  "pos",
  "products",
  "customers",
  "purchases",
  "expenses",
  "cash",
  "reports",
  "staff",
  "settings",
] as const;

type ModuleKey = (typeof modules)[number];

type Permission = {
  view: boolean;
  manage: boolean;
};

type PermissionSet = Record<ModuleKey, Permission>;

const emptyPermissions = (): PermissionSet => ({
  dashboard: { view: false, manage: false },
  pos: { view: false, manage: false },
  products: { view: false, manage: false },
  customers: { view: false, manage: false },
  purchases: { view: false, manage: false },
  expenses: { view: false, manage: false },
  cash: { view: false, manage: false },
  reports: { view: false, manage: false },
  staff: { view: false, manage: false },
  settings: { view: false, manage: false },
});

const roleDefaults: Record<string, PermissionSet> = {
  manager: {
    ...emptyPermissions(),
    dashboard: { view: true, manage: false },
    pos: { view: true, manage: true },
    products: { view: true, manage: true },
    customers: { view: true, manage: true },
    purchases: { view: true, manage: true },
    expenses: { view: true, manage: true },
    cash: { view: true, manage: true },
    reports: { view: true, manage: false },
    staff: { view: true, manage: false },
  },

  cashier: {
    ...emptyPermissions(),
    dashboard: { view: true, manage: false },
    pos: { view: true, manage: true },
    products: { view: true, manage: false },
    customers: { view: true, manage: true },
    cash: { view: true, manage: false },
  },

  sales_staff: {
    ...emptyPermissions(),
    dashboard: { view: true, manage: false },
    pos: { view: true, manage: true },
    products: { view: true, manage: false },
    customers: { view: true, manage: true },
  },

  inventory_staff: {
    ...emptyPermissions(),
    dashboard: { view: true, manage: false },
    products: { view: true, manage: true },
    purchases: { view: true, manage: true },
  },
};

function validatePermissions(value: unknown): PermissionSet | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const input = value as Record<string, unknown>;

  if (!modules.every((module) => module in input)) {
    return null;
  }

  const result = emptyPermissions();

  for (const module of modules) {
    const item = input[module];

    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return null;
    }

    const permission = item as Record<string, unknown>;

    if (
      typeof permission.view !== "boolean" ||
      typeof permission.manage !== "boolean"
    ) {
      return null;
    }

    result[module] = {
      view: permission.view || permission.manage,
      manage: permission.manage,
    };
  }

  return result;
}

router.post("/", verifyOwner, async (req, res) => {
  let createdUid: string | null = null;

  try {
    const { name, email, password, role, permissions } = req.body;

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof role !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, email, password and role are required.",
      });
    }

    const displayName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!displayName || displayName.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid employee name.",
      });
    }

    if (password.length < 8 || password.length > 128) {
      return res.status(400).json({
        success: false,
        message: "Password must be between 8 and 128 characters.",
      });
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (normalizedEmail.length > 254 || !emailPattern.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    const allowedRoles = [
      "manager",
      "cashier",
      "sales_staff",
      "inventory_staff",
      "custom",
    ];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid employee role.",
      });
    }

    let finalPermissions: PermissionSet;

    if (permissions !== undefined) {
      const validated = validatePermissions(permissions);

      if (!validated) {
        return res.status(400).json({
          success: false,
          message: "Invalid permission configuration.",
        });
      }

      finalPermissions = validated;
    } else if (role !== "custom") {
      finalPermissions = roleDefaults[role];
    } else {
      return res.status(400).json({
        success: false,
        message: "Custom role requires permissions.",
      });
    }

    const employee = await adminAuth.createUser({
      email: normalizedEmail,
      password,
      displayName,
      emailVerified: false,
      disabled: false,
    });

    createdUid = employee.uid;

    await adminDb.collection("users").doc(employee.uid).set({
      uid: employee.uid,
      email: normalizedEmail,
      displayName,
      role: "employee",
      jobRole: role,
      active: true,
      mustChangePassword: true,
      permissions: finalPermissions,
      createdAt: FieldValue.serverTimestamp(),
      lastLoginAt: null,
    });

    return res.status(201).json({
      success: true,
      message: "Employee account created successfully.",
      employee: {
        uid: employee.uid,
        name: displayName,
        email: normalizedEmail,
        jobRole: role,
        active: true,
        mustChangePassword: true,
        permissions: finalPermissions,
      },
    });
  } catch (error) {
    console.error("Employee creation failed:", error);

    if (createdUid) {
      try {
        await adminDb.collection("users").doc(createdUid).delete();
      } catch (rollbackError) {
        console.error("Firestore rollback failed:", rollbackError);
      }

      try {
        await adminAuth.deleteUser(createdUid);
      } catch (rollbackError) {
        console.error("Auth rollback failed:", rollbackError);
      }
    }

    const errorCode = (error as { code?: string })?.code;

    if (errorCode === "auth/email-already-exists") {
      return res.status(409).json({
        success: false,
        message: "This email address is already registered.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to create employee account.",
    });
  }
});

// Employee: Complete mandatory first-login password change
router.post("/complete-first-login", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is required.",
      });
    }

    const idToken = authHeader.split(" ")[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    const uid = decodedToken.uid;
    const { newPassword } = req.body;

    if (
      typeof newPassword !== "string" ||
      newPassword.length < 8 ||
      newPassword.length > 128
    ) {
      return res.status(400).json({
        success: false,
        message: "Password must be between 8 and 128 characters.",
      });
    }

    const userRef = adminDb.collection("users").doc(uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return res.status(404).json({
        success: false,
        message: "User profile not found.",
      });
    }

    const userData = userSnap.data();

    if (
      userData?.role !== "employee" ||
      userData?.active !== true ||
      userData?.mustChangePassword !== true
    ) {
      return res.status(403).json({
        success: false,
        message: "Password change is not allowed.",
      });
    }

    // Update password through Firebase Admin SDK
    await adminAuth.updateUser(uid, {
      password: newPassword,
    });

    // Update first-login status
    await userRef.update({
      mustChangePassword: false,
      passwordChangedAt: FieldValue.serverTimestamp(),
    });

    return res.status(200).json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    console.error("First login password change failed:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to change password.",
    });
  }
});

export default router;
