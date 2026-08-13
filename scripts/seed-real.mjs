import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import {
  ROLES,
  BOOKING_STATUS,
  EQUIPMENT_STATUS,
  validateBooking,
  slotIdsForBooking,
} from "../lib/contract.js";

const PROJECT_ID = "almanar-booking-dev";

// ---------------------------------------------------------------------------
// Guards
//
// Two of them, because this script has full write access to a real project and the
// failure worth making impossible is running it against the wrong target.
// ---------------------------------------------------------------------------

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  throw new Error(
    "GOOGLE_APPLICATION_CREDENTIALS is not set. Refusing to run without an explicit credential."
  );
}

// A leftover shell export would otherwise make this quietly seed the emulator while
// you believe you seeded the real project.
if (
  process.env.FIRESTORE_EMULATOR_HOST ||
  process.env.FIREBASE_AUTH_EMULATOR_HOST
) {
  throw new Error(
    "Emulator host vars are set. Unset them before seeding the real project."
  );
}

initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });

const auth = getAuth();
const db = getFirestore();

console.log("connected to", PROJECT_ID);

// ---------------------------------------------------------------------------
// Data
//
// Identical to scripts/seed.mjs. Fixed uids so the bookings below can reference
// them and so they are readable in the console.
// ---------------------------------------------------------------------------

const TRAINERS = [
  { uid: "trainer-amina", email: "amina@almanar.test", name: "Amina Benali" },
  {
    uid: "trainer-youssef",
    email: "youssef@almanar.test",
    name: "Youssef Alami",
  },
  { uid: "trainer-karim", email: "karim@almanar.test", name: "Karim Tazi" },
];

// Two managers with the same role, not a separate sous-manager role. The manager is
// away one week a month and approving is useless without the storeroom key, so the
// second person needs identical permissions. See questions.md item 1.
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

// Known password on purpose: this is a demo environment and the accounts are fake.
// It is also the reason this script must never run against anything real in the
// ordinary sense.
const PASSWORD = "test1234";

const TYPES = [
  { id: "projector", name: "Projecteur", category: "presentation" },
  { id: "laptop", name: "Ordinateur portable", category: "computing" },
  { id: "tablet", name: "Tablette", category: "computing" },
  { id: "camera", name: "Caméra", category: "media" },
];

// Three projectors so the assignment loop has more than one candidate. One camera out
// of service so story 2's unavailable case has data.
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

// Tomorrow, so the bookings are in the future however long the data sits around.
function tomorrowAt(hour) {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hour, 0, 0, 0);
  return d;
}

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
//
// Firestore has no drop-collection. A collection stops existing when its last
// document is deleted, so clearing means listing and deleting each document.
//
// listUsers is paginated at 1000 by default. Fine here, but on a real project with
// more accounts this would silently only clear the first page.
// ---------------------------------------------------------------------------

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
// identity and the custom claim that rules trust. Firestore holds the document the app
// reads to show a name. The link is the uid, and the Firestore document id must be that
// same uid or a rule looking up users/{request.auth.uid} finds nothing.
async function createUser({ uid, email, name, role }) {
  await auth.createUser({ uid, email, password: PASSWORD, displayName: name });
  await auth.setCustomUserClaims(uid, { role });
  await db.collection("users").doc(uid).set({
    name,
    email,
    role,
    // Rules cannot query, so this counter is what the booking cap rule reads.
    activeBookings: 0,
  });
}

// A booking and its slots are written together, because pending holds the slot.
// Without the slots the data would be inconsistent: a booking occupying hours nothing
// records, so the app would offer an already-taken device as free.
async function createBooking(b) {
  // The Admin SDK ignores rules, so the validator is the only thing standing between
  // a typo here and data the app could never have produced.
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
    startHour: b.startTime.getHours(),
    durationHours: b.durationHours,
    status: BOOKING_STATUS.PENDING,
    createdAt: Timestamp.now(),
    returnedAt: null,
    urgent: false,
    urgentReason: "",
    damaged: false,
    damagePhotoUrl: null,
  });

  for (const slotId of slotIds) {
    batch.set(db.collection("slots").doc(slotId), { bookingId: b.id });
  }

  await batch.commit();

  // Pending counts as active. Without this the counter says 0 while the trainer has a
  // booking, so their next attempt would be treated as their first.
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

// Claims are not visible in the Firebase console either, so this is the only way to
// confirm setCustomUserClaims did something.
const claimsCheck = await auth.getUserByEmail("amina@almanar.test");
console.log("claims on amina:", claimsCheck.customClaims);

console.log("\nsign in with any of the emails above, password:", PASSWORD);
process.exit(0);
