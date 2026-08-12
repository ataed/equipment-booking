// =======================================================================
// BOOKING CREATION ENGINE (Story 3)
//
// Job: Find a free, working device of the requested type and book it.
//
// How it handles concurrency:
// Instead of checking if a slot is free *before* booking (which causes
// race conditions), we blindly try to write the booking. If someone else
// took the slot a millisecond before us, Firestore Rules deny the write,
// we catch the error, and loop to try the next available device.
// =======================================================================

import {
  collection,
  doc,
  getDocs,
  increment,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import {
  BOOKING_STATUS,
  EQUIPMENT_STATUS,
  validateBooking,
} from "@/lib/contract";
import { addSlotClaims } from "@/lib/slots/claim";

export class BookingRefused extends Error {
  constructor(reason) {
    super(reason);
    this.reason = reason;
  }
}

// Returns { bookingId, deviceId }.
// Throws BookingRefused if nothing is free, bad input, or trainer hit their cap.
export async function createBooking({ typeId, startTime, durationHours }) {
  // 1. Ensure the user is actually logged in via the client SDK
  const uid = auth.currentUser?.uid;
  if (!uid) throw new BookingRefused("not signed in");

  // 2. Validate the requested time and duration (e.g., between 8 AM and 6 PM)
  const check = validateBooking({ startTime, durationHours });
  if (!check.valid) throw new BookingRefused(check.reason);

  // 3. Get ALL devices of this type that aren't out_of_service.
  // Note: This doesn't check if they are booked yet, just that they exist and work.
  const devices = await getDocs(
    query(
      collection(db, "equipment"),
      where("typeId", "==", typeId),
      where("status", "==", EQUIPMENT_STATUS.IN_SERVICE)
    )
  );

  if (devices.empty) {
    throw new BookingRefused("no device of that type is in service");
  }

  // Calculate when the booking ends
  const endTime = new Date(startTime);
  endTime.setHours(endTime.getHours() + durationHours);

  // 4. The Race Loop: Try to book these devices one by one until one succeeds.
  for (const device of devices.docs) {
    const bookingRef = doc(collection(db, "bookings"));
    const batch = writeBatch(db);

    // --- PART A: Create the Booking Document ---
    batch.set(bookingRef, {
      trainerId: uid,
      typeId,
      equipmentId: device.id,
      startTime,
      endTime,
      startHour: startTime.getHours(),
      durationHours,
      status: BOOKING_STATUS.PENDING,
      createdAt: serverTimestamp(),
      returnedAt: null,
      urgent: false,
      // We store an empty string rather than leaving it undefined.
      // If a Firestore rule tries to read a missing field, it crashes and denies access.
      urgentReason: "",
      damaged: false,
      damagePhotoUrl: null,
    });

    // --- PART B: Enforce the 2-Booking Maximum ---
    // Firestore Rules cannot query the database to count a user's bookings.
    // Instead, we tell Firestore to increment their active counter.
    // The Firestore Rule will check this update and say DENY if the new number > 2.
    batch.update(doc(db, "users", uid), { activeBookings: increment(1) });

    // --- PART C: Claim the Time Slots ---
    // Creates the time-lock documents (e.g., projector-1_2026-08-20-10)
    addSlotClaims(batch, device.id, startTime, durationHours, bookingRef.id);

    try {
      // 5. Fire the batch!
      // This is an ALL-OR-NOTHING transaction. If the slot is already taken,
      // or if the user has 2 bookings already, Firestore Rules reject the whole batch.
      await batch.commit();

      // If we made it here, we successfully claimed the device! Exit the function.
      return { bookingId: bookingRef.id, deviceId: device.id };
    } catch (err) {
      // If it failed because of a Firestore Rule (permission-denied), it usually means
      // someone else claimed the slot a split-second before us.
      // We catch it, ignore it, and let the loop try the NEXT device in the array.
      if (err.code !== "permission-denied") {
        throw err; // If it's a network error or something else, crash loudly.
      }
    }
  }

  // 6. If the loop finishes and every single device threw a permission-denied error,
  // it means the place is fully booked.
  throw new BookingRefused("no device of that type is free for that slot");
}
