import { initializeApp, cert, getApps, type AppOptions } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: "server/.env" });

function adminCredential() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (raw) {
    return cert(JSON.parse(raw));
  }

  const serviceAccountPath = path.resolve(process.cwd(), "serviceAccountKey.json");
  if (!fs.existsSync(serviceAccountPath)) {
    throw new Error(
      "Firebase Admin credential missing. Set FIREBASE_SERVICE_ACCOUNT or add gitignored serviceAccountKey.json.",
    );
  }

  return cert(serviceAccountPath);
}

const databaseId =
  process.env.FIRESTORE_DATABASE_ID ||
  "ai-studio-96cf70ad-76e2-4b50-86a6-02248977631a";

const options: AppOptions = {
  credential: adminCredential(),
  projectId: process.env.FIREBASE_PROJECT_ID,
};

const app = getApps().length > 0 ? getApps()[0] : initializeApp(options);

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app, databaseId);
