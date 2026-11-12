import { Router } from "express";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./firebaseAdmin.js";
import {
  verifyUser,
  requirePermission,
  type AuthenticatedRequest,
} from "./authMiddleware.js";

const router = Router();

const CATEGORIES = [
  "চাল ও ডাল",
  "তেল ও ঘি",
  "মসলা ও গুঁড়া",
  "বিস্কুট ও স্ন্যাক্স",
  "চা, কফি ও পানীয়",
  "সাবান ও প্রসাধন",
  "দুগ্ধজাত পণ্য ও ডিম",
  "পরিষ্কারক সামগ্রী",
  "অন্যান্য",
] as const;

const UNITS = [
  "কেজি",
  "গ্রাম",
  "লিটার",
  "মিলি",
  "প্যাকেট",
  "পিস",
  "ডজন",
  "বস্তা",
  "কার্টুন",
] as const;

const shopId = () => process.env.SHOP_ID || "default";

function toProduct(
  id: string,
  data: FirebaseFirestore.DocumentData,
  includeCost: boolean,
) {
  const updatedAt =
    data.updatedAt?.toDate?.()?.toISOString?.() ||
    data.updatedAt ||
    new Date().toISOString();

  return {
    id,
    name: data.name || "",
    category: data.category || "অন্যান্য",
    unit: data.unit || "পিস",
    sku: data.sku || "",
    barcode: data.barcode || undefined,
    costPrice: includeCost ? Number(data.costPrice) || 0 : undefined,
    sellingPrice: Number(data.sellingPrice) || 0,
    stockQuantity: Number(data.stockQuantity) || 0,
    lowStockThreshold: Number(data.lowStockThreshold) || 0,
    shelfLocation: data.shelfLocation || undefined,
    active: data.active !== false,
    updatedAt,
  };
}

function parseProductBody(body: Record<string, unknown>, isUpdate: boolean) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const category = body.category;
  const unit = body.unit;
  const sku = typeof body.sku === "string" ? body.sku.trim() : "";
  const barcode =
    typeof body.barcode === "string" ? body.barcode.trim() : undefined;

  const costPrice = Number(body.costPrice);
  const sellingPrice = Number(body.sellingPrice);
  const stockQuantity = Number(body.stockQuantity);
  const lowStockThreshold = Number(body.lowStockThreshold);
  const shelfLocation =
    typeof body.shelfLocation === "string"
      ? body.shelfLocation.trim()
      : undefined;

  if (!name || name.length > 200) {
    return { error: "Valid product name is required." };
  }

  if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
    return { error: "Invalid product category." };
  }

  if (!UNITS.includes(unit as (typeof UNITS)[number])) {
    return { error: "Invalid product unit." };
  }

  if (!sku || sku.length > 64) {
    return { error: "Valid SKU is required." };
  }

  if (!Number.isFinite(costPrice) || costPrice < 0) {
    return { error: "Valid cost price is required." };
  }

  if (!Number.isFinite(sellingPrice) || sellingPrice < 0) {
    return { error: "Valid selling price is required." };
  }

  if (!Number.isFinite(stockQuantity) || stockQuantity < 0) {
    return { error: "Valid stock quantity is required." };
  }

  if (!Number.isFinite(lowStockThreshold) || lowStockThreshold < 0) {
    return { error: "Valid low-stock threshold is required." };
  }

  return {
    data: {
      name,
      category,
      unit,
      sku,
      barcode: barcode || null,
      costPrice,
      sellingPrice,
      stockQuantity,
      lowStockThreshold,
      shelfLocation: shelfLocation || null,
      ...(isUpdate ? {} : { active: true, shopId: shopId() }),
    },
  };
}

router.use(verifyUser);

/** List products for this shop. Cost price only for owners. */
router.get("/", requirePermission("products", "view"), async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const includeCost = authReq.user?.role === "owner";

    const snapshot = await adminDb
      .collection("products")
      .where("shopId", "==", shopId())
      .where("active", "==", true)
      .get();

    const products = snapshot.docs
      .map((docSnap) => toProduct(docSnap.id, docSnap.data(), includeCost))
      .sort((a, b) => a.name.localeCompare(b.name, "bn"));

    return res.json({ success: true, products });
  } catch (error) {
    console.error("List products failed:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load products.",
    });
  }
});

/** Create product. */
router.post("/", requirePermission("products", "manage"), async (req, res) => {
  try {
    const parsed = parseProductBody(req.body || {}, false);
    if (parsed.error || !parsed.data) {
      return res.status(400).json({ success: false, message: parsed.error });
    }

    // Unique SKU per shop
    const existingSku = await adminDb
      .collection("products")
      .where("shopId", "==", shopId())
      .where("sku", "==", parsed.data.sku)
      .limit(1)
      .get();

    if (!existingSku.empty) {
      return res.status(409).json({
        success: false,
        message: "A product with this SKU already exists.",
      });
    }

    const docRef = adminDb.collection("products").doc();
    const payload = {
      ...parsed.data,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await docRef.set(payload);

    const authReq = req as AuthenticatedRequest;
    return res.status(201).json({
      success: true,
      message: "Product created successfully.",
      product: toProduct(
        docRef.id,
        { ...parsed.data, updatedAt: new Date() },
        authReq.user?.role === "owner",
      ),
    });
  } catch (error) {
    console.error("Create product failed:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to create product.",
    });
  }
});

/** Update product. */
router.put(
  "/:id",
  requirePermission("products", "manage"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const parsed = parseProductBody(req.body || {}, true);

      if (parsed.error || !parsed.data) {
        return res.status(400).json({ success: false, message: parsed.error });
      }

      const docRef = adminDb.collection("products").doc(id);
      const snap = await docRef.get();

      if (!snap.exists || snap.data()?.shopId !== shopId()) {
        return res.status(404).json({
          success: false,
          message: "Product not found.",
        });
      }

      // SKU uniqueness if changed
      if (parsed.data.sku !== snap.data()?.sku) {
        const existingSku = await adminDb
          .collection("products")
          .where("shopId", "==", shopId())
          .where("sku", "==", parsed.data.sku)
          .limit(1)
          .get();

        if (!existingSku.empty && existingSku.docs[0].id !== id) {
          return res.status(409).json({
            success: false,
            message: "A product with this SKU already exists.",
          });
        }
      }

      await docRef.update({
        ...parsed.data,
        updatedAt: FieldValue.serverTimestamp(),
      });

      const authReq = req as AuthenticatedRequest;
      return res.json({
        success: true,
        message: "Product updated successfully.",
        product: toProduct(
          id,
          { ...snap.data(), ...parsed.data, updatedAt: new Date() },
          authReq.user?.role === "owner",
        ),
      });
    } catch (error) {
      console.error("Update product failed:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to update product.",
      });
    }
  },
);

/** Soft-delete product. */
router.delete(
  "/:id",
  requirePermission("products", "manage"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const docRef = adminDb.collection("products").doc(id);
      const snap = await docRef.get();

      if (!snap.exists || snap.data()?.shopId !== shopId()) {
        return res.status(404).json({
          success: false,
          message: "Product not found.",
        });
      }

      await docRef.update({
        active: false,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return res.json({
        success: true,
        message: "Product deleted successfully.",
      });
    } catch (error) {
      console.error("Delete product failed:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to delete product.",
      });
    }
  },
);

/** Optional: seed demo products once for empty shop (owner only). */
router.post(
  "/seed-demo",
  requirePermission("products", "manage"),
  async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      if (authReq.user?.role !== "owner") {
        return res.status(403).json({
          success: false,
          message: "Only the owner can seed demo products.",
        });
      }

      const existing = await adminDb
        .collection("products")
        .where("shopId", "==", shopId())
        .limit(1)
        .get();

      if (!existing.empty) {
        return res.status(409).json({
          success: false,
          message: "Products already exist for this shop.",
        });
      }

      const demos = [
        {
          name: "মিনিকেট চাল (প্রিমিয়াম)",
          category: "চাল ও ডাল",
          unit: "কেজি",
          sku: "RICE-MINI-01",
          barcode: "8901234001",
          costPrice: 72,
          sellingPrice: 80,
          stockQuantity: 120,
          lowStockThreshold: 30,
          shelfLocation: "বস্তা কর্নার A-1",
        },
        {
          name: "রূপচাঁদা সয়াবিন তেল (৫ লিটার)",
          category: "তেল ও ঘি",
          unit: "পিস",
          sku: "OIL-RUP-5L",
          barcode: "8901234004",
          costPrice: 810,
          sellingPrice: 850,
          stockQuantity: 8,
          lowStockThreshold: 10,
          shelfLocation: "শেলফ C-1",
        },
        {
          name: "তীর প্যাকেট চিনি (১ কেজি)",
          category: "অন্যান্য",
          unit: "প্যাকেট",
          sku: "SUGAR-TEER-1K",
          barcode: "8901234006",
          costPrice: 130,
          sellingPrice: 140,
          stockQuantity: 5,
          lowStockThreshold: 15,
          shelfLocation: "শেলফ B-1",
        },
        {
          name: "দেশি মসুর ডাল (চিকন)",
          category: "চাল ও ডাল",
          unit: "কেজি",
          sku: "DAL-MOSUR-01",
          barcode: "8901234003",
          costPrice: 125,
          sellingPrice: 140,
          stockQuantity: 28,
          lowStockThreshold: 15,
          shelfLocation: "শেলফ B-3",
        },
        {
          name: "ফার্মের লাল ডিম (১ হালি)",
          category: "দুগ্ধজাত পণ্য ও ডিম",
          unit: "পিস",
          sku: "EGG-FARM-4P",
          barcode: "8901234008",
          costPrice: 48,
          sellingPrice: 55,
          stockQuantity: 60,
          lowStockThreshold: 20,
          shelfLocation: "ডিমের খাঁচি",
        },
      ];

      const batch = adminDb.batch();
      for (const item of demos) {
        const ref = adminDb.collection("products").doc();
        batch.set(ref, {
          ...item,
          shopId: shopId(),
          active: true,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
      await batch.commit();

      return res.status(201).json({
        success: true,
        message: `Seeded ${demos.length} demo products.`,
      });
    } catch (error) {
      console.error("Seed products failed:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to seed demo products.",
      });
    }
  },
);

export default router;
