import { Router } from "express";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./firebaseAdmin.js";
import {
  verifyUser,
  requirePermission,
  type AuthenticatedRequest,
} from "./authMiddleware.js";

const router = Router();

const shopId = () => process.env.SHOP_ID || "default";

const PAYMENT_METHODS = [
  "নগদ (Cash)",
  "বিকাশ (bKash)",
  "নগদ (Nagad)",
  "ব্যাংক / কার্ড (Bank)",
] as const;

function mapSupplier(id: string, data: Record<string, any>) {
  const last =
    data.lastPurchaseAt?.toDate?.()?.toISOString?.() ||
    data.lastPurchaseAt ||
    data.updatedAt?.toDate?.()?.toISOString?.() ||
    "";

  return {
    id,
    companyName: data.companyName || "",
    contactPerson: data.contactPerson || "",
    phone: data.phone || "",
    address: data.address || undefined,
    totalSupplied: Number(data.totalSupplied) || 0,
    totalPaid: Number(data.totalPaid) || 0,
    outstandingBalance: Number(data.outstandingBalance) || 0,
    lastPurchaseDate: last,
  };
}

function mapPurchase(id: string, data: Record<string, any>) {
  const date =
    data.createdAt?.toDate?.()?.toISOString?.() ||
    data.createdAt ||
    new Date().toISOString();

  return {
    id,
    invoiceNo: data.invoiceNo,
    supplierId: data.supplierId,
    supplierName: data.supplierName,
    date,
    items: data.items || [],
    totalAmount: Number(data.totalAmount) || 0,
    paidAmount: Number(data.paidAmount) || 0,
    dueAmount: Number(data.dueAmount) || 0,
    paymentMethod: data.paymentMethod,
    receivedBy: data.receivedBy || "",
    status: data.status || "received",
  };
}

router.use(verifyUser);

/** List suppliers */
router.get(
  "/suppliers",
  requirePermission("purchases", "view"),
  async (_req, res) => {
    try {
      const snapshot = await adminDb
        .collection("suppliers")
        .where("shopId", "==", shopId())
        .where("active", "==", true)
        .get();

      const suppliers = snapshot.docs
        .map((d) => mapSupplier(d.id, d.data()))
        .sort((a, b) => a.companyName.localeCompare(b.companyName, "bn"));

      return res.json({ success: true, suppliers });
    } catch (error) {
      console.error("List suppliers failed:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to load suppliers.",
      });
    }
  },
);

/** Create supplier */
router.post(
  "/suppliers",
  requirePermission("purchases", "manage"),
  async (req, res) => {
    try {
      const body = req.body || {};
      const companyName =
        typeof body.companyName === "string" ? body.companyName.trim() : "";
      const contactPerson =
        typeof body.contactPerson === "string"
          ? body.contactPerson.trim()
          : "";
      const phone = typeof body.phone === "string" ? body.phone.trim() : "";
      const address =
        typeof body.address === "string" ? body.address.trim() : "";

      if (!companyName || companyName.length > 150) {
        return res.status(400).json({
          success: false,
          message: "Valid supplier company name is required.",
        });
      }

      if (!phone) {
        return res.status(400).json({
          success: false,
          message: "Phone number is required.",
        });
      }

      const docRef = adminDb.collection("suppliers").doc();
      const payload = {
        shopId: shopId(),
        companyName,
        contactPerson: contactPerson || null,
        phone,
        address: address || null,
        totalSupplied: 0,
        totalPaid: 0,
        outstandingBalance: 0,
        active: true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        lastPurchaseAt: null,
      };

      await docRef.set(payload);

      return res.status(201).json({
        success: true,
        message: "Supplier created successfully.",
        supplier: mapSupplier(docRef.id, {
          ...payload,
          lastPurchaseAt: "",
        }),
      });
    } catch (error) {
      console.error("Create supplier failed:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to create supplier.",
      });
    }
  },
);

/** Pay supplier due — NOT recorded as expense */
router.post(
  "/suppliers/:id/pay",
  requirePermission("purchases", "manage"),
  async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id } = req.params;
      const amount = Number(req.body?.amount);
      const paymentMethod = req.body?.paymentMethod;
      const note =
        typeof req.body?.note === "string"
          ? req.body.note.trim().slice(0, 300)
          : "";

      if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Valid payment amount is required.",
        });
      }

      if (!(PAYMENT_METHODS as readonly string[]).includes(paymentMethod)) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment method.",
        });
      }

      const supplierRef = adminDb.collection("suppliers").doc(id);
      const paymentRef = adminDb.collection("supplierPayments").doc();

      const result = await adminDb.runTransaction(async (tx) => {
        const snap = await tx.get(supplierRef);
        if (!snap.exists || snap.data()?.shopId !== shopId()) {
          throw Object.assign(new Error("Supplier not found."), { status: 404 });
        }

        const data = snap.data() || {};
        const previousDue = Number(data.outstandingBalance) || 0;

        if (amount > previousDue) {
          throw Object.assign(
            new Error(`Payment exceeds outstanding balance (৳${previousDue}).`),
            { status: 400 },
          );
        }

        const remaining = previousDue - amount;
        const totalPaid = (Number(data.totalPaid) || 0) + amount;

        tx.update(supplierRef, {
          outstandingBalance: remaining,
          totalPaid,
          updatedAt: FieldValue.serverTimestamp(),
        });

        const paidBy =
          authReq.user?.displayName ||
          authReq.user?.email ||
          (authReq.user?.role === "owner" ? "Owner" : "Employee");

        const paymentDoc = {
          shopId: shopId(),
          supplierId: id,
          supplierName: data.companyName || "",
          amount,
          paymentMethod,
          note: note || null,
          previousDue,
          remainingDue: remaining,
          paidBy,
          paidByUid: authReq.user?.uid,
          createdAt: FieldValue.serverTimestamp(),
        };

        tx.set(paymentRef, paymentDoc);

        return {
          supplier: {
            ...data,
            outstandingBalance: remaining,
            totalPaid,
          },
          paymentDoc,
        };
      });

      return res.status(201).json({
        success: true,
        message: "Supplier payment recorded (not an expense).",
        supplier: mapSupplier(id, result.supplier),
        payment: {
          id: paymentRef.id,
          ...result.paymentDoc,
          createdAt: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      console.error("Supplier pay failed:", error);
      return res.status(error?.status || 500).json({
        success: false,
        message: error?.message || "Unable to record supplier payment.",
      });
    }
  },
);

/** List purchases */
router.get("/", requirePermission("purchases", "view"), async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 30, 100);
    const supplierId =
      typeof req.query.supplierId === "string" ? req.query.supplierId : null;

    let query = adminDb
      .collection("purchases")
      .where("shopId", "==", shopId())
      .orderBy("createdAt", "desc")
      .limit(limit);

    if (supplierId) {
      query = adminDb
        .collection("purchases")
        .where("shopId", "==", shopId())
        .where("supplierId", "==", supplierId)
        .orderBy("createdAt", "desc")
        .limit(limit);
    }

    const snapshot = await query.get();
    const purchases = snapshot.docs.map((d) => mapPurchase(d.id, d.data()));

    return res.json({ success: true, purchases });
  } catch (error) {
    console.error("List purchases failed:", error);
    return res.status(500).json({
      success: false,
      message:
        "Unable to load purchases. Create Firestore index if the error link appears.",
    });
  }
});

/** Create purchase — increases stock + updates supplier due */
router.post("/", requirePermission("purchases", "manage"), async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const body = req.body || {};

    const invoiceNo =
      typeof body.invoiceNo === "string" && body.invoiceNo.trim()
        ? body.invoiceNo.trim()
        : `CHALAN-${Date.now().toString().slice(-6)}`;

    const supplierId =
      typeof body.supplierId === "string" ? body.supplierId.trim() : "";
    const productId =
      typeof body.productId === "string" ? body.productId.trim() : "";
    const quantity = Number(body.quantity);
    const costPrice = Number(body.costPrice);
    const paidAmount = Number(body.paidAmount) || 0;
    const paymentMethod = body.paymentMethod;

    if (!supplierId) {
      return res.status(400).json({
        success: false,
        message: "Supplier is required.",
      });
    }

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product is required.",
      });
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid quantity is required.",
      });
    }

    if (!Number.isFinite(costPrice) || costPrice < 0) {
      return res.status(400).json({
        success: false,
        message: "Valid cost price is required.",
      });
    }

    if (!Number.isFinite(paidAmount) || paidAmount < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid paid amount.",
      });
    }

    if (!(PAYMENT_METHODS as readonly string[]).includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method.",
      });
    }

    const totalAmount = quantity * costPrice;
    const paid = Math.min(paidAmount, totalAmount);
    const dueAmount = Math.max(0, totalAmount - paid);
    const status =
      dueAmount === 0 ? "received" : paid === 0 ? "due" : "partial";

    const supplierRef = adminDb.collection("suppliers").doc(supplierId);
    const productRef = adminDb.collection("products").doc(productId);
    const purchaseRef = adminDb.collection("purchases").doc();

    const result = await adminDb.runTransaction(async (tx) => {
      const [supplierSnap, productSnap] = await Promise.all([
        tx.get(supplierRef),
        tx.get(productRef),
      ]);

      if (!supplierSnap.exists || supplierSnap.data()?.shopId !== shopId()) {
        throw Object.assign(new Error("Supplier not found."), { status: 404 });
      }

      if (!productSnap.exists || productSnap.data()?.shopId !== shopId()) {
        throw Object.assign(new Error("Product not found."), { status: 404 });
      }

      const supplier = supplierSnap.data() || {};
      const product = productSnap.data() || {};

      if (supplier.active === false || product.active === false) {
        throw Object.assign(new Error("Supplier or product is inactive."), {
          status: 400,
        });
      }

      const newStock = (Number(product.stockQuantity) || 0) + quantity;

      tx.update(productRef, {
        stockQuantity: newStock,
        costPrice,
        updatedAt: FieldValue.serverTimestamp(),
      });

      tx.update(supplierRef, {
        totalSupplied: (Number(supplier.totalSupplied) || 0) + totalAmount,
        totalPaid: (Number(supplier.totalPaid) || 0) + paid,
        outstandingBalance:
          (Number(supplier.outstandingBalance) || 0) + dueAmount,
        lastPurchaseAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      const receivedBy =
        authReq.user?.displayName ||
        authReq.user?.email ||
        (authReq.user?.role === "owner" ? "Owner" : "Employee");

      const purchaseDoc = {
        shopId: shopId(),
        invoiceNo,
        supplierId,
        supplierName: supplier.companyName || "",
        items: [
          {
            productId,
            productName: product.name || "",
            unit: product.unit || "পিস",
            quantity,
            costPrice,
            total: totalAmount,
          },
        ],
        totalAmount,
        paidAmount: paid,
        dueAmount,
        paymentMethod,
        receivedBy,
        receivedByUid: authReq.user?.uid,
        status,
        createdAt: FieldValue.serverTimestamp(),
      };

      tx.set(purchaseRef, purchaseDoc);

      return {
        purchaseDoc,
        productStock: newStock,
        productId,
        productCostPrice: costPrice,
        supplier: {
          ...supplier,
          totalSupplied: (Number(supplier.totalSupplied) || 0) + totalAmount,
          totalPaid: (Number(supplier.totalPaid) || 0) + paid,
          outstandingBalance:
            (Number(supplier.outstandingBalance) || 0) + dueAmount,
          lastPurchaseAt: new Date(),
        },
      };
    });

    return res.status(201).json({
      success: true,
      message: "Purchase recorded and stock updated.",
      purchase: mapPurchase(purchaseRef.id, {
        ...result.purchaseDoc,
        createdAt: new Date(),
      }),
      supplier: mapSupplier(supplierId, result.supplier),
      updatedProduct: {
        id: result.productId,
        stockQuantity: result.productStock,
        costPrice: result.productCostPrice,
      },
    });
  } catch (error: any) {
    console.error("Create purchase failed:", error);
    return res.status(error?.status || 500).json({
      success: false,
      message: error?.message || "Unable to record purchase.",
    });
  }
});

export default router;
