import { doc, updateDoc, increment } from "firebase/firestore";
import { db, auth } from "@/lib/firebase/client";
import { BOOKING_STATUS, LEGAL_TRANSITIONS } from "@/lib/contract";
import { releaseSlots } from "@/lib/slots/claim";

export class DecisionRefused extends Error {}

// updateDoc, never setDoc. setDoc replaces the entire document, so
// setDoc(ref, { status: "approved" }) would erase trainerId, equipmentId,
// startTime and everything else. updateDoc merges, and its failing on a missing
// document is a feature: approving a booking that does not exist should fail.
export async function decide(booking, next) {
  // Checked here for a readable message, and again in the rule because this can
  // be bypassed. The rule is the boundary.
  if (!LEGAL_TRANSITIONS[booking.status]?.includes(next)) {
    throw new DecisionRefused(`cannot go from ${booking.status} to ${next}`);
  }

  await updateDoc(doc(db, "bookings", booking.id), { status: next });

  if (next === BOOKING_STATUS.REFUSED) {
    // Criterion 3's second line: refusing frees the device. Two operations, not
    // one batch, because releaseSlots commits its own. See decisions.md for the
    // cost and what would reverse it.
    const hours =
      (booking.endTime.toMillis() - booking.startTime.toMillis()) / 3600000;

    await releaseSlots(booking.equipmentId, booking.startTime.toDate(), hours);
    // The counter is what the booking cap rule reads, so refusing has to give the
    // trainer their slot back. The rule permits a manager to decrement by exactly 1.
    await updateDoc(doc(db, "users", booking.trainerId), {
      activeBookings: increment(-1),
    });
  }

  // Trigger the push notification (AC 4 & 5)
  // fire-and-forget. We do not await this, so if it is slow or fails,
  // the manager's screen still completes the decision instantly.
  if (auth.currentUser) {
    auth.currentUser.getIdToken().then((token) => {
      fetch("/api/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          trainerId: booking.trainerId,
          status: next,
        }),
      }).catch((err) =>
        console.error("Silently caught notification error:", err)
      );
    });
  }
}
