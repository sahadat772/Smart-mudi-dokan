import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { adminAuth, adminDb } from "./firebaseAdmin.js";
import staffRoutes from "./staffRoutes.js";
import authRoutes from "./authRoutes.js";
import productRoutes from "./productRoutes.js";
import saleRoutes from "./saleRoutes.js";
import customerRoutes from "./customerRoutes.js";

dotenv.config({ path: "server/.env" });

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
  }),
);

app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/products", productRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/customers", customerRoutes);

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "Smart Mudi Manager Backend is running!",
  });
});

app.get("/api/firebase-health", async (_req, res) => {
  try {
    await adminAuth.listUsers(1);
    await adminDb.collection("users").limit(1).get();

    res.json({
      success: true,
      message: "Firebase Admin SDK connected successfully!",
    });
  } catch (error) {
    console.error("Firebase connection error:", error);

    res.status(500).json({
      success: false,
      message: "Firebase connection failed",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
