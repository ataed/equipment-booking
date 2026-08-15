# Retro

Written at the end, across Sprint 0, 1 and 2. Three questions.

## What took longer than expected

The planning, by a wide margin. The code was the easy part throughout.

Sprint 0 was four days and produced no feature: a brief, questions, a schema,
sixteen stories, an ordering analysis, acceptance criteria for five of them, one
spike, a seed script, and a frozen contract. Sprint 1's five stories were built in
about two.

That ratio is uncomfortable and I think it was right. Every decision that made the
code easy was made during those four days. The booking write is short because the
spike had already settled how conflict detection works, and the three lanes never
collided because the contract was frozen before any of them started.

What I would not repeat: writing acceptance criteria for stories I later cut. I
wrote them for all ten Sprint 2 stories and built three. The rule I already had
written down, detail at the last responsible moment, is one I ignored the first time
I had the chance.

## What was discovered mid-sprint that should have been found in planning

Four things, and they are all the same shape.

**Rules cannot query.** So the two-booking cap could not be a rule, and needed a
counter on the user document that the rule reads instead.

**Rules evaluate timestamps in UTC.** Morocco is UTC+1, so a rule reading
`startTime.hours()` sees 13 for a 14:00 booking. The booking document needed
`startHour` and `durationHours` as plain integers for the rule to validate.

**Storage rules cannot read Firestore.** No `get()` into the database, so a rule
cannot check that a booking exists or belongs to the uploader. The uid had to go in
the storage path so ownership is checkable without a lookup.

**Emulator state persistence across services**. We used `resource == null` as the documented 
pattern for a create-only Storage rule, but it kept unexpectedly failing in manual browser tests.
I discovered that while our seed.mjs script wiped the Firestore database cleanly, 
it left the Storage emulator bucket untouched. The rule wasn't broken; it was successfully blocking overwrites
of orphaned files from previous test runs. A great lesson in ensuring test teardowns cover all emulated services, 
not just the database.

Every one of them is a platform constraint that only surfaces when you sit down and
write the rule. None of them appeared while writing stories, criteria, or the
schema. Three of the four changed the schema after it was frozen.

## What I would change

**Write one rule during planning, not after.** Not the whole file, one rule for the
riskiest story, as a spike. An hour would have surfaced the query limitation and the
UTC one, both of which changed the booking document after the contract was supposed
to be frozen.

The spike I did run was about the write path, and it was the right call: it settled
the whole slots design. But it tested the SDK, not the rules language. The next
project gets both.

**Test the layer between the rules and the screen.** My tests are either pure
functions with no database, or rules exercised directly with `authenticatedContext`.
Nothing tests that my modules do what the rules permit, and both silent bugs in this
project lived exactly there.

Refuse released no slots, because a field was missing and an empty batch committed
successfully. Refuse never decremented the counter, because nobody wrote the line.
In both cases the rule was correct, every test passed, and the app was wrong. I found
both by clicking.

The damage upload is a third instance waiting: the storage rules are tested and the
Firestore write that follows the upload is not covered by anything.

What would catch them is a test that calls the real function against seeded data and
then reads the database back. Slower than a rules test, narrower than a browser test,
and the layer I have none of.

## What the split taught me, including where it broke

The lanes came off a table of which files each story creates, edits, reads and
writes. Three collision points and nothing else: `firestore.rules`, one owner;
`app/trainer/page.js`, append only; `lib/slots/`, one owner and another lane imports
it.

Two things worked exactly as intended. The predicted conflict in
`app/trainer/page.js` happened, and resolving it took thirty seconds. And the seeded
pending bookings meant the approve screen was built from minute one without waiting
for the booking write, which was decided during the dependency pass before any of
this existed.

**Where it broke:** a decision in one lane created work in another lane's
already-merged file. The booking cap needed the counter decrementing on refuse, and
`decide.js` had shipped days earlier. No mechanism in the split catches that. File
ownership stops two people editing at once, the frozen contract stops two people
assuming different shapes, and neither stops a contract changing mid-sprint.

I also predicted story 3 would edit one file, `firestore.rules`. It edited six. The
schema and the seed changed because of decisions that arrived mid-story, the contract
gained a guard, a test needed renaming once a rule changed, and one file belonged to
another lane.

The table being wrong is the finding. A split that had been right about everything
would have meant I copied it rather than derived it.

## What I would tell someone starting this

The order matters more than any individual artifact. Every time I tried to skip
ahead, the thing I skipped came back: the split written before the contracts existed
was a document I could not defend, and the criteria written before the mechanism was
decided had to be marked deferred.

And the reverse: the work that felt slowest at the time, questioning the brief and
ordering the backlog, is what made everything after it fast.