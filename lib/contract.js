// The frozen contract. Anything that reads or writes a booking or a slot imports
// from here, so field names and formats exist in exactly one place.
//
// In TypeScript this would be a types file and the compiler would enforce it.
// In JavaScript nothing enforces it, so these are constants plus functions, and
// the validator does by hand what a compiler would do for free.

// ---------------------------------------------------------------------------
// 1. Booking status
// ---------------------------------------------------------------------------

// Constants rather than bare strings. A typo'd "Pending" in one file is a bug no
// linter catches and no test finds unless you happen to test that path.
export const BOOKING_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REFUSED: "refused",
  RETURNED: "returned",
  CANCELED: "canceled",
};

// Every value, for validating that a status is one of the known ones.
export const ALL_STATUSES = Object.values(BOOKING_STATUS);

// ---------------------------------------------------------------------------
// 2. What can occur in Sprint 1
// ---------------------------------------------------------------------------

// Return and cancel are Sprint 2 stories, so their statuses cannot exist yet.
// Story 5's rule validates transitions and needs to know what is legal now, not
// eventually. Widen this when those stories ship.
export const SPRINT_1_STATUSES = [
  BOOKING_STATUS.PENDING,
  BOOKING_STATUS.APPROVED,
  BOOKING_STATUS.REFUSED,
];

// Which status can become which. A booking starts pending and ends decided.
// Nothing transitions out of approved or refused in Sprint 1.
export const LEGAL_TRANSITIONS = {
  [BOOKING_STATUS.PENDING]: [BOOKING_STATUS.APPROVED, BOOKING_STATUS.REFUSED],
  [BOOKING_STATUS.APPROVED]: [],
  [BOOKING_STATUS.REFUSED]: [],
};

// ---------------------------------------------------------------------------
// 3. Slot IDs
// ---------------------------------------------------------------------------

// Centre hours. The latest start is 17:00 for a one-hour booking and 16:00 for
// two, because endTime must not pass CLOSING_HOUR.
export const OPENING_HOUR = 8;
export const CLOSING_HOUR = 18;
export const ALLOWED_DURATIONS_HOURS = [1, 2];

// A slot ID is a device and an hour: projector-1_2026-08-11T14
//
// The hour part is ISO-8601 truncated to the hour, which means it sorts the same
// lexicographically as chronologically: "T09" before "T14" as strings and as
// times. That matters if slot IDs ever get range-queried.
export function slotId(deviceId, isoHour) {
  return `${deviceId}_${isoHour}`;
}

// The caller passes a pre-formatted isoHour string, but the format still has to
// live in one place or two callers will format it differently and produce a
// phantom free slot. So this is the only function allowed to produce one.
//
// Note it does NOT use toISOString(). That converts to UTC, and Morocco is
// UTC+1, so 14:00 local would come out as "T13". The slot would be created at
// the wrong hour and nothing would look broken.
export function isoHour(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-` +
    `${pad(date.getMonth() + 1)}-` +
    `${pad(date.getDate())}` +
    `T${pad(date.getHours())}`
  );
}

// Every hour a booking occupies. A 2-hour booking claims two slots, and they
// must all be claimed in one writeBatch or none.
export function hoursInBooking(startTime, durationHours) {
  const hours = [];
  for (let i = 0; i < durationHours; i++) {
    const h = new Date(startTime);
    h.setHours(h.getHours() + i);
    hours.push(isoHour(h));
  }
  return hours;
}

// Every slot ID a booking needs to claim.
export function slotIdsForBooking(deviceId, startTime, durationHours) {
  return hoursInBooking(startTime, durationHours).map((hour) =>
    slotId(deviceId, hour),
  );
}

export function validateBooking({ startTime, durationHours }) {
  if (startTime.getMinutes() !== 0 || startTime.getSeconds() !== 0) {
    return { valid: false, reason: "start must be on the hour" };
  }

  const startHour = startTime.getHours();

  if (startHour < OPENING_HOUR) {
    return { valid: false, reason: "start is before opening" };
  }

  if (!ALLOWED_DURATIONS_HOURS.includes(durationHours)) {
    return { valid: false, reason: "duration must be 1 or 2 hours" };
  }

  if (startHour + durationHours > CLOSING_HOUR) {
    return { valid: false, reason: "end is after closing" };
  }

  return { valid: true };
}