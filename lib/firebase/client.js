// The client SDK, initialised once. This is the browser-side Firebase. It obeys
// Security Rules, unlike lib/firebase/admin.js which bypasses them entirely.
//
// Against the emulator these values are never verified, but getAuth requires an
// apiKey to be present and non-empty regardless. Firestore does not, which is why
// the spike script worked with projectId alone. A deployed app needs the real
// values from the Firebase console, which are not secret: they are visible in any
// browser's network tab, and rules are what protect data.

import { initializeApp, getApps } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApps()[0] : initializeApp(config);

export const auth = getAuth(app);
export const db = getFirestore(app);

const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === "true";

if (useEmulators && !globalThis.__emulatorsConnected) {
  // A flag on globalThis because Next re-executes modules on hot reload and
  // connecting twice throws.
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  globalThis.__emulatorsConnected = true;
}
