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

const EXPENSE_CATEGORIES = [
  "দোকান ভাড়া",
  "বিদ্যুৎ বিল",
  "কর্মচারীর বেতন",
  "মালামাল পরিবহন",
  "দোকান রক্ষণাবেক্ষণ",
  "চা ও আপ্যায়ন",
  "প্যাকেজিং ও ব্যাগ",
  "অন্যান্য খরচ",
] as const;

const PAYMENT_METHODS = [
  "নগদ (Cash)",
  "বিকাশ (bKash)",
  "নগদ (Nagad)",
  "ব্যাংক / কার্ড (Bank)",
] as const;

function mapExpense(id: string, data: Record<string, any>) {
  const date =
    data.expenseDate ||
    data.createdAt?.toDate?.()?.toISOString?.()?.slice(0, 10) ||
    data.createdAt ||
    "";

  return {
    id,
    category: data.category,
    title: data.title || "",
    amount: Number(data.amount) || 0,
    date,
    paymentMethod: data.paymentMethod,
    note: data.note || undefined,
    recordedBy: data.recordedBy || "",
  };
}

router.use(verifyUser);

router.get("/", requirePermission("expenses", "view"), async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 200);
    const category =
      typeof req.query.category === "string" ? req.query.category : null;

    let query = adminDb
      .collection("expenses")
      .where("shopId", "==", shopId())
      .orderBy("createdAt", "desc")
      .limit(limit);

    if (category && category !== "all") {
      query = adminDb
        .collection("expenses")
        .where("shopId", "==", shopId())
        .where("category", "==", category)
        .orderBy("createdAt", "desc")
        .limit(limit);
    }

    const snapshot = await query.get();
    const expenses = snapshot.docs.map((d) => mapExpense(d.id, d.data()));

    return res.json({ success: true, expenses });
  } catch (error) {
    console.error("List expenses failed:", error);
    return res.status(500).json({
      success: false,
      message:
        "Unable to load expenses. Create the Firestore composite index if prompted.",
    });
  }
});

router.post("/", requirePermission("expenses", "manage"), async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const body = req.body || {};

    const category = body.category;
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const amount = Number(body.amount);
    const paymentMethod = body.paymentMethod;
    const note =
      typeof body.note === "string" ? body.note.trim().slice(0, 300) : "";
    const expenseDate =
      typeof body.date === "string" && body.date.trim()
        ? body.date.trim().slice(0, 10)
        : new Date().toISOString().slice(0, 10);

    if (!(EXPENSE_CATEGORIES as readonly string[]).includes(category)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense category.",
      });
    }

    if (!title || title.length > 200) {
      return res.status(400).json({
        success: false,
        message: "Valid expense title is required.",
      });
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid amount is required.",
      });
    }

    if (!(PAYMENT_METHODS as readonly string[]).includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method.",
      });
    }

    const recordedBy =
      authReq.user?.displayName ||
      authReq.user?.email ||
      (authReq.user?.role === "owner" ? "Owner" : "Employee");

    const docRef = adminDb.collection("expenses").doc();
    const payload = {
      shopId: shopId(),
      category,
      title,
      amount,
      expenseDate,
      paymentMethod,
      note: note || null,
      recordedBy,
      recordedByUid: authReq.user?.uid,
      createdAt: FieldValue.serverTimestamp(),
    };

    await docRef.set(payload);

    return res.status(201).json({
      success: true,
      message: "Expense recorded successfully.",
      expense: mapExpense(docRef.id, {
        ...payload,
        createdAt: new Date(),
      }),
    });
  } catch (error) {
    console.error("Create expense failed:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to record expense.",
    });
  }
});

export default router;
