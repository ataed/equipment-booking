import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === "true";

// Set before initializeApp, because the SDK reads these at init.
// It does not read NEXT_PUBLIC_USE_EMULATORS, that translation happens here.
if (useEmulators) {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
  process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
}

function options() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  // Check for the service account first, so FCM can authenticate with live Google servers
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    try {
      return { projectId, credential: cert(JSON.parse(raw)) };
    } catch (e) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:", e);
    }
  }

  // Fallback to uncredentialed app if emulators are on and no service account is provided
  if (useEmulators) return { projectId };

  throw new Error("FIREBASE_SERVICE_ACCOUNT is not set and emulators are off");
}

const app = getApps().length === 0 ? initializeApp(options()) : getApps()[0];

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
export const adminMessaging = getMessaging();
