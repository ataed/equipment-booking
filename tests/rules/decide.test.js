import { describe, it, beforeAll, afterAll, beforeEach } from "vitest";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from "@firebase/rules-unit-testing";
import { doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { readFileSync } from "node:fs";
import { ROLES, BOOKING_STATUS } from "../../lib/contract";

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

async function seedBooking(status) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "bookings", "b1"), {
      trainerId: "trainer-a",
      typeId: "projector",
      equipmentId: "projector-1",
      startTime: new Date(2026, 7, 20, 14, 0, 0, 0),
      endTime: new Date(2026, 7, 20, 15, 0, 0, 0),
      startHour: 14,
      durationHours: 1,
      status,
    });
    await setDoc(doc(db, "slots", "projector-1_2026-08-20T14"), {
      bookingId: "b1",
    });
  });
}

beforeEach(async () => {
  await testEnv.clearFirestore();
});

const trainerA = () =>
  testEnv.authenticatedContext("trainer-a", { role: ROLES.TRAINER });
const manager = () =>
  testEnv.authenticatedContext("manager-r", { role: ROLES.MANAGER });

const setStatus = (ctx, status) =>
  updateDoc(doc(ctx.firestore(), "bookings", "b1"), { status });

describe("deciding a booking", () => {
  it("lets a manager approve a pending booking", async () => {
    await seedBooking(BOOKING_STATUS.PENDING);
    await assertSucceeds(setStatus(manager(), BOOKING_STATUS.APPROVED));
  });

  it("lets a manager refuse a pending booking", async () => {
    await seedBooking(BOOKING_STATUS.PENDING);
    await assertSucceeds(setStatus(manager(), BOOKING_STATUS.REFUSED));
  });

  // Criterion 4.
  it("refuses deciding an already-approved booking", async () => {
    await seedBooking(BOOKING_STATUS.APPROVED);
    await assertFails(setStatus(manager(), BOOKING_STATUS.REFUSED));
  });

  it("refuses deciding an already-refused booking", async () => {
    await seedBooking(BOOKING_STATUS.REFUSED);
    await assertFails(setStatus(manager(), BOOKING_STATUS.APPROVED));
  });

  // Criterion 5
  it("refuses a trainer approving their own booking", async () => {
    await seedBooking(BOOKING_STATUS.PENDING);
    await assertFails(setStatus(trainerA(), BOOKING_STATUS.APPROVED));
  });

  it("refuses a trainer approving another trainer's booking", async () => {
    await seedBooking(BOOKING_STATUS.PENDING);
    const trainerB = testEnv.authenticatedContext("trainer-b", {
      role: ROLES.TRAINER,
    });
    await assertFails(setStatus(trainerB, BOOKING_STATUS.APPROVED));
  });

  it("refuses a manager changing any field other than status", async () => {
    await seedBooking(BOOKING_STATUS.PENDING);
    await assertFails(
      updateDoc(doc(manager().firestore(), "bookings", "b1"), {
        equipmentId: "projector-2",
      })
    );
  });

  it("refuses a manager setting a status outside the legal set", async () => {
    await seedBooking(BOOKING_STATUS.PENDING);
    await assertFails(setStatus(manager(), BOOKING_STATUS.RETURNED));
  });

  it("refuses deleting a booking, by anyone", async () => {
    await seedBooking(BOOKING_STATUS.PENDING);
    await assertFails(deleteDoc(doc(manager().firestore(), "bookings", "b1")));
    await assertFails(deleteDoc(doc(trainerA().firestore(), "bookings", "b1")));
  });
});

describe("releasing a slot on refusal", () => {
  it("lets a manager delete a slot", async () => {
    await seedBooking(BOOKING_STATUS.PENDING);
    await assertSucceeds(
      deleteDoc(
        doc(manager().firestore(), "slots", "projector-1_2026-08-20T14")
      )
    );
  });

  it("refuses a trainer deleting a slot", async () => {
    await seedBooking(BOOKING_STATUS.PENDING);
    await assertFails(
      deleteDoc(
        doc(trainerA().firestore(), "slots", "projector-1_2026-08-20T14")
      )
    );
  });
});
