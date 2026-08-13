// Story 4. The signed-in trainer's own bookings.

import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { db, auth } from "@/lib/firebase/client";

export async function listMyBookings() {
  const uid = auth.currentUser?.uid;
  if (!uid) return [];

  // The where clause is what makes this legal, not what makes it fast. Firestore
  // checks the query against the rule, not the documents against the rule. A query
  // that does not constrain trainerId is refused outright, so removing this line
  // returns nothing at all rather than everyone's bookings.

  // Filtering on trainerId and ordering by startTime needs a composite index. The
  // emulator does not enforce indexes, so this runs fine locally and would fail on a
  // real project.
  const snap = await getDocs(
    query(
      collection(db, "bookings"),
      where("trainerId", "==", uid),
      orderBy("startTime", "desc")
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
