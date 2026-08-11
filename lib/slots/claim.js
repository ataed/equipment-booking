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
