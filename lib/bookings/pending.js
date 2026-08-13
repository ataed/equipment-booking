// The manager's pending list. Story 5 criterion 1.

import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import { BOOKING_STATUS } from "@/lib/contract";

export async function listPending() {
  const snap = await getDocs(
    query(
      collection(db, "bookings"),
      where("status", "==", BOOKING_STATUS.PENDING),
      orderBy("startTime", "asc")
    )
  );

  const bookings = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // One read per row. Deduplicated, because two pending bookings from the same
  // trainer would otherwise read the same document twice.
  const uids = [...new Set(bookings.map((b) => b.trainerId))];
  const users = await Promise.all(
    uids.map(async (uid) => {
      const u = await getDoc(doc(db, "users", uid));
      return [uid, u.exists() ? u.data() : null];
    })
  );

  const byUid = Object.fromEntries(users);

  return bookings.map((b) => ({
    ...b,
    trainer: byUid[b.trainerId] ?? { name: "inconnu", email: "" },
  }));
}
