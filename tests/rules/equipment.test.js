import { describe, it, beforeAll, afterAll, beforeEach } from "vitest";

import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from "@firebase/rules-unit-testing";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { readFileSync } from "node:fs";
import { ROLES } from "../../lib/contract.js";

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
  // testEnv.authenticatedContext(uid, claims)   // a fake signed-in user
  // testEnv.unauthenticatedContext()            // nobody signed in
  // testEnv.withSecurityRulesDisabled(fn)       // admin access, bypasses rules
  // testEnv.clearFirestore()                    // wipe
  // testEnv.cleanup()                           // tear down
});
afterAll(async () => {
  await testEnv?.cleanup();
});
beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe("equipment and types rules", () => {
  it("lets a signed trainer read equipment", async () => {
    const trainer = testEnv.authenticatedContext("trainer-a", {
      role: ROLES.TRAINER,
    });
    await assertSucceeds(getDocs(collection(trainer.firestore(), "equipment")));
  });

  it("refuses an unautheticated read for equipment", async () => {
    const anon = testEnv.unauthenticatedContext();
    await assertFails(getDocs(collection(anon.firestore(), "equipment")));
  });

  it("lets a signed-in trainer read types", async () => {
    const trainer = testEnv.authenticatedContext("trainer-a", {
      role: ROLES.TRAINER,
    });
    await assertSucceeds(getDocs(collection(trainer.firestore(), "types")));
  });

  it("refuses an unauthenticated read of types", async () => {
    const anon = testEnv.unauthenticatedContext();
    await assertFails(getDocs(collection(anon.firestore(), "types")));
  });

  it("refuses a trainer writing to equipment", async () => {
    const trainer = testEnv.authenticatedContext("trainer-a", {
      role: ROLES.TRAINER,
    });
    await assertFails(
      setDoc(doc(trainer.firestore(), "equipment", "projector-9"), {
        typeId: "projector",
        status: "in_service",
      })
    );
  });

  it("refuses a trainer writing to types", async () => {
    const trainer = testEnv.authenticatedContext("trainer-a", {
      role: ROLES.TRAINER,
    });
    await assertFails(
      setDoc(doc(trainer.firestore(), "types", "drone"), {
        name: "Drone",
        category: "media",
      })
    );
  });
});
