import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: "server/.env" });

const serviceAccountPath = path.resolve(
  process.cwd(),
  "serviceAccountKey.json",
);

const app =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        credential: cert(serviceAccountPath),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });

export const adminAuth = getAuth(app);

export const adminDb = getFirestore(
  app,
  "ai-studio-96cf70ad-76e2-4b50-86a6-02248977631a",
);
