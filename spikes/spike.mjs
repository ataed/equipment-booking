// Spike: can deterministic slot IDs make the booking write atomic without a
// transaction? Throwaway. Conclusions live in docs/decisions.md.
//
// Needs a temporary permissive block in firestore.rules, not committed:
//
//   match /slots/{slotId} {
//     allow read, create: if true;
//     allow update, delete: if false;
//   }
//
// Run with the emulator up:
//   npx firebase emulators:start
//   node spikes/spike.mjs
//
// .mjs because package.json has no "type": "module", so a .js file would be
// treated as CommonJS and import would fail.

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  setDoc,
  getDoc,
  writeBatch,
} from "firebase/firestore";

const app = initializeApp({ projectId: "almanar-booking-dev" });
const db = getFirestore(app);

// Must be called before any read or write. Without it the SDK talks to the real
// Firestore in Madrid.
connectFirestoreEmulator(db, "127.0.0.1", 8080);

// Slots persist in the emulator between script runs, so a rerun would refuse
// everything and look like a failure. A per-run tag on the device names keeps
// each run isolated. Real device IDs are not tagged; this is only so the spike
// is rerunnable.
const run = Date.now().toString().slice(-6);
const HOURS = ["2026-08-11T14", "2026-08-11T15"];

const slot = (device, hour) => doc(db, "slots", `${device}_${hour}`);

// Claim every hour for one device, all or nothing.
async function claimDevice(device, hours, bookingId) {
  const batch = writeBatch(db);
  for (const hour of hours) {
    batch.set(slot(device, hour), { bookingId });
  }
  await batch.commit();
}

// Find a free device of the requested type and claim it. Returns the device, or
// null if every candidate is taken.
async function claimAnyDevice(devices, hours, bookingId) {
  for (const device of devices) {
    try {
      await claimDevice(device, hours, bookingId);
      return device;
    } catch {
      // Taken. Try the next one.
      // Note: permission-denied here is indistinguishable from a broken rules
      // file. See the cost noted in docs/decisions.md.
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// 1. Does a create-only rule refuse a second write, or overwrite it?
// ---------------------------------------------------------------------------
console.log("\n--- 1. create-only refuses overwrite");
{
  const ref = slot(`e1-${run}`, HOURS[0]);

  try {
    await setDoc(ref, { bookingId: "first" });
    console.log("first write: succeeded");
  } catch (err) {
    console.log("first write: refused —", err.code);
  }

  try {
    await setDoc(ref, { bookingId: "second" });
    console.log("second write: succeeded");
  } catch (err) {
    console.log("second write: refused —", err.code);
  }

  const snap = await getDoc(ref);
  console.log("surviving bookingId:", snap.data()?.bookingId);
}

// ---------------------------------------------------------------------------
// 2. Two writes fired at the same instant on the same slot. Does exactly one
//    win? Neither has seen the other's result when they start.
// ---------------------------------------------------------------------------
console.log("\n--- 2. race on one slot");
{
  const ref = slot(`e2-${run}`, HOURS[0]);

  // allSettled rather than all: one rejection is expected, and all would hide
  // the other result by rejecting immediately.
  const results = await Promise.allSettled([
    setDoc(ref, { bookingId: "clientA" }),
    setDoc(ref, { bookingId: "clientB" }),
  ]);

  results.forEach((r, i) => {
    const who = i === 0 ? "clientA" : "clientB";
    if (r.status === "fulfilled") console.log(who, "succeeded");
    else console.log(who, "refused —", r.reason.code);
  });

  const snap = await getDoc(ref);
  console.log("surviving bookingId:", snap.data()?.bookingId);
}

// ---------------------------------------------------------------------------
// 3. A batch with one taken hour and one free hour. Does the free one still get
//    written? This decides whether a multi-hour booking can leave a slot
//    claimed by a booking that never happened.
// ---------------------------------------------------------------------------
console.log("\n--- 3. batch atomicity");
{
  const device = `e3-${run}`;
  const taken = slot(device, HOURS[0]);
  const free = slot(device, HOURS[1]);

  await setDoc(taken, { bookingId: "earlier" });
  console.log("pre-took", HOURS[0]);

  const batch = writeBatch(db);
  batch.set(taken, { bookingId: "batchTest" });
  batch.set(free, { bookingId: "batchTest" });

  try {
    await batch.commit();
    console.log("batch committed");
  } catch (err) {
    console.log("batch failed —", err.code);
  }

  const snap = await getDoc(free);
  console.log("free hour written:", snap.exists());
}

// ---------------------------------------------------------------------------
// 4. The device loop. First device is taken, so it should skip to the second.
// ---------------------------------------------------------------------------
console.log("\n--- 4. device loop skips a taken device");
{
  const devices = [`e4a-${run}`, `e4b-${run}`, `e4c-${run}`];

  await claimDevice(devices[0], HOURS, "earlier");
  console.log("pre-took", devices[0]);

  const got = await claimAnyDevice(devices, HOURS, "loopTest");
  console.log("claimed:", got);
}

// ---------------------------------------------------------------------------
// 5. Two trainers ask for the same type, same hours, at the same instant. Three
//    devices are free. Both should succeed with different devices. This is
//    story 3 criterion 7.
// ---------------------------------------------------------------------------
console.log("\n--- 5. two trainers, same type, same hours");
{
  const devices = [`e5a-${run}`, `e5b-${run}`, `e5c-${run}`];

  const [a, b] = await Promise.all([
    claimAnyDevice(devices, HOURS, "trainerA"),
    claimAnyDevice(devices, HOURS, "trainerB"),
  ]);

  console.log("trainerA got:", a);
  console.log("trainerB got:", b);
  console.log("different devices:", a !== b && a !== null && b !== null);
}

// The SDK keeps a connection open, so the script will not end on its own.
process.exit(0);

// ---------------------------------------------------------------------------
// FINDINGS
//
// 1. Create-only rules refuse rather than overwrite. Second setDoc got
//    permission-denied and the original survived. Note setDoc always evaluates
//    both create and update, regardless of whether the document exists, so a
//    rule has to handle both. Verified in the emulator Requests tab.
//
// 2. A real race resolves correctly. Two simultaneous setDoc calls on one slot:
//    one succeeded, one refused, exactly one document afterwards. No transaction.
//
// 3. writeBatch is atomic across creates. One taken hour batched with one free
//    hour failed entirely and the free hour was never written. So a multi-hour
//    booking claims all its hours or none.
//
// 4. The device loop works. A fresh writeBatch per iteration is required, they
//    are single-use.
//
// 5. Two trainers at the same instant got different devices. Both collided on
//    the first device, and the loser's loop moved on rather than failing.
//
// Open: refusing a booking has to release its slots, and the rule denies delete.
// Unresolved, settled when story 5 is built. See docs/decisions.md.
// ---------------------------------------------------------------------------
