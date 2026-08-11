// Dev C's rules request for story 4
// Story 4 criteria 3, 4 and 6, plus story 5 criterion 7. Grouped by collection
// rather than by story, because they all exercise the same read rule.

import { describe, it, beforeAll, afterAll, beforeEach } from "vitest";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from "@firebase/rules-unit-testing";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
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

// Two bookings owned by different trainers, written as admin so the rules being
// tested do not interfere with the setup.
beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const [id, trainerId] of [
      ["b-a", "trainer-a"],
      ["b-b", "trainer-b"],
    ]) {
      await setDoc(doc(db, "bookings", id), {
        trainerId,
        typeId: "projector",
        equipmentId: "projector-1",
        startTime: new Date(2026, 7, 20, 14, 0, 0, 0),
        endTime: new Date(2026, 7, 20, 15, 0, 0, 0),
        startHour: 14,
        durationHours: 1,
        status: BOOKING_STATUS.PENDING,
      });
    }
  });
});

const trainerA = () =>
  testEnv.authenticatedContext("trainer-a", { role: ROLES.TRAINER });
const manager = () =>
  testEnv.authenticatedContext("manager-r", { role: ROLES.MANAGER });

describe("bookings read rules", () => {
  it("lets a trainer read their own booking", async () => {
    await assertSucceeds(
      getDoc(doc(trainerA().firestore(), "bookings", "b-a"))
    );
  });

  // Criterion 3.
  it("refuses a trainer reading another trainer's booking", async () => {
    await assertFails(getDoc(doc(trainerA().firestore(), "bookings", "b-b")));
  });

  // Criterion 4. The all-or-nothing behaviour as a test. Rules are not filters,
  // so this is refused entirely rather than returning only b-a.
  it("refuses an unnarrowed query on bookings", async () => {
    await assertFails(getDocs(collection(trainerA().firestore(), "bookings")));
  });

  it("allows a query narrowed to my own uid", async () => {
    await assertSucceeds(
      getDocs(
        query(
          collection(trainerA().firestore(), "bookings"),
          where("trainerId", "==", "trainer-a")
        )
      )
    );
  });

  // Narrowed, but to somebody else. The query constraint has to match what the
  // rule permits, and the rule permits only your own uid.
  it("refuses a query narrowed to another trainer's uid", async () => {
    await assertFails(
      getDocs(
        query(
          collection(trainerA().firestore(), "bookings"),
          where("trainerId", "==", "trainer-b")
        )
      )
    );
  });

  it("lets a manager read any booking", async () => {
    await assertSucceeds(getDoc(doc(manager().firestore(), "bookings", "b-a")));
  });

  it("lets a manager query all bookings unnarrowed", async () => {
    await assertSucceeds(
      getDocs(collection(manager().firestore(), "bookings"))
    );
  });

  it("refuses an unauthenticated read", async () => {
    await assertFails(
      getDoc(
        doc(testEnv.unauthenticatedContext().firestore(), "bookings", "b-a")
      )
    );
  });
});
