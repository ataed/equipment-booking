// =======================================================================
// ACCOUNT CREATION HANDLER (Story 0 carry-over)
// The Admin SDK bypasses Security Rules, so there is no rule to test here.
// The route handler is the boundary and these tests are what hold it up.
// =======================================================================

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { POST } from "../../app/api/trainers/route";
import { adminAuth, adminDb } from "../../lib/firebase/admin";
import { ROLES } from "../../lib/contract";

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const AUTH_HOST = "http://127.0.0.1:9099";
const FIRESTORE_HOST = "http://127.0.0.1:8080";

const MANAGER = { email: "manager.test@almanar.test", password: "test1234" };
const TRAINER = { email: "trainer.test@almanar.test", password: "test1234" };

let managerToken;
let trainerToken;

// The Auth emulator keeps accounts until something deletes them. The rules
// suites clear Firestore and never touch Auth, so without this the duplicate
// email test passes once and then fails on every run after it.
async function clearAuth() {
  const { users } = await adminAuth.listUsers(1000);
  if (users.length) {
    await adminAuth.deleteUsers(users.map((u) => u.uid));
  }
}

// testEnv.clearFirestore() is not available here, because these tests use the
// Admin SDK rather than a rules-unit-testing environment.
async function clearFirestore() {
  await fetch(
    `${FIRESTORE_HOST}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: "DELETE" }
  );
}

async function seedUser({ email, password }, role) {
  const record = await adminAuth.createUser({ email, password });
  await adminAuth.setCustomUserClaims(record.uid, { role });
  return record.uid;
}

// The Admin SDK mints custom tokens, not ID tokens, and the handler verifies an
// ID token. So the token has to come from a real sign-in. The emulator accepts
// any api key.
async function idTokenFor({ email, password }) {
  const res = await fetch(
    `${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  const data = await res.json();
  if (!data.idToken) {
    throw new Error(`emulator sign-in failed: ${JSON.stringify(data)}`);
  }
  return data.idToken;
}

function post(body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return POST(
    new Request("http://localhost/api/trainers", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    })
  );
}

async function countUsers() {
  const { users } = await adminAuth.listUsers(1000);
  return users.length;
}

beforeEach(async () => {
  await clearAuth();
  await clearFirestore();
  await seedUser(MANAGER, ROLES.MANAGER);
  await seedUser(TRAINER, ROLES.TRAINER);
  managerToken = await idTokenFor(MANAGER);
  trainerToken = await idTokenFor(TRAINER);
});

afterAll(async () => {
  await clearAuth();
  await clearFirestore();
});

const NEW = {
  name: "Yassine",
  email: "new.trainer@almanar.test",
  password: "test1234",
};

describe("account creation handler", () => {
  // Sanity check first, same reason as the rules suites.
  it("creates the auth account, the claim and the user document", async () => {
    const res = await post(NEW, managerToken);
    expect(res.status).toBe(201);

    const { uid } = await res.json();
    const record = await adminAuth.getUser(uid);
    expect(record.customClaims.role).toBe(ROLES.TRAINER);
    expect(record.email).toBe(NEW.email);

    const snap = await adminDb.collection("users").doc(uid).get();
    expect(snap.exists).toBe(true);
    // activeBookings asserted by value, not by the document existing. The
    // booking rule reads this field and a rule reading a missing field fails.
    expect(snap.data()).toMatchObject({
      name: NEW.name,
      email: NEW.email,
      role: ROLES.TRAINER,
      activeBookings: 0,
    });
  });

  it("refuses a trainer and creates nothing", async () => {
    const before = await countUsers();

    const res = await post(NEW, trainerToken);

    expect(res.status).toBe(403);
    expect(await countUsers()).toBe(before);
    const docs = await adminDb.collection("users").get();
    expect(docs.empty).toBe(true);
  });

  // Three inputs, one behaviour, one table.
  it.each([
    ["no header", undefined],
    ["not a jwt", "not-a-token"],
    ["a token from nowhere", "aaa.bbb.ccc"],
  ])("refuses %s with 401", async (_label, token) => {
    const before = await countUsers();

    const res = await post(NEW, token);

    expect(res.status).toBe(401);
    expect(await countUsers()).toBe(before);
  });

  // The role a caller sends is not a role, it is a string they typed.
  it("ignores a role asked for in the body", async () => {
    const res = await post({ ...NEW, role: ROLES.MANAGER }, managerToken);
    expect(res.status).toBe(201);

    const { uid } = await res.json();
    const record = await adminAuth.getUser(uid);
    expect(record.customClaims.role).toBe(ROLES.TRAINER);

    const snap = await adminDb.collection("users").doc(uid).get();
    expect(snap.data().role).toBe(ROLES.TRAINER);
  });

  it("refuses a duplicate email and leaves one account", async () => {
    const first = await post(NEW, managerToken);
    expect(first.status).toBe(201);
    const after = await countUsers();

    const second = await post({ ...NEW, name: "Other" }, managerToken);

    expect(second.status).toBe(400);
    expect((await second.json()).error).toMatch(/already/i);
    expect(await countUsers()).toBe(after);
  });

  it("refuses a missing field and a short password with 400", async () => {
    const missing = await post(
      { name: "", email: "", password: "" },
      managerToken
    );
    expect(missing.status).toBe(400);

    const short = await post({ ...NEW, password: "123" }, managerToken);
    expect(short.status).toBe(400);

    expect(await countUsers()).toBe(2);
  });
});
