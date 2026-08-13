# Work split

How the equipment booking loop divides between three developers without
collisions. Written after story 1 landed, not before: I could not say which files
a story touches until I had built one, and a split written against directories
that do not exist yet is a document I could not defend.

## How I got here

I listed what each story creates, edits, reads and writes. Then two questions:
which files does only one story touch, and which do several. The first set is safe
to divide. The second set needs an owner or a rule. Everything below falls out of
that table.

| Story | Creates | Edits | Reads | Writes |
|---|---|---|---|---|
| 2 trainer sees equipment | `app/trainer/equipment/page.js`, `lib/equipment/list.js`, `tests/rules/equipment.test.js` | `firestore.rules`, `app/trainer/page.js` | `types`, `equipment` | nothing |
| 3 trainer books a type | `app/trainer/booking/page.js`, `lib/slots/claim.js`, `lib/bookings/create.js`, `tests/rules/bookings-create.test.js`, `tests/slots.test.js` | `firestore.rules`, `docs/schema.md`, `scripts/seed.mjs`, `tests/rules/slots.test.js`, `lib/contract.js`, `lib/bookings/decide.js` | `equipment` | `bookings`, `slots` |
| 4 trainer sees own bookings | `app/trainer/my-bookings/page.js`, `lib/bookings/mine.js`, `tests/rules/bookings-read.test.js` | `firestore.rules`, `firestore.indexes.json`, `app/trainer/page.js` | `bookings` | nothing |
| 5 manager approves or refuses | `app/manager/bookings/page.js`, `lib/bookings/decide.js`, `tests/rules/decide.test.js` | `firestore.rules`, `firestore.indexes.json`, `app/manager/page.js`, `lib/slots/` | `bookings`, `users` | `bookings` status, `slots` release |

Story 1 is not in the table. It is not lane work, it is serialised: every screen
imports `useAuth` and `RequireRole`, so nothing else could start until it landed.
Same category as `lib/contract.js` and the seed script.

Story 3's row is corrected after building it. The table predicted one edit,
`firestore.rules`. It was six. The schema and seed changed because two decisions
arrived mid-story, `lib/contract.js` gained a guard, `slots.test.js` needed a test
renamed once the delete rule changed, and `decide.js` is another lane's file.

## What the table found

**Three collision points, and nothing else.**

`firestore.rules` appears in all four rows. Every story opens something. One file,
so one owner.

`app/trainer/page.js` appears in stories 2 and 4. Both add a link to their own
screen, both in the same place in the file.

`lib/slots/` appears in stories 3 and 5. Story 3 claims slots, story 5 releases
them on refuse. schema.md says slots have a single write path in one module, so
these two cannot each write their own.

Everything else is one story per file. Four screens, five modules, four test
files, no overlap. That is what made the division possible rather than something
I imposed.

**No write overlap between lanes on the data either.** Story 2 writes nothing.
Story 3 writes bookings and slots. Story 5 writes only a booking's status. Story 4
writes nothing. So two lanes can never be writing the same document.

## The lanes

**Dev A, browsing.** Story 2. Reads `types` and `equipment`, writes nothing. Owns
`app/trainer/equipment/**` and `lib/equipment/**`.

**Dev B, the write path.** Story 3. Writes `bookings` and `slots`. Owns
`app/trainer/booking/**`, `lib/bookings/create.js`, and `lib/slots/**`.

**Dev C, the decision path.** Stories 4 and 5. Reads bookings, writes only status.
Owns `app/trainer/my-bookings/**`, `app/manager/**`, `lib/bookings/mine.js` and
`lib/bookings/decide.js`.

Uneven on purpose. C has two stories because both are a query plus one field
update, which is less work than B's one story. B's story is the riskiest thing in
the sprint and it is where the spike's findings get turned into real code.

## Why nobody waits

**Dev C is not blocked by dev B.** This is the whole reason the seed script creates
three pending bookings. Without them, the approve screen has nothing to approve
and dev C waits for dev B to finish the booking write. With them, dev C starts at
minute one against real data and never touches dev B's code.

That is a dependency removed by data rather than by waiting, and it was decided
during the dependency pass in backlog-passes.md, before any of this existed.

**Dev B is not blocked by dev A.** Dev B needs equipment documents, not dev A's
screen. The seed provides seven devices across four types. Both lanes query the
same collection and neither imports the other.

**Everyone needs story 1**, which is already merged.

## The three collision points, resolved

**`firestore.rules`. Dev B owns it.**

Every story needs rules and every story would otherwise append a match block to
the same file. Three people doing that conflicts on every merge, and worse, a
merge resolution can silently drop a condition, which fails open.

Dev B owns it because dev B's story has the most rules work by far: validation,
slot conflict, the out-of-service filter, the two-booking cap, owner-from-token.
Five of the eleven rules criteria in this sprint.

A and C request a rule by writing a failing rules test in their own test file and
telling B what has to be permitted. The test going green is the handover. Same for
`firestore.indexes.json`.

**`app/trainer/page.js`. One nav list, append only.**

Stories 2 and 4 both add a link. The rule: append at the end, never reorder, never
touch another lane's line. A conflict here is trivial to resolve, unlike a rules
conflict, so this needs a convention rather than an owner.

**`lib/slots/`. Dev B owns it, and dev C depends on it.**

Dev B builds `claimSlots` for story 3 and `releaseSlots` for story 5, then dev C
imports the second one. Two functions, one module, one write path, so slots and
bookings cannot drift.

This is a real dependency, not one the seed can remove: dev C's refuse cannot
fully work until B has shipped the release function. So dev C builds approve
first, which needs no slot write, and refuse second.

**And the release mechanism is still undecided.** The rule currently denies delete
on slots. Three options in decisions.md, deferred to story 5. So the signature is
frozen before the mechanism is chosen, which is the point: a contract can be
frozen when the mechanism is decided, and this one has to be decided before dev C
can finish. It is B's first task in story 5's territory.

## Frozen before anyone starts

All of this existed before the lanes:

- `lib/contract.js`: statuses, legal transitions, role claim, equipment status,
  slot ID format, the validator. Adding an export is fine. Changing an existing
  value needs all three lanes to agree, because all three import it.
- `scripts/seed.mjs`: any lane appends its own data, nobody edits another lane's
  entries. The collision check in `createBooking` makes an accidental overlap throw
  instead of silently overwriting slots, which is the failure that would otherwise
  break another lane's tests from inside your commit.
- `lib/firebase/client.js`, `lib/auth/AuthProvider.js`, `components/RequireRole.js`
: story 1's output. Imported by everyone, edited by nobody.
- `.field` and `.btn` in `globals.css`: so three people's forms look the same
  without needing a shared component.

**The one signature that has to be agreed between B's own two pieces:**

    claimSlots(deviceId, startTime, durationHours, bookingId) -> void, throws if taken
    releaseSlots(deviceId, startTime, durationHours) -> void

`lib/bookings/create.js` calls the first without knowing how it works. Dev C's
`decide.js` calls the second the same way. Freeze those two lines and story 3 can
itself be split in two.

## No shared components in this sprint

Each lane builds its own screens inside its own paths. Story 4's booking row and
story 5's pending row will duplicate, because they look similar and are not the
same: the trainer sees status, the manager sees which trainer requested it.
Designing one component from one case produces props for both and conditionals
inside, which is worse than two simple files. Extract after both exist, if a third
case appears.

## Sequencing

Minute one: A starts story 2, B starts story 3, C starts story 5's approve path.
Nobody waits.

Then C moves to story 4, and to story 5's refuse once B's `releaseSlots` lands.

The one serial point is integration. Story 4 renders a booking story 3 created and
story 5 decided. Nothing makes that fit automatically; it fits because all three
built against the same contract. The integration pass is where that assumption gets
tested, and it belongs to whoever finishes first rather than being nobody's job.
That is also where the first end to end test goes, since a browser test crossing
two roles is the only thing that can check it.

## The three kinds of collision, and which mechanism stops each

**Dependency collision.** B cannot start until A finishes. A waiting problem, not a
merge problem. Stopped by the seeded pending bookings, and by the observation that
dev B needs equipment documents rather than dev A's screen.

**File collision.** Two people editing the same file. Stopped by the ownership
table, and specifically by `firestore.rules` and `lib/slots/` each having one
owner.

**Contract collision.** Two people building against different assumptions about the
same data. Nothing conflicts in version control, both branches pass their own
tests, and it breaks on merge. The expensive one, invisible until it is not.
Stopped by `lib/contract.js` being frozen before any lane started, which is why the
spike had to come before this document.

## Executing this alone

I run the lanes in sequence, one branch each, named for the lane, with a pull
request per story into `develop`.

The constraint I hold: if a branch touches a file outside its lane, the split was
wrong, and I fix this document rather than quietly widening the lane. The branch
names and the diffs are checkable against the table above.

Lanes never merge into each other. Each merges into `develop`. If one lane needs
something another built, that lane merges to `develop` first and the other pulls
`develop` down. One direction only.


## Known weaknesses

**The seed dates bookings relative to when it runs**, so slot IDs change daily.
The seed is for clicking around, not for assertions. Rules tests build their own
data with `authenticatedContext` for this reason, and browser tests must query for
what exists rather than assuming a date.

**Dev B is a bottleneck.** They own the riskiest story, all of `firestore.rules`,
and `lib/slots/` which dev C needs. On a real team I would move rules ownership to
whoever has the lightest story, but here B's story is where five of the eleven
rules criteria live, so splitting rules ownership away from it means the owner
writes rules for code they have not seen.

**No staging environment.** Everything runs against emulators. So this split is
untested against the things emulators do not prove: composite indexes existing in
a real project, custom claim propagation timing, cold starts.