import { Router } from "express";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "./firebaseAdmin.js";
import { verifyOwner, verifyUser } from "./authMiddleware.js";

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

const shopId = () => process.env.SHOP_ID || "default";

function formatLastLogin(value: unknown): string {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toLocaleString();
  }
  return "Never";
}

/** List all employees for this shop (Admin SDK — not client Firestore). */
router.get("/", verifyOwner, async (_req, res) => {
  try {
    const snapshot = await adminDb
      .collection("users")
      .where("role", "==", "employee")
      .get();

    const employees = snapshot.docs
      .map((docSnap) => {
        const data = docSnap.data();
        return {
          uid: docSnap.id,
          name: data.displayName || "Unnamed Employee",
          email: data.email || "",
          jobRole: data.jobRole || "custom",
          active: data.active === true,
          mustChangePassword: data.mustChangePassword === true,
          shopId: data.shopId || shopId(),
          permissions: data.permissions || emptyPermissions(),
          lastLoginAt: formatLastLogin(data.lastLoginAt),
        };
      })
      .filter((emp) => emp.shopId === shopId());

    return res.json({
      success: true,
      employees,
    });
  } catch (error) {
    console.error("Staff list failed:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load staff list.",
    });
  }
});

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

    await adminAuth.setCustomUserClaims(employee.uid, {
      role: "employee",
      shopId: shopId(),
    });

    await adminDb.collection("users").doc(employee.uid).set({
      uid: employee.uid,
      email: normalizedEmail,
      displayName,
      role: "employee",
      jobRole: role,
      shopId: shopId(),
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

/** Activate or deactivate an employee. Deactivate disables Auth + revokes tokens. */
router.patch("/:uid/status", verifyOwner, async (req, res) => {
  try {
    const { uid } = req.params;
    const { active } = req.body;

    if (typeof active !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "active must be a boolean.",
      });
    }

    if (process.env.OWNER_UID && uid === process.env.OWNER_UID) {
      return res.status(400).json({
        success: false,
        message: "Cannot change status of the owner account.",
      });
    }

    const userRef = adminDb.collection("users").doc(uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists || userSnap.data()?.role !== "employee") {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    await adminAuth.updateUser(uid, { disabled: !active });

    if (!active) {
      await adminAuth.revokeRefreshTokens(uid);
    }

    await userRef.update({
      active,
      statusUpdatedAt: FieldValue.serverTimestamp(),
    });

    return res.json({
      success: true,
      message: active
        ? "Employee activated successfully."
        : "Employee deactivated. Existing sessions will be rejected.",
      active,
    });
  } catch (error) {
    console.error("Staff status update failed:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update employee status.",
    });
  }
});

/** Update employee permissions. */
router.patch("/:uid/permissions", verifyOwner, async (req, res) => {
  try {
    const { uid } = req.params;
    const { permissions, jobRole } = req.body;

    const validated = validatePermissions(permissions);

    if (!validated) {
      return res.status(400).json({
        success: false,
        message: "Invalid permission configuration.",
      });
    }

    const userRef = adminDb.collection("users").doc(uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists || userSnap.data()?.role !== "employee") {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    const update: Record<string, unknown> = {
      permissions: validated,
      permissionsUpdatedAt: FieldValue.serverTimestamp(),
    };

    if (typeof jobRole === "string") {
      update.jobRole = jobRole;
    }

    await userRef.update(update);

    return res.json({
      success: true,
      message: "Permissions updated successfully.",
      permissions: validated,
    });
  } catch (error) {
    console.error("Staff permissions update failed:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update permissions.",
    });
  }
});

router.post("/complete-first-login", verifyUser, async (req, res) => {
  try {
    const uid = req.user!.uid;
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

    await adminAuth.updateUser(uid, {
      password: newPassword,
    });

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
