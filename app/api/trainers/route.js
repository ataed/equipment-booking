import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "../../../lib/firebase/admin";
import { ROLES } from "../../../lib/contract";

// A bad token is the caller's problem, not the server's. Without this mapping
// every rejected token reports itself as a 500 and criterion 4 fails.
const TOKEN_ERRORS = new Set([
  "auth/id-token-expired",
  "auth/id-token-revoked",
  "auth/invalid-id-token",
  "auth/argument-error",
]);

const INPUT_ERRORS = new Set([
  "auth/invalid-email",
  "auth/invalid-password",
  "auth/invalid-display-name",
]);

export async function POST(request) {
  // Everything below this block runs with the Admin SDK, which bypasses Security
  // Rules. This is the whole boundary for the story.
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing bearer token" },
      { status: 401 }
    );
  }

  let caller;
  try {
    caller = await adminAuth.verifyIdToken(authHeader.slice("Bearer ".length));
  } catch (err) {
    if (TOKEN_ERRORS.has(err.code)) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    console.error("verifyIdToken failed", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  // The role comes from the verified token, not from users/{uid} and not from
  // the body. The claim is already inside the token that was just verified.
  if (caller.role !== ROLES.MANAGER) {
    return NextResponse.json(
      { error: "Manager role required" },
      { status: 403 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body is not JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!name || !email || !password) {
    return NextResponse.json(
      { error: "Name, email and password are required" },
      { status: 400 }
    );
  }

  // Checked here so it comes back as 400 rather than as an Admin SDK throw.
  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 }
    );
  }

  // body.role is never read. A caller asking for manager gets a trainer.
  let userRecord;
  try {
    userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    });
  } catch (err) {
    if (err.code === "auth/email-already-exists") {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      );
    }
    if (INPUT_ERRORS.has(err.code)) {
      return NextResponse.json(
        { error: "Invalid account details" },
        { status: 400 }
      );
    }
    console.error("createUser failed", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  try {
    await adminAuth.setCustomUserClaims(userRecord.uid, {
      role: ROLES.TRAINER,
    });

    // activeBookings must exist. The booking rule reads it, and a rule reading a
    // field that is not there fails, so a trainer created without it is refused
    // on every booking with nothing on screen to explain why.
    await adminDb.collection("users").doc(userRecord.uid).set({
      name,
      email,
      role: ROLES.TRAINER,
      activeBookings: 0,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    // The Auth account exists by now, so the email is taken by something that
    // never finished. Left alone, the manager's retry fails as a duplicate and
    // there is no way to clear it from the app. Undo instead.
    console.error("account setup failed after createUser", err);
    try {
      await adminAuth.deleteUser(userRecord.uid);
    } catch (cleanupErr) {
      // The delete can fail too. Nothing recovers from this.
      console.error(
        "orphan auth account left behind",
        userRecord.uid,
        cleanupErr
      );
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  return NextResponse.json({ uid: userRecord.uid }, { status: 201 });
}
