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
6. ~~`docs/work-split.md`.~~ Done 10 August, after story 1 rather than before.
   Built the file table first: what each story creates, edits, reads and writes —
   then read the lanes off it. Three collision points and nothing else:
   `firestore.rules` in all four stories, `app/trainer/page.js` in two, and
   `lib/slots/` in two.
7. ~~Story 1.~~ Done 9 August. Four of five criteria; criterion 4 needs a
   manager-only document, which does not exist until story 5.

**Sprint 0 closed.** Sprint 1 in progress on three lane branches.

While on a story, no file gets created unless that story needs it to pass its
own criteria today. Story 1 is sign-in: no bookings collection, no booking
helpers, no manager dashboard scaffold. It will feel wasteful. That feeling is
the layers habit.

## Waiting on

- Playwright: one end to end test after story 5, covering the whole loop across
  both roles. Needs the dev server, the emulator and seeded data, so it goes in
  its own CI job.

- After Sprint 1: deploy to Vercel with a real Firebase project as staging. That
  is where composite indexes, claim propagation timing and cold starts show up,
  none of which the emulator proves.

- Story 5: decide how a slot is released when a booking is refused. Three known
  options, no spike needed. Deferred because building stories 1 to 4 will make
  the choice clearer.

- Sprint 2 note: Cloud Storage requires the Blaze plan since February 2026, so the
  damage-photo story needs a billing account attached even though usage stays
  within the free quota. Cloud Functions too, which affects the scheduled
  auto-refuse. Another argument for Sprint 2 being the cuttable half.