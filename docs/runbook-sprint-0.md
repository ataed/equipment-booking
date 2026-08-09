# Sprint 0 runbook

Sprint 0 exists to make Sprint 1 startable: infrastructure that lets a story be
tested, a settled mechanism for the risky part, and frozen contracts so two
people could build in parallel. The split document is the last thing out, not
the point.

Steps in order. One open at a time alongside NOTES.md. Close this when Sprint 0
is done.

1. ~~Next app scaffolded, Vitest green in CI.~~ Done 8 August.
2. ~~Firebase project, emulators running, deny-by-default rules.~~ Done 8 August.
3. ~~The spike.~~ Done 9 August. Five experiments, not one: create-only refusal,
   a real race, batch atomicity, the device loop, and two trainers at the same
   instant. Deterministic slot IDs hold. The Cloud Function fallback was not
   needed.
4. ~~Result written in decisions.md.~~ Done 9 August. Kept the spike script in
   `spikes/` with a README rather than deleting it, since it is the evidence.
5. ~~The frozen contracts.~~ Done 9 August. Landed as several commits rather than
   one, since nobody was waiting on it:
   - `lib/contract.js`: booking statuses, legal transitions, role claim,
     equipment status, slot ID format, and a validator with five unit tests
   - `slots` shape frozen: `{deviceId}_{isoHour}`, one field `bookingId`, never a
     trainerId
   - `firestore.rules`: the real `slots` block, create-only with auth, covered by
     five rules tests
   - `scripts/seed.mjs`: 2 managers, 3 trainers with custom claims, 4 types,
     7 devices, 3 pending bookings with their slot documents, plus a collision
     check so an accidental overlap throws instead of silently overwriting
   - `firestore.indexes.json`, empty but committed
   - Playwright: **not done.** Deferred to story 1, because an end to end test
     needs a page worth testing and asserting on the default Next page proves
     nothing.
6. `docs/work-split.md`. **Deferred until after story 1.** Drafted and not
   committed. I have not built a Next plus Firebase app before, so I cannot say
   which files a story actually touches or where two people would tread on each
   other. Reasoning about ownership of directories that do not exist yet produces
   a document I cannot defend, and committing one I cannot explain is worse than
   not having it. Story 1 makes it concrete.
7. Story 1.

While on a story, no file gets created unless that story needs it to pass its
own criteria today. Story 1 is sign-in: no bookings collection, no booking
helpers, no manager dashboard scaffold. It will feel wasteful. That feeling is
the layers habit.

## Waiting on

- Around 10 August: rerun `npm audit fix`. The nanoid fix (3.3.17, published
  3 August) falls outside the 7-day cooldown then.

- Story 1, then: write `docs/work-split.md` against the file layout that actually
  exists. What is already settled and does not depend on the layout: the
  dependency order, that the seeded pending bookings let the approve screen be
  built without waiting for the booking write, that `lib/contract.js` is frozen
  before any lane starts, and that `firestore.rules` needs a single owner because
  every story modifies it. What is uncertain is only the paths.

- Story 5: decide how a slot is released when a booking is refused. Three known
  options, no spike needed. Deferred because building stories 1 to 4 will make
  the choice clearer.