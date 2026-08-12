import { doc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { slotIdsForBooking } from "@/lib/contract";

// Dev C calls this when a manager refuses a booking. Story 5 criterion 3.
// Managers only, per the rule.
export async function releaseSlots(deviceId, startTime, durationHours) {
  const batch = writeBatch(db);
  for (const id of slotIdsForBooking(deviceId, startTime, durationHours)) {
    batch.delete(doc(db, "slots", id));
  }
  await batch.commit();
}

// Adds to a batch the caller owns rather than committing its own, because the slots,
// the booking and the counter have to land or fail together. A booking that claimed
// hour one and then failed would leave a device held by a booking that never existed.
//
// Atomicity comes from the rule denying update, not from a transaction. A second
// setDoc on an existing slot evaluates update, is refused, and the batch fails.
export function addSlotClaims(
  batch,
  deviceId,
  startTime,
  durationHours,
  bookingId
) {
  for (const id of slotIdsForBooking(deviceId, startTime, durationHours)) {
    batch.set(doc(db, "slots", id), { bookingId });
  }
}

// Standalone version, for tests and anything that only needs the slots.
export async function claimSlots(
  deviceId,
  startTime,
  durationHours,
  bookingId
) {
  const batch = writeBatch(db);
  addSlotClaims(batch, deviceId, startTime, durationHours, bookingId);
  await batch.commit();
}
