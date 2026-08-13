import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { EQUIPMENT_STATUS } from "@/lib/contract";

export async function listTypesWithAvailability() {
  const [typesSnap, inServiceSnap] = await Promise.all([
    getDocs(collection(db, "types")),
    getDocs(
      query(
        collection(db, "equipment"),
        where("status", "==", EQUIPMENT_STATUS.IN_SERVICE)
      )
    ),
  ]);
  const typeWithADevice = new Set(
    inServiceSnap.docs.map((d) => d.data().typeId)
  );

  return typesSnap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    available: typeWithADevice.has(d.id),
  }));
}
