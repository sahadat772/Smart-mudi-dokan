import { Router } from "express";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "./firebaseAdmin.js";
import { verifyUser, type AuthenticatedRequest } from "./authMiddleware.js";
import { resolveShopId } from "./shopContext.js";

const router = Router();

router.get("/me", verifyUser, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;

  return res.json({
    success: true,
    user: {
      uid: user.uid,
      email: user.email,
      role: user.role,
      shopId: user.shopId,
      displayName: user.displayName,
      active: user.active,
      mustChangePassword: user.mustChangePassword,
      permissions: user.permissions,
    },
  });
});

/**
 * Legacy bootstrap for the first owner on a single-tenant install.
 * Multi-tenant shops should use POST /api/shops/register instead.
 */
router.post("/bootstrap-owner", async (req, res) => {
  try {
    const ownerUid = process.env.OWNER_UID?.trim();

    if (!ownerUid) {
      return res.status(500).json({
        success: false,
        message: "OWNER_UID is not configured on the server.",
      });
    }

    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is required.",
      });
    }

    const idToken = authHeader.split(" ")[1];
    const decoded = await adminAuth.verifyIdToken(idToken);

    if (decoded.uid !== ownerUid) {
      return res.status(403).json({
        success: false,
        message: "Only the configured owner account can run bootstrap.",
      });
    }

    const sid = process.env.SHOP_ID?.trim() || "default";

    await adminAuth.setCustomUserClaims(ownerUid, {
      role: "owner",
      shopId: sid,
    });

    const userRef = adminDb.collection("users").doc(ownerUid);
    const existing = await userRef.get();
    const authUser = await adminAuth.getUser(ownerUid);

    if (!existing.exists) {
      await userRef.set({
        uid: ownerUid,
        email: authUser.email || decoded.email || "",
        displayName: authUser.displayName || "Shop Owner",
        role: "owner",
        shopId: sid,
        active: true,
        mustChangePassword: false,
        permissions: {},
        createdAt: FieldValue.serverTimestamp(),
        lastLoginAt: null,
      });
    } else {
      await userRef.set(
        {
          role: "owner",
          shopId: sid,
          active: true,
          mustChangePassword: false,
          email: authUser.email || existing.data()?.email || "",
          displayName:
            authUser.displayName ||
            existing.data()?.displayName ||
            "Shop Owner",
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    return res.json({
      success: true,
      message:
        "Owner claims and profile are ready. Sign out and sign in once so the new token includes claims.",
      claims: { role: "owner", shopId: sid },
    });
  } catch (error) {
    console.error("Owner bootstrap failed:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to bootstrap owner account.",
    });
  }
});

export default router;
