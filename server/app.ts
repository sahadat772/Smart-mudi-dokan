import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { adminAuth, adminDb } from "./firebaseAdmin.js";
import staffRoutes from "./staffRoutes.js";
import authRoutes from "./authRoutes.js";
import productRoutes from "./productRoutes.js";
import saleRoutes from "./saleRoutes.js";
import customerRoutes from "./customerRoutes.js";
import purchaseRoutes from "./purchaseRoutes.js";
import expenseRoutes from "./expenseRoutes.js";
import cashRoutes from "./cashRoutes.js";
import reportRoutes from "./reportRoutes.js";
import settingsRoutes from "./settingsRoutes.js";
import dashboardRoutes from "./dashboardRoutes.js";
import shopRoutes from "./shopRoutes.js";
import assistantRoutes from "./assistantRoutes.js";
import { enforceActiveSubscription } from "./subscriptionMiddleware.js";
import subscriptionRoutes from "./subscriptionRoutes.js";
import { captureCashEventTime } from "./cashEventTime.js";

if (process.env.NODE_ENV === "development") {
  dotenv.config({ path: "server/.env" });
}

function isAllowedOrigin(origin?: string) {
  const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;

  try {
    const host = new URL(origin).hostname;
    return (
      host === "smart-mudi-dokan.vercel.app" ||
      (host.endsWith(".vercel.app") && host.startsWith("smart-mudi-dokan-"))
    );
  } catch {
    return false;
  }
}

/** Create the production API app without binding a network port. */
export function createApp(options: { cashEventClock?: () => Date } = {}) {
  const app = express();
  app.locals.cashEventClock = options.cashEventClock;
  app.use(
    cors({
      origin(origin, callback) {
        callback(null, isAllowedOrigin(origin));
      },
    }),
  );
  app.use("/api", (req, _res, next) => {
    captureCashEventTime(req);
    next();
  });
  app.use(express.json());
  app.use(express.urlencoded({ extended: false, limit: "16kb" }));
  app.use("/api", enforceActiveSubscription);
  app.use("/api/auth", authRoutes);
  app.use("/api/shops", shopRoutes);
  app.use("/api/assistant", assistantRoutes);
  app.use("/api/subscriptions", subscriptionRoutes);
  app.use("/api/staff", staffRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/sales", saleRoutes);
  app.use("/api/customers", customerRoutes);
  app.use("/api/purchases", purchaseRoutes);
  app.use("/api/expenses", expenseRoutes);
  app.use("/api/cash", cashRoutes);
  app.use("/api/reports", reportRoutes);
  app.use("/api/settings", settingsRoutes);
  app.use("/api/dashboard", dashboardRoutes);

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

  return app;
}

