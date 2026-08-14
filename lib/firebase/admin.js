import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === "true";

// Set before initializeApp, because the SDK reads these at init.
// It does not read NEXT_PUBLIC_USE_EMULATORS, that translation happens here.
if (useEmulators) {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
  process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
}

function options() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  // The emulators accept an uncredentialed app. The real project does not, and
  // without this the SDK falls back to Application Default Credentials, which do
  // not exist on Vercel. That failure would arrive as a 500 on the first request
  // rather than as a missing variable, so fail here instead.
  if (useEmulators) return { projectId };

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT is not set and emulators are off"
    );
  }

  return { projectId, credential: cert(JSON.parse(raw)) };
}

const app = getApps().length === 0 ? initializeApp(options()) : getApps()[0];

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
