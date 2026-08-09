import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from "@firebase/rules-unit-testing";
import { doc, setDoc, getDoc,deleteDoc } from "firebase/firestore";
import { readFileSync } from "node:fs";

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

beforeEach(async () => {
  await testEnv.clearFirestore();
});

const SLOT = "projector-1_2026-08-11T14";

describe("slots rules", () => {
  it("lets a signed-in user read a slot", async () => {
    const trainer = testEnv.authenticatedContext("trainer-a");
    await assertSucceeds(getDoc(doc(trainer.firestore(), "slots", SLOT)));
  });

  it("refuses an unauthenticated read", async () => {
    const anon = testEnv.unauthenticatedContext();
    await assertFails(getDoc(doc(anon.firestore(), "slots", SLOT)));
  });

  it("lets a signed-in user create a slot", async () => {
    const trainer = testEnv.authenticatedContext("trainer-a");
    await assertSucceeds(
      setDoc(doc(trainer.firestore(), "slots", SLOT), { bookingId: "b1" }),
    );
  });

  it("refuses a second create on the same slot", async () => {
    const a = testEnv.authenticatedContext("trainer-a");
    await assertSucceeds(
      setDoc(doc(a.firestore(), "slots", SLOT), { bookingId: "b1" }),
    );

    const b = testEnv.authenticatedContext("trainer-b");
    await assertFails(
      setDoc(doc(b.firestore(), "slots", SLOT), { bookingId: "b2" }),
    );
  });

  it("refuses a delete", async () => {
    const trainer = testEnv.authenticatedContext("trainer-a");
    await assertSucceeds(
      setDoc(doc(trainer.firestore(), "slots", SLOT), { bookingId: "b1" }),
    );
    
    await assertFails(deleteDoc(doc(trainer.firestore(), "slots", SLOT)));
  });
});