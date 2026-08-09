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
  apiKey: "demo-api-key",
  authDomain: "almanar-booking-dev.firebaseapp.com",
  projectId: "almanar-booking-dev",
};

const app = getApps().length ? getApps()[0] : initializeApp(config);

export const auth = getAuth(app);
export const db = getFirestore(app);

// Connect to the emulators once. Same hot-reload problem: connecting twice
// throws, so a flag on globalThis survives module re-execution.
if (!globalThis.__emulatorsConnected) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  globalThis.__emulatorsConnected = true;
}