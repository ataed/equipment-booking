// Seeds the emulator with the data Sprint 1 needs to be startable.
// Run with the emulator up:  node scripts/seed.mjs
//
// The Admin SDK bypasses Security Rules entirely, so nothing here is checked by
// the rules file. That is why it uses the same contract helpers the app will:
// nothing else stops this script writing data the app could never produce.
//
// It needs no credentials against the emulator, only the environment variables
// below telling it where to connect.

// Hardcoded on purpose. This script creates fake accounts with known passwords
// and must never run against a real project.
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";

import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import {
  ROLES,
  BOOKING_STATUS,
  EQUIPMENT_STATUS,
  validateBooking,
  slotIdsForBooking,
} from "../lib/contract.js";

initializeApp({ projectId: "almanar-booking-dev" });

const auth = getAuth();
const db = getFirestore();

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

// Fixed uids, not generated ones. The seeded bookings below reference these, and
// a generated uid would change on every run so nothing could point at it. Also
// makes them readable in the emulator UI and in test assertions.
const TRAINERS = [
  { uid: "trainer-amina", email: "amina@almanar.test", name: "Amina Benali" },
  {
    uid: "trainer-youssef",
    email: "youssef@almanar.test",
    name: "Youssef Alami",
  },
  { uid: "trainer-karim", email: "karim@almanar.test", name: "Karim Tazi" },
];

// Two managers with the same role, not a separate sous-manager role. The manager
// is away one week a month and approving is useless without the storeroom key,
// so the second person needs identical permissions. See questions.md item 1.
const MANAGERS = [
  {
    uid: "manager-rachid",
    email: "rachid@almanar.test",
    name: "Rachid Benali",
  },
  {
    uid: "manager-samira",
    email: "samira@almanar.test",
    name: "Samira Idrissi",
  },
];

const PASSWORD = "test1234";

// Doc id is the type name, so the id is readable and there is no lookup needed
// to know what a device is.
const TYPES = [
  { id: "projector", name: "Projecteur", category: "presentation" },
  { id: "laptop", name: "Ordinateur portable", category: "computing" },
  { id: "tablet", name: "Tablette", category: "computing" },
  { id: "camera", name: "Caméra", category: "media" },
];

// Three projectors on purpose: the device assignment loop needs more than one
// candidate to be worth testing. One camera out of service on purpose: story 2
// criterion 2 needs a type where every device is unavailable.
const EQUIPMENT = [
  {
    id: "projector-1",
    typeId: "projector",
    status: EQUIPMENT_STATUS.IN_SERVICE,
  },
  {
    id: "projector-2",
    typeId: "projector",
    status: EQUIPMENT_STATUS.IN_SERVICE,
  },
  {
    id: "projector-3",
    typeId: "projector",
    status: EQUIPMENT_STATUS.IN_SERVICE,
  },
  { id: "laptop-1", typeId: "laptop", status: EQUIPMENT_STATUS.IN_SERVICE },
  { id: "laptop-2", typeId: "laptop", status: EQUIPMENT_STATUS.IN_SERVICE },
  { id: "tablet-1", typeId: "tablet", status: EQUIPMENT_STATUS.IN_SERVICE },
  { id: "camera-1", typeId: "camera", status: EQUIPMENT_STATUS.OUT_OF_SERVICE },
];

// Tomorrow, so the bookings are always in the future however long the emulator
// data sits around. Hour set explicitly because the validator requires minutes
// and seconds to be zero.
function tomorrowAt(hour) {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hour, 0, 0, 0);
  return d;
}

// Three pending bookings so story 5, the approve screen, can be built without
// waiting for story 3, the booking write. That is a dependency removed by data
// rather than by waiting. See backlog-passes.md.
const BOOKINGS = [
  {
    id: "booking-1",
    trainerId: "trainer-amina",
    typeId: "projector",
    equipmentId: "projector-1",
    startTime: tomorrowAt(9),
    durationHours: 1,
  },
  {
    id: "booking-2",
    trainerId: "trainer-youssef",
    typeId: "projector",
    equipmentId: "projector-2",
    startTime: tomorrowAt(14),
    durationHours: 2,
  },
  {
    id: "booking-3",
    trainerId: "trainer-karim",
    typeId: "laptop",
    equipmentId: "laptop-1",
    startTime: tomorrowAt(11),
    durationHours: 1,
  },
];

// ---------------------------------------------------------------------------
// Clearing
// ---------------------------------------------------------------------------

// Firestore has no drop-collection. A collection stops existing when its last
// document is deleted, so clearing means listing and deleting each document.
async function clear() {
  const listed = await auth.listUsers();
  if (listed.users.length) {
    await auth.deleteUsers(listed.users.map((u) => u.uid));
  }

  for (const name of ["users", "types", "equipment", "bookings", "slots"]) {
    const snap = await db.collection(name).get();
    if (snap.empty) continue;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

// ---------------------------------------------------------------------------
// Creating
// ---------------------------------------------------------------------------

// A user is two things in two separate systems. Firebase Auth holds the sign-in
// identity and the custom claim that rules trust. Firestore holds the document
// the app reads to show a name. The link between them is the uid, and the
// Firestore document id must be that same uid or a rule looking up
// users/{request.auth.uid} finds nothing.
async function createUser({ uid, email, name, role }) {
  await auth.createUser({ uid, email, password: PASSWORD, displayName: name });
  await auth.setCustomUserClaims(uid, { role });
  await db.collection("users").doc(uid).set({
    name,
    email,
    role,
    // Rules cannot query, so this is what the booking cap rule reads. Every user
    // starts at 0 and the three seeded bookings below bring three trainers to 1.
    activeBookings: 0,
  });
}

// A booking and its slots are written together. Every hour the booking occupies
// gets a slot document, because pending holds the slot. Without these the data
// would be inconsistent: a booking that occupies hours nothing records, so the
// app would offer an already-taken device as free.
async function createBooking(b) {
  // The Admin SDK ignores rules, so the validator is the only thing standing
  // between a typo here and seed data the app could never have produced.
  const check = validateBooking(b);
  if (!check.valid) {
    throw new Error(`${b.id} is invalid: ${check.reason}`);
  }

  const endTime = new Date(b.startTime);
  endTime.setHours(endTime.getHours() + b.durationHours);

  const slotIds = slotIdsForBooking(
    b.equipmentId,
    b.startTime,
    b.durationHours
  );

  for (const slotId of slotIds) {
    const existing = await db.collection("slots").doc(slotId).get();
    if (existing.exists) {
      throw new Error(
        `${b.id} wants slot ${slotId}, already held by ${existing.data().bookingId}`
      );
    }
  }

  const batch = db.batch();

  batch.set(db.collection("bookings").doc(b.id), {
    trainerId: b.trainerId,
    typeId: b.typeId,
    equipmentId: b.equipmentId,
    startTime: Timestamp.fromDate(b.startTime),
    endTime: Timestamp.fromDate(endTime),
    // Plain numbers alongside the timestamps, because rules evaluate timestamp
    // methods in UTC and Morocco is UTC+1. A rule reading startTime.hours() would
    // see 13 for a 14:00 booking. See decisions.md.
    startHour: b.startTime.getHours(),
    durationHours: b.durationHours,
    status: BOOKING_STATUS.PENDING,
    createdAt: Timestamp.now(),
    returnedAt: null,
    urgent: false,
    // Empty string rather than absent. A rule checking a field that does not
    // exist errors and denies rather than evaluating false, so every field needs
    // a value at creation. See schema.md.
    urgentReason: "",
    damaged: false,
    damagePhotoUrl: null,
  });

  for (const slotId of slotIds) {
    batch.set(db.collection("slots").doc(slotId), { bookingId: b.id });
  }

  await batch.commit();
  // The seeded bookings are pending, which counts as active. Without this the
  // counter says 0 while the trainer has a booking, so their next attempt would be
  // treated as their first rather than their second.
  await db
    .collection("users")
    .doc(b.trainerId)
    .update({ activeBookings: FieldValue.increment(1) });
  return slotIds;
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

await clear();
console.log("cleared");

for (const t of TRAINERS) {
  await createUser({ ...t, role: ROLES.TRAINER });
  console.log("trainer:", t.uid);
}

for (const m of MANAGERS) {
  await createUser({ ...m, role: ROLES.MANAGER });
  console.log("manager:", m.uid);
}

for (const t of TYPES) {
  const { id, ...rest } = t;
  await db.collection("types").doc(id).set(rest);
}
console.log("types:", TYPES.length);

for (const e of EQUIPMENT) {
  const { id, ...rest } = e;
  await db.collection("equipment").doc(id).set(rest);
}
console.log("equipment:", EQUIPMENT.length);

for (const b of BOOKINGS) {
  const slotIds = await createBooking(b);
  console.log("booking:", b.id, "slots:", slotIds.join(", "));
}

// Claims are not visible in the emulator UI, so this is the only way to confirm
// setCustomUserClaims actually did something.
const check = await auth.getUserByEmail("amina@almanar.test");
console.log("claims on amina:", check.customClaims);

console.log("\nsign in with any of the emails above, password:", PASSWORD);
process.exit(0);
