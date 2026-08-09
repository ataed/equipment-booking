# Sprint 0 runbook

Sprint 0 exists to make Sprint 1 startable: infrastructure that lets a story be
tested, a settled mechanism for the risky part, and frozen contracts so two
people could build in parallel. The split document is the last thing out, not
the point.

Steps in order. One open at a time alongside NOTES.md. Close this when Sprint 0
is done.

1. ~~Next app scaffolded, Vitest green in CI.~~ Done 8 August.
2. Firebase project, emulator running locally, `firebase emulators:start` works.
3. The spike. One day, hard stop. Two clients create a document at a
   deterministic ID for the same device and hour, simultaneously. Does one get
   refused? If yes, that's the availability structure. If no, fall back to a
   callable function using the Admin SDK, which can query inside a transaction.
4. Write the result in decisions.md: which shape, why, what I observed. Delete
   the spike code.
5. The serialised commit, one commit, kept small because on a real team everyone
   waits for it:
   - booking document shape, frozen, in a file both lanes import
   - availability structure shape, frozen, output of step 3
 - firestore.rules: add a match block for the availability structure if the
     spike creates a new collection. The skeleton landed 8 August.
   - seed.js: 2 managers, 3 trainers with claims, types, equipment, and 3
     pending bookings, plus whatever the availability structure needs
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