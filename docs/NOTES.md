
## Schema / data modeling

Firestore has no schema enforcement. Any document can have any fields, any
types. Nothing stops a typo'd field name or a missing field.

No joins, no populate, no auto-resolving references. A reference field is
just a fancier ID, you still fire a second query yourself to get the data
it points to. This is why denormalization (copying a field into another
doc) exists: to avoid that second query, at the cost of owning consistency
of the copy.

Root collection vs subcollection vs nested field comes down to one
question: what do I query, and across how many parents at once? If a
screen needs data across multiple parents in one query (all bookings
across all trainers, all equipment across all types), it has to be root
level. If it only ever belongs to one parent and is never queried on its
own, subcollection. If it's small and always read with its parent, nest it
as a field.

Denormalized fields need an owner. For every duplicated field, write down
what updates it and when; because Firestore won't do it for you.

Impossible states are a schema smell. Two fields that can produce a
combination that can never actually happen (refused + returned) usually
means one of them should be a value inside the other, not a separate
field.

Missing fields break rules, not just queries. In Security Rules, checking
a field that doesn't exist on the document doesn't evaluate to false, it
errors and denies the request. So every field needs a default value set
at document creation, never left absent.

Schema has zero enforcement power on its own. "urgent: true with an empty
reason" is valid data unless a rule blocks it. Business logic like that
lives in Security Rules, not the schema.