import { getToken } from "firebase/messaging";
import { doc, updateDoc } from "firebase/firestore";
import { messaging, db, auth } from "@/lib/firebase/client";

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export async function registerPushNotifications() {
  if (typeof window === "undefined" || !messaging) return false;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("Notification permission denied.");
      return false;
    }

    // 1. Register the service worker so the browser listens in the background
    let swRegistration = await navigator.serviceWorker.getRegistration();
    if (!swRegistration) {
      swRegistration = await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js"
      );
    }

    // 2. Get the unique FCM token, passing the service worker registration
    const currentToken = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
    });

    if (currentToken && auth.currentUser) {
      // Save token to Firestore
      const userRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userRef, { fcmToken: currentToken });
      console.log("FCM Token saved to Firestore:", currentToken);
      return true;
    }

    return false;
  } catch (error) {
    console.error(
      "An error occurred while retrieving token or registering SW:",
      error
    );
    return false;
  }
}
