import { Router } from "express";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "./firebaseAdmin.js";
import { verifyUser, type AuthenticatedRequest } from "./authMiddleware.js";
import { resolveShopId, type ShopPlan } from "./shopContext.js";

const router = Router();

function slugifyShopName(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\u0980-\u09ff]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const suffix = Date.now().toString(36).slice(-5);
  return `${base || "shop"}-${suffix}`;
}

/**
 * Public: register a new shop + owner account.
 * Body: { shopName, ownerName, email, password, phone? }
 */
router.post("/register", async (req, res) => {
  try {
    const body = req.body || {};
    const shopName =
      typeof body.shopName === "string" ? body.shopName.trim() : "";
    const ownerName =
      typeof body.ownerName === "string" ? body.ownerName.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";

    if (!shopName || shopName.length < 2) {
      return res.status(400).json({
        success: false,
        message: "দোকানের নাম দিন (কমপক্ষে ২ অক্ষর)।",
      });
    }

    if (!ownerName) {
      return res.status(400).json({
        success: false,
        message: "মালিকের নাম দিন।",
      });
    }

    if (!email || !email.includes("@")) {
      return res.status(400).json({
        success: false,
        message: "সঠিক ইমেইল দিন।",
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে।",
      });
    }

    const shopId = slugifyShopName(shopName);
    const plan: ShopPlan = "trial";
    const trialDays = Number(process.env.TRIAL_DAYS) || 14;
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

    // Create Auth user first so we can roll back if Firestore fails.
    let userRecord;
    try {
      userRecord = await adminAuth.createUser({
        email,
        password,
        displayName: ownerName,
        emailVerified: false,
      });
    } catch (err: any) {
      const code = err?.code || "";
      if (code === "auth/email-already-exists") {
        return res.status(409).json({
          success: false,
          message: "এই ইমেইলে ইতিমধ্যে অ্যাকাউন্ট আছে। লগইন করুন।",
        });
      }
      throw err;
    }

    const uid = userRecord.uid;

    try {
      await adminAuth.setCustomUserClaims(uid, {
        role: "owner",
        shopId,
        active: true,
      });

      const shopRef = adminDb.collection("shops").doc(shopId);
      const userRef = adminDb.collection("users").doc(uid);
      const settingsRef = adminDb.collection("shopSettings").doc(shopId);

      await adminDb.runTransaction(async (tx) => {
        tx.set(shopRef, {
          id: shopId,
          name: shopName,
          phone: phone || null,
          address: null,
          ownerUid: uid,
          plan,
          status: "active",
          trialEndsAt,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });

        tx.set(userRef, {
          uid,
          email,
          displayName: ownerName,
          phone: phone || null,
          role: "owner",
          shopId,
          active: true,
          mustChangePassword: false,
          permissions: {},
          createdAt: FieldValue.serverTimestamp(),
          lastLoginAt: null,
        });

        tx.set(settingsRef, {
          shopId,
          shopName,
          tagline: "স্মার্ট মুদি ম্যানেজার",
          address: "",
          phone: phone || "",
          vatNumber: "",
          receiptFooterMsg: "আবার আসবেন — ধন্যবাদ",
          updatedAt: FieldValue.serverTimestamp(),
        });
      });
    } catch (err) {
      // Best-effort cleanup if profile write fails.
      try {
        await adminAuth.deleteUser(uid);
      } catch {
        /* ignore */
      }
      throw err;
    }

    return res.status(201).json({
      success: true,
      message:
        "দোকান তৈরি হয়েছে। এখন ইমেইল ও পাসওয়ার্ড দিয়ে লগইন করুন।",
      shop: {
        id: shopId,
        name: shopName,
        plan,
        trialEndsAt: trialEndsAt.toISOString(),
      },
      owner: {
        uid,
        email,
        role: "owner",
      },
    });
  } catch (error) {
    console.error("Shop registration failed:", error);
    return res.status(500).json({
      success: false,
      message: "দোকান রেজিস্ট্রেশন সম্পন্ন হয়নি। পরে আবার চেষ্টা করুন।",
    });
  }
});

/** Current user's shop profile. */
router.get("/me", verifyUser, async (req: AuthenticatedRequest, res) => {
  try {
    const shopId = resolveShopId(req);
    const snap = await adminDb.collection("shops").doc(shopId).get();

    if (!snap.exists) {
      // Legacy single-tenant shops may not have a shops/{id} doc yet.
      return res.json({
        success: true,
        shop: {
          id: shopId,
          name: process.env.SHOP_NAME || shopId,
          plan: "basic",
          status: "active",
          legacy: true,
        },
      });
    }

    const data = snap.data() || {};
    return res.json({
      success: true,
      shop: {
        id: snap.id,
        name: data.name,
        phone: data.phone,
        address: data.address,
        plan: data.plan || "trial",
        status: data.status || "active",
        trialEndsAt:
          data.trialEndsAt?.toDate?.()?.toISOString?.() ||
          data.trialEndsAt ||
          null,
        ownerUid: data.ownerUid,
      },
    });
  } catch (error) {
    console.error("Get shop failed:", error);
    return res.status(500).json({
      success: false,
      message: "দোকানের তথ্য লোড করা যায়নি।",
    });
  }
});

export default router;
