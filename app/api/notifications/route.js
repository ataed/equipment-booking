import { NextResponse } from "next/server";
import {
  adminAuth,
  adminDb,
  adminMessaging,
} from "../../../lib/firebase/admin";
import { ROLES } from "../../../lib/contract";

export async function POST(request) {
  // 1. SECURITY BOUNDARY
  // Any failure here MUST return a 401 or 403.
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
  }

  const token = authHeader.split("Bearer ")[1];
  let caller;

  try {
    caller = await adminAuth.verifyIdToken(token);
  } catch (err) {
    // If the token is fake or expired, boot them out immediately.
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  if (caller.role !== ROLES.MANAGER) {
    return NextResponse.json(
      { error: "Manager role required" },
      { status: 403 }
    );
  }

  // 2. PUSH NOTIFICATION LOGIC
  // Any failure here returns 200 (AC 5) so we don't break the manager's UI.
  try {
    const { trainerId, status } = await request.json();

    const trainerSnap = await adminDb.collection("users").doc(trainerId).get();
    const fcmToken = trainerSnap.data()?.fcmToken;

    if (!fcmToken) {
      return NextResponse.json(
        { success: true, message: "No token registered" },
        { status: 200 }
      );
    }

    await adminMessaging.send({
      token: fcmToken,
      notification: {
        title: "Booking Update",
        body: `Your equipment booking was ${status}.`,
      },
      data: {
        click_action: "/bookings",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Push notification failed:", error);
    // Return 200 so the client doesn't crash over a bad push token
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 200 }
    );
  }
}
