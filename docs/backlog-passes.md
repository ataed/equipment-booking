# Backlog passes

Per-story analysis that produced the sprint order. Method is in NOTES.md.
Each story answers the questions alone. No story is compared to another.

Journey: a trainer gets equipment reserved without WhatsApp.
Browse, book, see the outcome, manager approves.

P1: Yes / No / Covered / Split : does the journey break without this story?
P2: what must exist before this story can start
P3: High / Low / Isolated : if I'm wrong about this, how much has to be rebuilt?
P4: what sits on top of it

| # | Story | P1 | P2: what must exist first | P3 | P4 |
|---|---|---|---|---|---|
| 1 | Trainer sees available equipment | Yes | row 16, seeded equipment and types (Sprint 0) | Low | row 2 |
| 2 | Trainer books equipment for a slot | Yes | row 1, two decisions from questions.md (pending holds the slot, trainer picks a type not a device), the brief's max 2 bookings rule, and the fixed-slots decision | High | rows 3, 7, 8, 9, 12 - everything that reads a booking |
| 3 | Trainer sees own bookings | Yes | row 2 | Low | rows 4, 5 |
| 4 | Trainer cancels a booking | No | rows 2, 3 | Low | nothing |
| 5 | Trainer receives a push notification on approval | No | rows 3, 8, plus FCM tokens per device | Isolated | nothing |
| 6 | Trainer attaches damage photo | No | row 12, plus Cloud Storage and storage rules | Isolated | row 13 |
| 7 | Manager sees all bookings | Split | the pending list is a task inside row 8. The full history screen is a separate Sprint 2 story and nothing needs it | Low | nothing |
| 8 | Manager approves or refuses | Yes | row 2, manager role from custom claim | High | rows 5, 9, 12 |
| 9 | Manager sees who has which equipment now | No | rows 8 and 12, nobody holds equipment until it is approved, and the list only ever grows without return | Low | nothing |
| 10 | Manager notified of urgent booking | No | row 5, plus the urgent flag and reason on the booking | Isolated | nothing |
| 11 | Manager lists or removes equipment | Covered | the Sprint 0 seed script provides the equipment data. The admin UI is optional for now | Low | nothing |
| 12 | Manager marks equipment returned | No | row 8 | Low | rows 6, 9, 13 |
| 13 | Manager takes device out of service | No | row 12 | Low | nothing. The filter that hides out-of-service devices is a task inside row 2, only the manager's toggle waits here |
| 14 | Manager creates trainer accounts | Covered | the Sprint 0 seed script creates accounts with custom claims. The admin UI is optional for now | Low | nothing |
| 15 | Pending bookings auto-refuse | No | row 2, plus a scheduled function and a billing plan that allows it | Isolated | nothing |
| 16 | Sign-in and role routing | Yes | seeded accounts with custom claims (Sprint 0) | High | every row |

## Decisions the passes forced

**Rows 3 and 5.** The journey says the trainer sees the outcome. Both were No on
the first pass, which would leave nothing delivering the outcome at all. The
trainer needs to know the result, not to be pushed the result: a status field on
the bookings list delivers it. So row 3 is Yes and row 5 is No, because FCM is a
delivery mechanism sitting on top of information that already exists.

Row 5 was reworded as a consequence. It is no longer "notified when approved", it
is "receives a push notification instead of having to open the app". Smaller
story, and honest about what it adds.

**The journey sentence was wrong.** It said browse, book, see status, approve,
notify. Notify is a mechanism, not an outcome the loop needs. Leaving that word in
put push notifications in Sprint 1 for no reason. Corrected to "see the outcome".

**Row 3 being Yes creates a contract.** Approve does not just flip a value, it
writes a status that the trainer's screen reads. Both stories depend on the same
field, so its name and its allowed values are frozen before either is built.
schema.md lists five statuses, but only pending, approved and refused can occur in
Sprint 1, since return and cancel are Sprint 2. A rule validating transitions has
to know which transitions are legal now, not eventually.

**Row 7 is a task in disguise and a story at the same time.** Approve cannot work
without a list of pending bookings to approve from, so that list is a task inside
row 8. What remains as a genuine story is the full booking history with past and
filtered bookings, and nothing depends on it. One story split across a task and a
later story.

**Rows 11 and 14 are Covered, not No.** The journey does need equipment data and
trainer accounts. It does not need these stories, because the Sprint 0 seed script
provides both. The distinction matters at cut time: a No story is free to drop
forever, a Covered story is only droppable while the thing covering it still
exists. If this ever ships for real the seed script goes away and both become
mandatory.

**Row 13 splits across sprints.** The manager's toggle is Sprint 2. The filter
that stops an out-of-service device being assigned cannot wait, or row 2 gets built
and then revisited. So the filter is a task inside row 2.

**Sign-in was missing from stories.md.** It was first listed as Sprint 0
infrastructure, which is wrong. Seeded accounts are infrastructure. A login screen
with role routing is user-visible, has AC and has rules, so it is a story. Added as
row 16. Marked High because putting the role in the wrong place changes every rule
in the project.

## Reverse check on the No rows

For each No: does any Yes row need it?

- 4, 5, 6, 9, 10, 12, 15 : no Yes row needs any of them. Confirmed No.
- 12 is needed by 9, but 9 is also No, so nothing moves into Sprint 1.

Row 7 was Yes on the first pass and failed this check, since row 8 needs only part
of it. Reclassified as Split.

## Needed by a story but not a story itself

Sprint 0 work.

- Seeded trainer and manager accounts with custom claims (rows 16, 1, 8, covers row 14)
- Seeded equipment and types (row 1, covers row 11)
- Seeded pending bookings, so row 8 can be built without waiting for row 2
- Vitest against the emulator, Playwright, both in CI

## High rows where I don't know the approach

One spike each, in Sprint 0.

- **Row 2.** Assigning a free device atomically: two trainers booking the same type
  for the same slot must get different devices, and no device may ever be
  double-assigned. Both pending and approved bookings block a slot. The spike
  answers how, and the answer goes in decisions.md before row 2 is built.

Rows 8 and 16 are also High, but the risk there is a contract, not an unknown
technique. Row 8 needs the status values and legal transitions written down first.
Row 16 needs the decision that role comes from a custom claim, never from a
user-writable field. No spike for either, only the decision recorded.

## Resulting order

Sprint 1, in dependency order. Goal: a trainer books equipment and sees whether the
manager approved it, without anyone opening WhatsApp.

1. Sign-in and role routing (row 16). Blocks everything.
2. Trainer sees available equipment types (row 1).
3. Trainer books a type for a slot, system assigns a free device (row 2). High
   risk, spike first.
4. Trainer sees own bookings with status (row 3).
5. Manager approves or refuses (row 8). Includes the pending list as a task.

4 and 5 both depend on 3 and on nothing from each other. That is the parallel lane,
and the booking document shape is the contract between them.

Sprint 2, ordered by value. Cut order is this list read from the bottom up.

1. Trainer receives a push notification when a booking is decided (row 5).
   Committed scope: not core loop, the status field already delivers the outcome. It
   sits at the top because FCM is one of the skills this project exists to
   demonstrate. Built only if Sprint 1 lands early. That is a portfolio reason, not
   a sprint-logic reason, and the two are kept separate deliberately.
2. Manager marks equipment returned (row 12).
3. Trainer attaches a damage photo (row 6).
4. Manager takes a device out of service (row 13). Toggle only, the filter shipped
   in Sprint 1.
5. Manager sees who has which equipment now (row 9).
6. Trainer cancels a booking (row 4).
7. Manager notified of an urgent booking (row 10). cuttable
8. Manager full booking history (row 7). cuttable
9. Equipment list and remove UI (row 11). cuttable, covered by the seed script
10. Trainer account creation UI (row 14). cuttable, covered by the seed script
11. Pending bookings auto-refuse (row 15). cuttable, nothing depends on it

Sprint 1 never gets cut. If Sprint 1 is at risk the answer is cutting Sprint 2
entirely, not trimming the loop. Cut whole stories, never half of one.