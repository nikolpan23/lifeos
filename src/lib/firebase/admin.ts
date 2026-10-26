import "server-only";
import { applicationDefault, cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Admin SDK for the server only. On Firebase App Hosting it uses the backend's
 * built-in service account (Application Default Credentials). Locally, set
 * FIREBASE_SERVICE_ACCOUNT_KEY to the JSON of a service account key, or run
 * `gcloud auth application-default login`.
 */
function projectId(): string | undefined {
  if (process.env.FIREBASE_CONFIG) {
    try {
      return (JSON.parse(process.env.FIREBASE_CONFIG) as { projectId?: string }).projectId;
    } catch {
      // fall through
    }
  }
  return process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || undefined;
}

export function adminConfigured(): boolean {
  return Boolean(projectId());
}

function adminApp(): App {
  if (getApps().length) return getApp();
  // With the Emulator Suite (FIREBASE_AUTH_EMULATOR_HOST / FIRESTORE_EMULATOR_HOST) no credentials are needed.
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST) return initializeApp({ projectId: projectId() });
  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const credential = key ? cert(JSON.parse(key)) : applicationDefault();
  return initializeApp({ credential, projectId: projectId() });
}

export const adminAuth = () => getAuth(adminApp());
export const adminDb = () => getFirestore(adminApp());
