// =======================================================================
// BOOKING CREATION RULES (Story 3)
// Covers: Time boundaries, max 2 active bookings, and anti-spoofing.
// =======================================================================

import { describe, it, beforeAll, afterAll, beforeEach } from "vitest";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from "@firebase/rules-unit-testing";
import { doc, setDoc, updateDoc } from "firebase/firestore";
import { readFileSync } from "node:fs";
import { ROLES, BOOKING_STATUS, EQUIPMENT_STATUS } from "../../lib/contract";

let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "almanar-booking-dev",
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

// We need to pre-load some database state (equipment and a user counter)
// before running tests, because the rules rely on reading them.
// We use withSecurityRulesDisabled to act as an admin so we can bypass
// our own rules just to set up the test environment.
beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "equipment", "projector-1"), {
      typeId: "projector",
      status: EQUIPMENT_STATUS.IN_SERVICE,
    });
    await setDoc(doc(db, "equipment", "camera-1"), {
      typeId: "camera",
      status: EQUIPMENT_STATUS.OUT_OF_SERVICE,
    });
    await setDoc(doc(db, "users", "trainer-a"), {
      name: "A",
      email: "a@almanar.test",
      role: ROLES.TRAINER,
      activeBookings: 0,
    });
  });
});

// Quick helpers to grab authenticated contexts
const trainerA = () =>
  testEnv.authenticatedContext("trainer-a", { role: ROLES.TRAINER });
const trainerB = () =>
  testEnv.authenticatedContext("trainer-b", { role: ROLES.TRAINER });
const manager = () =>
  testEnv.authenticatedContext("manager-r", { role: ROLES.MANAGER });

// This is our "Perfect Template". It's a 100% valid booking.
// The tests below will use the spread operator (...overrides) to tweak
// just one field at a time to intentionally break it. This keeps every
// test hyper-focused on exactly one rule.
function body(overrides = {}) {
  const startTime = new Date(2026, 7, 20, 14, 0, 0, 0);
  const endTime = new Date(2026, 7, 20, 15, 0, 0, 0);
  return {
    trainerId: "trainer-a",
    typeId: "projector",
    equipmentId: "projector-1",
    startTime,
    endTime,
    startHour: 14,
    durationHours: 1,
    status: BOOKING_STATUS.PENDING,
    createdAt: new Date(),
    returnedAt: null,
    urgent: false,
    urgentReason: "",
    damaged: false,
    damagePhotoUrl: null,
    ...overrides,
  };
}

const create = (ctx, overrides) =>
  setDoc(doc(ctx.firestore(), "bookings", "b1"), body(overrides));

describe("bookings create rules", () => {
  // Sanity check test. Prevents a default "allow: if false" from giving us a fake green test suite.
  it("lets a trainer create a valid pending booking for themselves", async () => {
    await assertSucceeds(create(trainerA()));
  });

  // Make sure they can't spoof the trainerId in the payload. Must match their actual auth token.
  it("refuses a booking that belongs to another trainer", async () => {
    await assertFails(create(trainerA(), { trainerId: "trainer-b" }));
  });

  it("refuses a booking created by an unauthenticated caller", async () => {
    await assertFails(create(testEnv.unauthenticatedContext()));
  });

  it("refuses a manager creating a booking", async () => {
    await assertFails(create(manager()));
  });

  // Time boundary checks: Must start on the exact hour, between 08:00 and 18:00, and last 1-2 hours.
  it("refuses a start not on the hour", async () => {
    await assertFails(
      create(trainerA(), { startTime: new Date(2026, 7, 20, 14, 30, 0, 0) })
    );
  });

  it("refuses a start before opening", async () => {
    await assertFails(create(trainerA(), { startHour: 7 }));
  });

  it("refuses an end after closing", async () => {
    await assertFails(create(trainerA(), { startHour: 17, durationHours: 2 }));
  });

  it("refuses a duration other than 1 or 2 hours", async () => {
    await assertFails(create(trainerA(), { durationHours: 3 }));
  });

  // Don't trust the frontend to hide broken equipment. The server must explicitly reject it.
  it("refuses a booking for an out-of-service device", async () => {
    await assertFails(
      create(trainerA(), { typeId: "camera", equipmentId: "camera-1" })
    );
  });

  it("refuses a booking with a status other than pending", async () => {
    await assertFails(create(trainerA(), { status: BOOKING_STATUS.APPROVED }));
  });

  it("refuses a booking whose device does not exist", async () => {
    await assertFails(create(trainerA(), { equipmentId: "projector-99" }));
  });
});

// We can't query collections inside Firestore rules, so we enforce the
// 2-booking limit by checking the activeBookings counter on the user's document.
describe("the two-booking cap, enforced through the counter", () => {
  const bump = (ctx, uid, value) =>
    setDoc(
      doc(ctx.firestore(), "users", uid),
      { activeBookings: value },
      { merge: true }
    );

  it("lets a trainer go from 0 to 1", async () => {
    await assertSucceeds(bump(trainerA(), "trainer-a", 1));
  });

  it("refuses a trainer going past 2", async () => {
    // Manually force the counter to 2 first (bypassing rules)
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), "users", "trainer-a"),
        { activeBookings: 2 },
        { merge: true }
      );
    });

    // Now try to bump it to 3 as a normal user. Should fail.
    await assertFails(bump(trainerA(), "trainer-a", 3));
  });

  it("refuses a trainer bumping someone else's counter", async () => {
    await assertFails(bump(trainerB(), "trainer-a", 1));
  });

  it("refuses a trainer changing any other field on their own document", async () => {
    await assertFails(
      setDoc(
        doc(trainerA().firestore(), "users", "trainer-a"),
        { role: ROLES.MANAGER }, // Trying to sneak a role upgrade
        { merge: true }
      )
    );
  });

  it("lets a manager release one when refusing", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), "users", "trainer-a"),
        { activeBookings: 1 },
        { merge: true }
      );
    });

    // Manager decrements the count back to 0
    await assertSucceeds(bump(manager(), "trainer-a", 0));
  });
});

describe("push notification token registration (Story 1)", () => {
  it("lets a trainer write an FCM token to their own document", async () => {
    await assertSucceeds(
      updateDoc(doc(trainerA().firestore(), "users", "trainer-a"), {
        fcmToken: "token-123",
      })
    );
  });

  it("refuses a trainer writing a token to another trainer's document", async () => {
    await assertFails(
      updateDoc(doc(trainerB().firestore(), "users", "trainer-a"), {
        fcmToken: "token-456",
      })
    );
  });

  it("refuses a trainer changing both fcmToken and activeBookings in one write", async () => {
    // This is the critical anti-spoofing check for Criterion 3.
    await assertFails(
      updateDoc(doc(trainerA().firestore(), "users", "trainer-a"), {
        fcmToken: "token-789",
        activeBookings: 1,
      })
    );
  });
});
