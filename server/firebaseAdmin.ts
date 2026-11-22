import {
  applicationDefault,
  getApps,
  initializeApp,
  type AppOptions,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import dotenv from "dotenv";

dotenv.config({ path: "server/.env" });

const EMULATOR_PROJECT_ID = "demo-smart-mudi-security";
const DEFAULT_DATABASE_ID = "(default)";

function assertLoopbackEmulatorHost(
  value: string,
  expectedPort: number,
  label: string,
) {
  let parsed: URL;
  try {
    parsed = new URL(`http://${value}`);
  } catch {
    throw new Error(`${label} must be a valid local emulator host.`);
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, "");
  const isLoopback = ["127.0.0.1", "localhost", "::1"].includes(hostname);
  if (
    !isLoopback ||
    parsed.port !== String(expectedPort) ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error(
      `${label} must point to the local emulator on port ${expectedPort}; remote hosts are not allowed.`,
    );
  }
}

const authEmulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST?.trim() || "";
const firestoreEmulatorHost =
  process.env.FIRESTORE_EMULATOR_HOST?.trim() || "";
const emulatorMode = Boolean(authEmulatorHost || firestoreEmulatorHost);

const projectId = process.env.FIREBASE_PROJECT_ID?.trim();

if (emulatorMode) {
  if (!authEmulatorHost || !firestoreEmulatorHost) {
    throw new Error(
      "Emulator mode requires both FIREBASE_AUTH_EMULATOR_HOST and FIRESTORE_EMULATOR_HOST.",
    );
  }

  if (projectId !== EMULATOR_PROJECT_ID) {
    throw new Error(
      `Emulator mode requires FIREBASE_PROJECT_ID=${EMULATOR_PROJECT_ID}.`,
    );
  }

  assertLoopbackEmulatorHost(authEmulatorHost, 9099, "FIREBASE_AUTH_EMULATOR_HOST");
  assertLoopbackEmulatorHost(firestoreEmulatorHost, 8080, "FIRESTORE_EMULATOR_HOST");

  if (process.env.FIRESTORE_DATABASE_ID?.trim() &&
      process.env.FIRESTORE_DATABASE_ID.trim() !== DEFAULT_DATABASE_ID) {
    throw new Error(
      `Emulator mode only permits Firestore database ${DEFAULT_DATABASE_ID}.`,
    );
  }

  if (
    process.env.FIREBASE_SERVICE_ACCOUNT?.trim() ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()
  ) {
    throw new Error(
      "Production credential environment variables must be unset in Firebase Emulator mode.",
    );
  }
} else {
  if (!projectId) {
    throw new Error("FIREBASE_PROJECT_ID is required outside emulator mode.");
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT?.trim()) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT is not supported. Configure Application Default Credentials instead.",
    );
  }
}

const databaseId = emulatorMode
  ? DEFAULT_DATABASE_ID
  : process.env.FIRESTORE_DATABASE_ID?.trim() ||
    "ai-studio-96cf70ad-76e2-4b50-86a6-02248977631a";

const options: AppOptions = emulatorMode
  ? { projectId: EMULATOR_PROJECT_ID }
  : { credential: applicationDefault(), projectId };

const existingApp = getApps().find((candidate) => candidate.name === "[DEFAULT]");
if (existingApp && existingApp.options.projectId !== options.projectId) {
  throw new Error("An existing Firebase Admin app uses a different project ID.");
}

const app = existingApp || initializeApp(options);

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app, databaseId);
