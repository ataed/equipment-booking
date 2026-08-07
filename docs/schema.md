# Schema

Four root collections, plus one subcollection planned for later (see bottom). Every screen queries across parents
(manager sees all bookings, trainer browses all types) so nesting under one
parent doesn't work here.

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
- status: "in_service" | "out_for_repair"

One doc per physical device, not a count. Decided this in questions.md item 8:
a broken device needs to come out of service on its own, and the booking
transaction has to assign one specific free device, not just decrement a
number.

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

One doc for the whole lifecycle, pending through returned. Firestore can't
join, so if the manager's "who has what" screen needs it, it has to be on
this doc. Not splitting returns into their own collection for that reason.

## Open question

Not decided yet: copy equipment/type name onto the booking so the trainer's
"my bookings" screen skips a second query. Coming back to this once that
screen's query is actually written.

## Planned

users/{uid}/tokens/{tokenId}

- token: string
- createdAt: Timestamp

FCM device tokens for push notifications. One subcollection per user, since a
user can have multiple devices and tokens rotate. Came up while deciding
collection structure; not needed until the notifications work starts.
