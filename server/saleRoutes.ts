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

const PAYMENT_METHODS = [
  "নগদ (Cash)",
  "বিকাশ (bKash)",
  "নগদ (Nagad)",
  "ব্যাংক / কার্ড (Bank)",
] as const;

type PaymentMethod = (typeof PAYMENT_METHODS)[number];

function isPaymentMethod(value: unknown): value is PaymentMethod {
  return (
    typeof value === "string" &&
    (PAYMENT_METHODS as readonly string[]).includes(value)
  );
}

function formatInvoiceNo(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const suffix = String(Date.now()).slice(-5);
  return `INV-${y}${m}${d}-${suffix}`;
}

function mapSale(id: string, data: Record<string, any>, includeCost: boolean) {
  const createdAt =
    data.createdAt?.toDate?.()?.toISOString?.() ||
    data.createdAt ||
    new Date().toISOString();

  return {
    id,
    invoiceNo: data.invoiceNo,
    createdAt,
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    customerId: data.customerId || undefined,
    items: (data.items || []).map((item: any) => ({
      product: {
        id: item.productId,
        name: item.productName,
        unit: item.unit,
        sku: item.sku || "",
        category: item.category || "অন্যান্য",
        sellingPrice: item.unitPrice,
        stockQuantity: 0,
        lowStockThreshold: 0,
        costPrice: includeCost ? item.costAtSale : undefined,
        updatedAt: createdAt,
      },
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount || 0,
      total: item.total,
      costAtSale: includeCost ? item.costAtSale : 0,
    })),
    subtotal: data.subtotal,
    discount: data.discount,
    grandTotal: data.grandTotal,
    paidAmount: data.paidAmount,
    dueAmount: data.dueAmount,
    payments: data.payments || [],
    status: data.status || "completed",
    soldBy: data.soldBy,
    cogsTotal: includeCost ? data.cogsTotal : undefined,
    grossProfit: includeCost ? data.grossProfit : undefined,
  };
}

router.use(verifyUser);

router.get("/", requirePermission("pos", "view"), async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const includeCost = authReq.user?.role === "owner";
    const limit = Math.min(Number(req.query.limit) || 30, 100);
    const sid = resolveShopId(authReq);

    const snapshot = await adminDb
      .collection("sales")
      .where("shopId", "==", sid)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    const sales = snapshot.docs.map((docSnap) =>
      mapSale(docSnap.id, docSnap.data(), includeCost),
    );

    return res.json({ success: true, sales });
  } catch (error) {
    console.error("List sales failed:", error);
    return res.status(500).json({
      success: false,
      message:
        "Unable to load sales. If this is a new index error, create the Firestore composite index from the error link.",
    });
  }
});

router.post("/", requirePermission("pos", "manage"), async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const body = req.body || {};
    const sid = resolveShopId(authReq);

    const rawItems = Array.isArray(body.items) ? body.items : [];

    if (rawItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Sale must include at least one item.",
      });
    }

    const discount = Number(body.discount) || 0;

    if (!Number.isFinite(discount) || discount < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid discount.",
      });
    }

    const paidAmountInput = Number(body.paidAmount);

    if (!Number.isFinite(paidAmountInput) || paidAmountInput < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid paid amount.",
      });
    }

    const paymentMethod = body.paymentMethod;

    if (!isPaymentMethod(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method.",
      });
    }

    const requestedCustomerName =
      typeof body.customerName === "string" && body.customerName.trim()
        ? body.customerName.trim()
        : "সাধারণ ক্রেতা";

    const requestedCustomerPhone =
      typeof body.customerPhone === "string" && body.customerPhone.trim()
        ? body.customerPhone.trim()
        : null;

    const customerId =
      typeof body.customerId === "string" && body.customerId.trim()
        ? body.customerId.trim()
        : null;

    const requested: { productId: string; quantity: number }[] = [];

    for (const item of rawItems) {
      const productId =
        typeof item?.productId === "string" ? item.productId.trim() : "";
      const quantity = Number(item?.quantity);

      if (!productId || !Number.isFinite(quantity) || quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: "Each item needs a valid productId and quantity.",
        });
      }

      requested.push({ productId, quantity });
    }

    const qtyByProduct = new Map<string, number>();

    for (const line of requested) {
      qtyByProduct.set(
        line.productId,
        (qtyByProduct.get(line.productId) || 0) + line.quantity,
      );
    }

    const productIds = [...qtyByProduct.keys()];

    const productRefs = productIds.map((id) =>
      adminDb.collection("products").doc(id),
    );

    const customerRef = customerId
      ? adminDb.collection("customers").doc(customerId)
      : null;

    const saleRef = adminDb.collection("sales").doc();
    const includeCost = authReq.user?.role === "owner";

    const result = await adminDb.runTransaction(async (tx) => {
      const productSnaps = await Promise.all(
        productRefs.map((ref) => tx.get(ref)),
      );

      const customerSnap = customerRef ? await tx.get(customerRef) : null;

      let customerName = requestedCustomerName;
      let customerPhone = requestedCustomerPhone;
      let customerData: Record<string, any> | null = null;

      if (customerRef) {
        if (!customerSnap?.exists) {
          throw Object.assign(new Error("Customer not found."), {
            status: 404,
          });
        }

        customerData = customerSnap.data() || {};

        if (customerData.shopId !== sid) {
          throw Object.assign(new Error("Customer not found."), {
            status: 404,
          });
        }

        if (customerData.active === false) {
          throw Object.assign(new Error("Customer is inactive."), {
            status: 400,
          });
        }

        customerName = customerData.name || requestedCustomerName;
        customerPhone = customerData.phone || requestedCustomerPhone;
      }

      const lineItems: Record<string, any>[] = [];
      const stockUpdates: {
        ref: FirebaseFirestore.DocumentReference;
        stockQuantity: number;
      }[] = [];

      let subtotal = 0;
      let cogsTotal = 0;

      for (let i = 0; i < productSnaps.length; i++) {
        const snap = productSnaps[i];
        const productId = productIds[i];
        const qty = qtyByProduct.get(productId) || 0;

        if (!snap.exists) {
          throw Object.assign(new Error(`Product not found: ${productId}`), {
            status: 404,
          });
        }

        const data = snap.data() || {};

        if (data.shopId !== sid || data.active === false) {
          throw Object.assign(new Error(`Product unavailable: ${productId}`), {
            status: 400,
          });
        }

        const stock = Number(data.stockQuantity) || 0;

        if (stock < qty) {
          throw Object.assign(
            new Error(
              `Insufficient stock for ${data.name || productId}. Available: ${stock}`,
            ),
            { status: 409 },
          );
        }

        const unitPrice = Number(data.sellingPrice) || 0;
        const costAtSale = Number(data.costPrice) || 0;
        const lineTotal = unitPrice * qty;

        if (
          !Number.isFinite(unitPrice) ||
          unitPrice < 0 ||
          !Number.isFinite(costAtSale) ||
          costAtSale < 0
        ) {
          throw Object.assign(
            new Error(`Invalid price or cost for ${data.name || productId}.`),
            { status: 400 },
          );
        }

        subtotal += lineTotal;
        cogsTotal += costAtSale * qty;

        lineItems.push({
          productId,
          productName: data.name || "",
          sku: data.sku || "",
          category: data.category || "অন্যান্য",
          unit: data.unit || "পিস",
          quantity: qty,
          unitPrice,
          costAtSale,
          discount: 0,
          total: lineTotal,
        });

        stockUpdates.push({
          ref: productRefs[i],
          stockQuantity: stock - qty,
        });
      }

      if (!Number.isFinite(subtotal) || discount > subtotal) {
        throw Object.assign(
          new Error("Discount cannot exceed the sale subtotal."),
          { status: 400 },
        );
      }

      const grandTotal = subtotal - discount;
      const paidAmount = Math.min(paidAmountInput, grandTotal);
      const dueAmount = grandTotal - paidAmount;
      const grossProfit = grandTotal - cogsTotal;

      if (dueAmount > 0 && !customerRef) {
        throw Object.assign(
          new Error("Select a customer before completing a credit sale."),
          { status: 400 },
        );
      }

      const soldBy =
        authReq.user?.displayName ||
        authReq.user?.email ||
        (authReq.user?.role === "owner" ? "Owner" : "Employee");

      const saleDoc = {
        shopId: sid,
        invoiceNo: formatInvoiceNo(),
        customerName,
        customerPhone,
        customerId,
        items: lineItems,
        subtotal,
        discount,
        grandTotal,
        paidAmount,
        dueAmount,
        payments: [
          {
            method: paymentMethod,
            amount: paidAmount,
          },
        ],
        status: "completed",
        soldBy,
        soldByUid: authReq.user?.uid,
        cogsTotal,
        grossProfit,
        createdAt: FieldValue.serverTimestamp(),
      };

      for (const update of stockUpdates) {
        tx.update(update.ref, {
          stockQuantity: update.stockQuantity,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      tx.set(saleRef, saleDoc);

      if (customerRef && customerData) {
        const previousPurchased = Number(customerData.totalPurchased) || 0;
        const previousPaid = Number(customerData.totalPaid) || 0;
        const previousDue = Number(customerData.currentDue) || 0;

        tx.update(customerRef, {
          totalPurchased: previousPurchased + grandTotal,
          totalPaid: previousPaid + paidAmount,
          currentDue: previousDue + dueAmount,
          updatedAt: FieldValue.serverTimestamp(),
          lastTransactionAt: FieldValue.serverTimestamp(),
        });
      }

      return {
        saleDoc,
        updatedStocks: lineItems.map((item) => ({
          productId: item.productId,
          quantitySold: item.quantity,
        })),
      };
    });

    const updatedProducts: {
      id: string;
      stockQuantity: number;
    }[] = [];

    for (const line of result.updatedStocks) {
      const snap = await adminDb
        .collection("products")
        .doc(line.productId)
        .get();

      if (snap.exists) {
        updatedProducts.push({
          id: line.productId,
          stockQuantity: Number(snap.data()?.stockQuantity) || 0,
        });
      }
    }

    return res.status(201).json({
      success: true,
      message: "Sale completed successfully.",
      sale: mapSale(
        saleRef.id,
        {
          ...result.saleDoc,
          createdAt: new Date(),
        },
        includeCost,
      ),
      updatedProducts,
    });
  } catch (error: any) {
    console.error("Create sale failed:", error);

    return res.status(error?.status || 500).json({
      success: false,
      message: error?.message || "Unable to complete sale.",
    });
  }
});

export default router;
