import { Router } from "express";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./firebaseAdmin.js";
import {
  verifyUser,
  requirePermission,
  type AuthenticatedRequest,
} from "./authMiddleware.js";
import { resolveShopId } from "./shopContext.js";

const router = Router();

const DEFAULTS = {
  shopName: "স্মার্ট মুদি দোকান",
  tagline: "তাজা পণ্য · ন্যায্য দাম",
  proprietorName: "",
  phone: "",
  secondaryPhone: "",
  address: "",
  vatNumber: "",
  receiptFooterMsg: "আবার আসবেন — ধন্যবাদ",
  currencySymbol: "৳",
};

function mapSettings(data: Record<string, any>) {
  return {
    shopName: data.shopName || DEFAULTS.shopName,
    tagline: data.tagline || DEFAULTS.tagline,
    proprietorName: data.proprietorName || "",
    phone: data.phone || "",
    secondaryPhone: data.secondaryPhone || undefined,
    address: data.address || "",
    vatNumber: data.vatNumber || undefined,
    receiptFooterMsg: data.receiptFooterMsg || DEFAULTS.receiptFooterMsg,
    currencySymbol: data.currencySymbol || "৳",
  };
}

router.use(verifyUser);

router.get("/", async (req, res) => {
  try {
    const sid = resolveShopId(req as AuthenticatedRequest);
    const ref = adminDb.collection("shopSettings").doc(sid);
    const snap = await ref.get();

    if (!snap.exists) {
      return res.json({ success: true, settings: mapSettings(DEFAULTS) });
    }

    return res.json({
      success: true,
      settings: mapSettings(snap.data() || {}),
    });
  } catch (error) {
    console.error("Get settings failed:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load settings.",
    });
  }
});

router.put("/", async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    if (authReq.user?.role !== "owner") {
      return res.status(403).json({
        success: false,
        message: "Only owner can update shop settings.",
      });
    }

    const body = req.body || {};
    const sid = resolveShopId(authReq);
    const shopName =
      typeof body.shopName === "string" ? body.shopName.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const address =
      typeof body.address === "string" ? body.address.trim() : "";

    if (!shopName || shopName.length > 120) {
      return res.status(400).json({
        success: false,
        message: "Valid shop name is required.",
      });
    }

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone is required.",
      });
    }

    if (!address) {
      return res.status(400).json({
        success: false,
        message: "Address is required.",
      });
    }

    const payload = {
      shopId: sid,
      shopName,
      tagline:
        typeof body.tagline === "string"
          ? body.tagline.trim().slice(0, 200)
          : DEFAULTS.tagline,
      proprietorName:
        typeof body.proprietorName === "string"
          ? body.proprietorName.trim().slice(0, 120)
          : "",
      phone: phone.slice(0, 30),
      secondaryPhone:
        typeof body.secondaryPhone === "string"
          ? body.secondaryPhone.trim().slice(0, 30) || null
          : null,
      address: address.slice(0, 300),
      vatNumber:
        typeof body.vatNumber === "string"
          ? body.vatNumber.trim().slice(0, 50) || null
          : null,
      receiptFooterMsg:
        typeof body.receiptFooterMsg === "string"
          ? body.receiptFooterMsg.trim().slice(0, 300)
          : DEFAULTS.receiptFooterMsg,
      currencySymbol: "৳",
      updatedAt: FieldValue.serverTimestamp(),
      updatedByUid: authReq.user?.uid,
    };

    const ref = adminDb.collection("shopSettings").doc(sid);
    await ref.set(payload, { merge: true });

    return res.json({
      success: true,
      message: "Settings saved.",
      settings: mapSettings(payload),
    });
  } catch (error) {
    console.error("Update settings failed:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to save settings.",
    });
  }
});

export default router;
