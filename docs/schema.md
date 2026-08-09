# Schema

Five root collections, plus one subcollection planned for later. Everything is
root level because every screen queries across parents: the manager sees all
bookings across all trainers, the trainer browses all types. Nesting under one
parent would make those queries impossible.

## users/{uid}

- name: string
- email: string
- role: "manager" | "trainer"

No password field. Firebase Auth stores that, not Firestore. Role is stored
twice: once as a custom claim (Auth reads this for rules) and once here (app
UI reads this to list managers etc). The claim is the one rules trust. This
field is just for the UI.

## types/{id}

doc id is the type name, e.g. types/projector

- name: string
- category: string

Just reference data. Nothing about bookings here.

## equipment/{id}

- typeId: string, points to types/{id}
- status: "in_service" | "out_of_service"

One doc per physical device, not a count. Decided this in questions.md item 8:
a broken device needs to come out of service on its own, and the booking has to assign one specific free device,
not just decrement a number.

## bookings/{id}

- trainerId: string
- typeId: string
- equipmentId: string
- startTime: Timestamp
- endTime: Timestamp
- status: "pending" | "approved" | "refused" | "returned" | "canceled"
- createdAt: Timestamp
- returnedAt: Timestamp | null
- urgent: boolean
- urgentReason: string (empty string "" if not urgent ,same reasoning: always present)
- damaged: boolean (false by default)
- damagePhotoUrl: string | null

startTime is always on the hour. endTime is startTime plus 1 or 2 hours.
Centre hours 08:00 to 18:00, so the latest start is 17:00 for one hour and
16:00 for two. Enforced in rules, not only in the UI. 

One doc for the whole lifecycle, pending through returned. Firestore can't
join, so if the manager's "who has what" screen needs it, it has to be on
this doc. Not splitting returns into their own collection for that reason.

## slots/{deviceId}_{isoHour}

The document ID is computed, not generated: `projector-1_2026-08-11T14`. Its
existence means that device is taken for that hour.

- bookingId: string

One field, and never a trainerId. Two reasons this collection exists at all,
both from the spike (see decisions.md, 9 August):

Rules cannot hide fields, so a document is either fully readable or not readable
at all. Bookings carry trainerId and stay private to their owner, so a trainer
cannot read bookings to find out which slots are taken. This collection carries
no owner, so trainers can read it.

And creating a document that must not already exist is atomic, so two trainers
booking the same device for the same hour cannot both succeed. The client SDK
cannot query inside a transaction, so this is what makes the write safe.

Device and hour are not repeated as fields because the ID already encodes them.
A 2-hour booking creates two documents, claimed in one writeBatch so it gets all
its hours or none.

This duplicates the device-and-hour relationship that bookings already holds.
The booking document is the source of truth; slots is an index derived from it.
Both are written by the same code path, in one module, so nothing else can make
them disagree. If they ever do, the booking wins and the slot is the bug.

## Planned

users/{uid}/tokens/{tokenId}

- token: string
- createdAt: Timestamp

FCM device tokens for push notifications. One subcollection per user, since a
user can have multiple devices and tokens rotate. Came up while deciding
collection structure; not needed until the notifications work starts.
