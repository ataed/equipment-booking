
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

A backlog doesn't get ordered by comparing stories to each other. Sixteen
stories compared pairwise is paralysis. Instead each story answers three
questions alone, and the sprint plan falls out.
 
Question 1, the loop test: if this story doesn't exist, can the user still
complete the one journey the app exists for?
For this project the journey is: trainer gets equipment without WhatsApp.
Browse, book, see the outcome, approve. Everything the journey breaks without is Sprint 1.
Everything the journey survives without waits, no matter how easy or interesting it looks.
 
Check every verb in the journey sentence: is it an outcome the user needs,
or a mechanism I already pictured? Mine said "notify", which is a
mechanism. That one word would have put push notifications in Sprint 1 for
no reason. The outcome is that the trainer knows the result, and a status
field on the bookings list delivers it.
 
Question 2, the dependency pass: what must exist before this story can
start? This catches four things.
 
Stories that look independent but aren't (who has what needs approve and
return to exist first).
 
Stories that look needed but are already covered. Create accounts is
implemented by the Sprint 0 seed script, so the UI is optional. Covered is
not the same as No: the journey does need the capability, so the story
becomes mandatory again the moment the thing covering it goes away. A No
story is free to drop forever.
 
Stories that split across sprints. Out of service is a Sprint 2 story, but
the booking transaction must exclude out-of-service devices from day one,
so the filter is a task inside the Sprint 1 booking story and only the
manager's toggle waits.
 
Things a story needs that aren't stories at all. Those are Sprint 0. That
list is a side output of this pass and it grows as you fill rows.
 
Write the dependency in both issues or rediscover it at 1am.
 
Question 3, the risk pass: not "is this unfamiliar" but "if I'm wrong
about this, how much has to be rebuilt?" Unfamiliarity is not risk. When
everything is new the first question gives the same answer on every row
and orders nothing.
 
High means other work sits on top, so it goes as early as dependencies
allow and fails while there's still time to change approach. Isolated
means nothing depends on it, so it goes last and cutting it costs nothing
already built. The assignment transaction is High: five stories read the
booking document. FCM is Isolated, and it stays last even though I've
never done it, because nothing sits on top of it.
 
Unfamiliarity gets handled somewhere else: a spike, time-boxed, in Sprint
0, producing a written decision rather than a feature. That's how "I don't
know how yet" stops contaminating the order.
 
A side effect of the loop test: it exposes stories that were really tasks.
Manager sees all bookings failed as a story, but approve can't work
without a pending list, so a minimal pending view is a task inside the
approve story and the full history screen stays a separate later story.
If removing it breaks another story, it was a task in disguise.
 
The reverse check is what catches it: for every story marked No, does any
Yes story need it? If yes, the first answer was wrong. It only works
because pass 1 was done without thinking about dependencies.
 
Order inside a sprint is dependency order, not importance order. Cut order
is the reverse of the backlog: bottom of Sprint 2 goes first, Sprint 1
never gets cut, and if Sprint 1 is at risk the answer is cutting Sprint 2
entirely, not trimming the core loop. Cut whole stories, never half of
one; half-built costs more than absent.
 
 
## The pipeline (when I feel lost, read this)
 
Every artifact answers one question, and each feeds the next:
 
brief             -> what does the client want?
questions.md      -> what did they forget to say?
stories.md        -> what will we build, in user terms?
backlog-passes.md -> in what order, and why? (loop, dependency, risk)
AC                -> what does "done" mean, checkably?
contracts+lanes   -> who builds which piece without colliding?
code              -> the pieces
tests             -> proof each AC is met
CI                -> proof the tests pass on a neutral machine
 
One home per question. If two files can answer the same question they will
disagree eventually, and then neither is trustworthy. The sprint order lives
with the reasoning that produced it, not in a file of its own.
 
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


## Order: spike before split

Work can only be split once the contracts two people would both touch are
frozen. If a structure is still undecided, splitting means two people building
against something that does not exist.

So: spike decides the shape, then the contracts get frozen in one serialised
commit, then the lanes fan out. Writing the split document before the spike
produces theory. Written after, it names real files and real frozen shapes.

Found this the hard way: the availability structure two lanes would both write
to was sitting behind a deferred decision, invisible to the split.


## Writing acceptance criteria

- The screen is not a security boundary. Rules are. Every story that touches
  data gets a criterion asserting the wrong actor is refused.
- Technique: keep the When fixed, vary the Given. Each variation is a criterion.
- If the expected result differs by actor, it is a separate criterion. If it is
  the same regardless of actor, one criterion is enough.
- 3 to 7 criteria per story. Under 3 usually means the unhappy paths are
  missing. Over 8 usually means the story should be split.
- Do not test Firebase itself. Wrong password behaviour is Auth's job, not mine.
- Sprint 2 stories stay one-liners until Sprint 2 starts. Detail is added at the
  last responsible moment.
  - Every criterion needs the Given to carry the state and the Then to name one
  observable result. "I see all available equipment" cannot be checked, because
  nothing defines available. "Given a type with at least one in-service device,
  then that type is listed" can.
- In the When, use "attempt to" for anything expected to fail. A When that
  asserts the outcome contradicts the Then.