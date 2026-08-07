
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


## Stories to sprints

A backlog doesn't get ordered by comparing stories to each other. Fourteen
stories compared pairwise is paralysis. Instead each story answers three
questions alone, and the sprint plan falls out.

Question 1, the loop test: if this story doesn't exist, can the user still
complete the one journey the app exists for? 
For this project the journey is: trainer gets equipment without WhatsApp.
Browse, book, see status,approve, notify. Everything that survives the test is Sprint 1.
Everything else waits, no matter how easy or interesting it looks.

Question 2, the dependency pass: what must exist before this story can
start? This catches two traps. Stories that look independent but aren't
(who has what needs approve and return to exist first), and stories that
look needed but are already covered (create accounts is implemented by the
Sprint 0 seed script, the UI for it is optional). It also splits stories
across sprints: out of service is a Sprint 2 story, but the booking
transaction must filter in_service devices from day one, so the filter is
a task inside the Sprint 1 booking story and only the manager's toggle
waits. Write the dependency in both issues or rediscover it at 1am.

Question 3, the risk pass: unknown or scary tech goes as early as its
dependencies allow, so it fails on day 6 when there's time to react, not
day 12. Cuttable risk goes last instead, so cutting it costs nothing
already built. The assignment transaction is early risk. The scheduled
expiry function is late cuttable risk.

A side effect of the loop test: it exposes stories that were really tasks.
Manager sees all bookings failed as a story, but approve can't work
without a pending list, so a minimal pending view is a task inside the
approve story and the full history screen stays a separate later story.
If removing it breaks another story, it was a task in disguise.

Order inside a sprint is dependency order, not importance order. Cut order
is the reverse of the backlog: bottom of Sprint 2 goes first, Sprint 1
never gets cut, and if Sprint 1 is at risk the answer is cutting Sprint 2
entirely, not trimming the core loop.


## The pipeline (when I feel lost, read this)

Every artifact answers one question, and each feeds the next:

brief          -> what does the client want?
questions.md   -> what did they forget to say?
stories        -> what will we build, in user terms?
sprints        -> in what order? (loop test, dependency pass, risk pass)
AC             -> what does "done" mean, checkably?
contracts+lanes-> who builds which piece without colliding?
code           -> the pieces
tests          -> proof each AC is met
CI             -> proof the tests pass on a neutral machine

It's one question asked repeatedly, "how will we know?", pushed down from
vague (client's wish) to mechanical (green checkmark). Rules, tests,
contracts and CI are all the same move: turn a human agreement into
something a machine can check. Firebase and Vitest are just this week's
tools for making the checks run.

Working rule: only two documents are open at a time. The runbook at the
current block, and this file. Everything else is reference, like MDN: you
look things up when a block sends you there, you don't hold it in your
head, and you don't feel bad about that.

Lost is what the start of a pipeline feels like when you can see all of
it. It reverses the first time a red test goes green.