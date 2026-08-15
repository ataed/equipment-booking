// Story 3. A trainer attaches a photo when equipment comes back damaged.

import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";
import { db, storage, auth } from "@/lib/firebase/client";

export class UploadRefused extends Error {}

const MAX_BYTES = 5 * 1024 * 1024;

// The path carries the ownership: damage/{uid}/{bookingId}. Storage rules cannot
// read Firestore, so there is no way for a rule to check that the booking exists or
// belongs to the uploader. Encoding the uid in the path is what makes the rule
// possible at all.
export function damagePath(uid, bookingId) {
  return `damage/${uid}/${bookingId}`;
}

// Uploads the photo, then records it on the booking. Two writes, not one, because
// they are two different services. If the second fails the file exists with nothing
// pointing at it, which is a leak rather than a corruption: no screen reads Storage
// directly, so an unreferenced file is invisible.
export async function attachDamagePhoto(bookingId, file) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new UploadRefused("not signed in");

  if (!file.type.startsWith("image/")) {
    throw new UploadRefused("le fichier doit être une image");
  }
  if (file.size >= MAX_BYTES) {
    throw new UploadRefused("l'image doit faire moins de 5 Mo");
  }

  const fileRef = ref(storage, damagePath(uid, bookingId));

  // uploadBytes rather than uploadBytesResumable: a photo under 5 MB does not need
  // pause and resume, and the simpler call has no progress state to manage.
  await uploadBytes(fileRef, file, { contentType: file.type });

  const url = await getDownloadURL(fileRef);

  // damaged and damagePhotoUrl were in the schema from the start, defaulted at
  // creation, so this is an update of existing fields rather than adding new ones.
  await updateDoc(doc(db, "bookings", bookingId), {
    damaged: true,
    damagePhotoUrl: url,
  });

  return url;
}
