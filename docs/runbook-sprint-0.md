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
5. The serialised commit, one commit, kept small because on a real team everyone
   waits for it:
   - booking document shape, frozen, in a file both lanes import
   - `slots` shape frozen: `{deviceId}_{isoHour}`, one field `bookingId`, never a
     trainerId
   - firestore.rules: add the real `slots` block, create-only with auth
   - seed.js: 2 managers, 3 trainers with claims, types, equipment, and 3
     pending bookings with their slot documents
   - firestore.indexes.json, empty but committed
   - Playwright added to CI alongside Vitest
6. docs/work-split.md, now that the contracts exist.
7. Story 1.

While on a story, no file gets created unless that story needs it to pass its
own criteria today. Story 1 is sign-in: no bookings collection, no booking
helpers, no manager dashboard scaffold. It will feel wasteful. That feeling is
the layers habit.

## Waiting on

- Around 10 August: rerun `npm audit fix`. The nanoid fix (3.3.17, published
  3 August) falls outside the 7-day cooldown then.

- Story 5: decide how a slot is released when a booking is refused. Three known
  options, no spike needed. Deferred because building stories 1 to 4 will make
  the choice clearer.