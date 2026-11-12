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

function mapCustomer(id: string, data: Record<string, any>) {
  const last =
    data.lastTransactionAt?.toDate?.()?.toISOString?.() ||
    data.lastTransactionAt ||
    data.updatedAt?.toDate?.()?.toISOString?.() ||
    "";

  return {
    id,
    name: data.name || "",
    phone: data.phone || "",
    address: data.address || undefined,
    totalPurchased: Number(data.totalPurchased) || 0,
    totalPaid: Number(data.totalPaid) || 0,
    currentDue: Number(data.currentDue) || 0,
    lastTransactionDate: last,
  };
}

function mapCollection(id: string, data: Record<string, any>) {
  const date =
    data.createdAt?.toDate?.()?.toISOString?.() ||
    data.createdAt ||
    new Date().toISOString();

  return {
    id,
    customerId: data.customerId,
    customerName: data.customerName,
    amount: Number(data.amount) || 0,
    date,
    paymentMethod: data.paymentMethod,
    note: data.note || undefined,
    collectedBy: data.collectedBy || "",
    previousDue: Number(data.previousDue) || 0,
    remainingDue: Number(data.remainingDue) || 0,
  };
}

router.use(verifyUser);

router.get("/", requirePermission("customers", "view"), async (_req, res) => {
  try {
    const snapshot = await adminDb
      .collection("customers")
      .where("shopId", "==", shopId())
      .where("active", "==", true)
      .get();

    const customers = snapshot.docs
      .map((docSnap) => mapCustomer(docSnap.id, docSnap.data()))
      .sort((a, b) => a.name.localeCompare(b.name, "bn"));

    return res.json({ success: true, customers });
  } catch (error) {
    console.error("List customers failed:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load customers.",
    });
  }
});

router.get(
  "/:id/collections",
  requirePermission("customers", "view"),
  async (req, res) => {
    try {
      const { id } = req.params;

      const snapshot = await adminDb
        .collection("dueCollections")
        .where("shopId", "==", shopId())
        .where("customerId", "==", id)
        .orderBy("createdAt", "desc")
        .limit(50)
        .get();

      const collections = snapshot.docs.map((docSnap) =>
        mapCollection(docSnap.id, docSnap.data()),
      );

      return res.json({ success: true, collections });
    } catch (error) {
      console.error("List collections failed:", error);
      return res.status(500).json({
        success: false,
        message:
          "Unable to load due collections. Create the Firestore index if prompted.",
      });
    }
  },
);

router.post("/", requirePermission("customers", "manage"), async (req, res) => {
  try {
    const body = req.body || {};
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const address =
      typeof body.address === "string" ? body.address.trim() : "";
    const initialDue = Number(body.initialDue) || 0;

    if (!name || name.length > 120) {
      return res.status(400).json({
        success: false,
        message: "Valid customer name is required.",
      });
    }

    if (!phone || phone.length > 30) {
      return res.status(400).json({
        success: false,
        message: "Valid phone number is required.",
      });
    }

    if (!Number.isFinite(initialDue) || initialDue < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid initial due amount.",
      });
    }

    const docRef = adminDb.collection("customers").doc();
    const payload = {
      shopId: shopId(),
      name,
      phone,
      address: address || null,
      totalPurchased: initialDue,
      totalPaid: 0,
      currentDue: initialDue,
      active: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      lastTransactionAt: FieldValue.serverTimestamp(),
    };

    await docRef.set(payload);

    return res.status(201).json({
      success: true,
      message: "Customer created successfully.",
      customer: mapCustomer(docRef.id, {
        ...payload,
        lastTransactionAt: new Date(),
      }),
    });
  } catch (error) {
    console.error("Create customer failed:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to create customer.",
    });
  }
});

/** Collect due — not counted as new sales revenue. */
router.post(
  "/:id/collect-due",
  requirePermission("customers", "manage"),
  async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id } = req.params;
      const body = req.body || {};
      const amount = Number(body.amount);
      const paymentMethod = body.paymentMethod;
      const note =
        typeof body.note === "string" ? body.note.trim().slice(0, 300) : "";

      if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Valid collection amount is required.",
        });
      }

      if (!(PAYMENT_METHODS as readonly string[]).includes(paymentMethod)) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment method.",
        });
      }

      const customerRef = adminDb.collection("customers").doc(id);
      const collectionRef = adminDb.collection("dueCollections").doc();

      const result = await adminDb.runTransaction(async (tx) => {
        const snap = await tx.get(customerRef);

        if (!snap.exists || snap.data()?.shopId !== shopId()) {
          throw Object.assign(new Error("Customer not found."), { status: 404 });
        }

        const data = snap.data() || {};
        if (data.active === false) {
          throw Object.assign(new Error("Customer is inactive."), {
            status: 400,
          });
        }

        const previousDue = Number(data.currentDue) || 0;
        if (amount > previousDue) {
          throw Object.assign(
            new Error(`Collection exceeds current due (৳${previousDue}).`),
            { status: 400 },
          );
        }

        const remainingDue = previousDue - amount;
        const totalPaid = (Number(data.totalPaid) || 0) + amount;

        tx.update(customerRef, {
          currentDue: remainingDue,
          totalPaid,
          updatedAt: FieldValue.serverTimestamp(),
          lastTransactionAt: FieldValue.serverTimestamp(),
        });

        const collectedBy =
          authReq.user?.displayName ||
          authReq.user?.email ||
          (authReq.user?.role === "owner" ? "Owner" : "Employee");

        const collectionDoc = {
          shopId: shopId(),
          customerId: id,
          customerName: data.name || "",
          amount,
          paymentMethod,
          note: note || null,
          collectedBy,
          collectedByUid: authReq.user?.uid,
          previousDue,
          remainingDue,
          createdAt: FieldValue.serverTimestamp(),
        };

        tx.set(collectionRef, collectionDoc);

        return {
          collectionDoc,
          customer: {
            ...data,
            currentDue: remainingDue,
            totalPaid,
            lastTransactionAt: new Date(),
          },
        };
      });

      return res.status(201).json({
        success: true,
        message: "Due collected successfully.",
        collection: mapCollection(collectionRef.id, {
          ...result.collectionDoc,
          createdAt: new Date(),
        }),
        customer: mapCustomer(id, result.customer),
      });
    } catch (error: any) {
      console.error("Collect due failed:", error);
      return res.status(error?.status || 500).json({
        success: false,
        message: error?.message || "Unable to collect due.",
      });
    }
  },
);

export default router;
