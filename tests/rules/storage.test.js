// Story 3's storage criteria. A separate rules language and a separate emulator from
// firestore.rules, so a separate test environment section.
//
// initializeTestEnvironment takes a storage block alongside firestore. The rules file
// is read the same way, so editing storage.rules is reflected here.

import { describe, it, beforeAll, afterAll, beforeEach } from "vitest";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from "@firebase/rules-unit-testing";
import { ref, uploadBytes, getBytes } from "firebase/storage";
import { readFileSync } from "node:fs";
import { ROLES } from "../../lib/contract";

let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "almanar-booking-dev",
    storage: {
      host: "127.0.0.1",
      port: 9199,
      rules: readFileSync("storage.rules", "utf8"),
    },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearStorage();
});

const trainerA = () =>
  testEnv.authenticatedContext("trainer-a", { role: ROLES.TRAINER });
const trainerB = () =>
  testEnv.authenticatedContext("trainer-b", { role: ROLES.TRAINER });
const manager = () =>
  testEnv.authenticatedContext("manager-r", { role: ROLES.MANAGER });

const PATH_A = "damage/trainer-a/booking-1";

// A tiny fake image. Content is irrelevant: the rule checks contentType and size,
// not the bytes.
const image = (bytes = 100) => new Uint8Array(bytes);

const upload = (ctx, path, data, contentType = "image/jpeg") =>
  uploadBytes(ref(ctx.storage(), path), data, { contentType });

// Writes past the rules, so a read test has something to read.
async function seedPhoto(path) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await uploadBytes(ref(ctx.storage(), path), image(), {
      contentType: "image/jpeg",
    });
  });
}

describe("damage photo upload rules", () => {
  it("lets a trainer upload to their own path", async () => {
    await assertSucceeds(upload(trainerA(), PATH_A, image()));
  });

  // The path is the ownership check, because storage rules cannot read Firestore.
  it("refuses a trainer uploading to another trainer's path", async () => {
    await assertFails(upload(trainerB(), PATH_A, image()));
  });

  it("refuses an unauthenticated upload", async () => {
    await assertFails(
      upload(testEnv.unauthenticatedContext(), PATH_A, image())
    );
  });

  it("refuses a file that is not an image", async () => {
    await assertFails(upload(trainerA(), PATH_A, image(), "application/pdf"));
  });

  it("refuses a file over 5 MB", async () => {
    await assertFails(upload(trainerA(), PATH_A, image(6 * 1024 * 1024)));
  });

  // Create only. A photo that can be replaced is a photo that can be replaced after
  // a manager has looked at it. Same reasoning as the slots collection.
  it("refuses overwriting an existing photo", async () => {
    const PATH_OVERWRITE = "damage/trainer-a/booking-overwrite-test"; // UNIQUE PATH

    // First upload succeeds because this specific path is empty
    await assertSucceeds(upload(trainerA(), PATH_OVERWRITE, image()));

    // Second upload fails because it already exists
    await assertFails(upload(trainerA(), PATH_OVERWRITE, image()));
  });

  it("refuses a path outside damage/", async () => {
    await assertFails(upload(trainerA(), "anywhere/else.jpg", image()));
  });
});

describe("damage photo read rules", () => {
  beforeEach(async () => {
    await seedPhoto(PATH_A);
  });

  it("lets a trainer read their own photo", async () => {
    await assertSucceeds(getBytes(ref(trainerA().storage(), PATH_A)));
  });

  // Same privacy rule as bookings, one layer down.
  it("refuses a trainer reading another trainer's photo", async () => {
    await assertFails(getBytes(ref(trainerB().storage(), PATH_A)));
  });

  it("lets a manager read any photo", async () => {
    await assertSucceeds(getBytes(ref(manager().storage(), PATH_A)));
  });

  it("refuses an unauthenticated read", async () => {
    await assertFails(
      getBytes(ref(testEnv.unauthenticatedContext().storage(), PATH_A))
    );
  });

  it("refuses a delete, by anyone", async () => {
    const { deleteObject } = await import("firebase/storage");
    await assertFails(deleteObject(ref(trainerA().storage(), PATH_A)));
    await assertFails(deleteObject(ref(manager().storage(), PATH_A)));
  });
});
