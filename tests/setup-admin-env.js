// lib/firebase/admin.js reads NEXT_PUBLIC_USE_EMULATORS at import time, so this
// has to run before any test file is imported. Setting it inside a test file
// would be too late, because ES imports are evaluated first.
process.env.NEXT_PUBLIC_USE_EMULATORS = "true";

if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "almanar-booking-dev";
}
