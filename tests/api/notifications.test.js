// =======================================================================
// PUSH NOTIFICATION HANDLER (Story 1)
// The route handler is the security boundary. These tests prove it holds.
// =======================================================================

import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { POST } from "../../app/api/notifications/route";
import { adminAuth, adminDb } from "../../lib/firebase/admin";
import { ROLES } from "../../lib/contract";

const AUTH_HOST = "http://127.0.0.1:9099";

const MANAGER = { email: "manager.push@almanar.test", password: "test1234" };
const TRAINER = { email: "trainer.push@almanar.test", password: "test1234" };

let managerToken;
let trainerToken;
let trainerUid;

async function clearAuth() {
  const { users } = await adminAuth.listUsers(1000);
  if (users.length) {
    await adminAuth.deleteUsers(users.map((u) => u.uid));
  }
}

async function seedUser({ email, password }, role) {
  const record = await adminAuth.createUser({ email, password });
  await adminAuth.setCustomUserClaims(record.uid, { role });
  return record.uid;
}

async function idTokenFor({ email, password }) {
  const res = await fetch(
    `${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  return (await res.json()).idToken;
}

function post(body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return POST(
    new Request("http://localhost/api/notifications", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    })
  );
}

beforeEach(async () => {
  await clearAuth();
  await seedUser(MANAGER, ROLES.MANAGER);
  trainerUid = await seedUser(TRAINER, ROLES.TRAINER);
  managerToken = await idTokenFor(MANAGER);
  trainerToken = await idTokenFor(TRAINER);
});

afterAll(async () => {
  await clearAuth();
});

describe("push notification handler boundary", () => {
  it("refuses a trainer and returns 403", async () => {
    const res = await post(
      { trainerId: trainerUid, status: "approved" },
      trainerToken
    );
    expect(res.status).toBe(403);
  });

  it.each([
    ["no header", undefined],
    ["not a jwt", "not-a-token"],
  ])("refuses %s with 401", async (_label, token) => {
    const res = await post(
      { trainerId: trainerUid, status: "approved" },
      token
    );
    expect(res.status).toBe(401);
  });

  // AC 5: The manager's flow must not break if the trainer has no token registered.
  it("returns 200 success gracefully if the trainer has no token registered", async () => {
    // We intentionally don't set an fcmToken on the trainer's Firestore document
    const res = await post(
      { trainerId: trainerUid, status: "approved" },
      managerToken
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.message).toMatch(/no token/i);
  });
});
