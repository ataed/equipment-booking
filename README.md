# Equipment Booking

[![CI](https://github.com/ataed/equipment-booking/actions/workflows/ci.yml/badge.svg)](https://github.com/ataed/equipment-booking/actions/workflows/ci.yml)

A learning project. I need to learn Firebase, testing in CI, and the planning
side of delivery: requirements, acceptance criteria, splitting work.

Rather than three separate exercises, I generated a client brief and am treating
it as a real engagement: requirements first, then planning, then code.

## Documents

In the order they were written, since each one feeds the next.

- `docs/client-brief.md` - the requirement. AI-generated, deliberately flawed.
- `docs/questions.md` - what I found wrong or missing in it, and what I decided
  in the absence of a client.
- `docs/schema.md` - Firestore collections and why they are shaped that way.
- `docs/stories.md` - what gets built, grouped by sprint.
- `docs/backlog-passes.md` - how the sprint order was decided. Three questions
  asked of each story alone, and what the answers changed.
- `docs/sprint-1-ac.md` - Given/When/Then for the five Sprint 1 stories.
- `docs/sprint-2-ac.md` - the same for the three Sprint 2 stories that were built.
- `docs/work-split.md` - how the booking loop divides between three developers,
  read off a table of which files each story touches.
- `docs/decisions.md` - choices where a reasonable person could have gone the
  other way, with the reason and the cost.
- `docs/retro.md` - what took longer than expected, what should have been found
  during planning, and what I would change.
- `docs/NOTES.md` - my working notes. Method, not project state.
- `docs/runbook-sprint-0.md` - the steps for Sprint 0, in order. Closed.
- `spikes/` - throwaway scripts that answered one question each. Conclusions in
  `docs/decisions.md`.

## Sprints

Sprint 0, done. Emulators, CI, seed data, the frozen contract, and one spike to
settle how a free device gets assigned without two trainers getting the same one.

Sprint 1, shipped and deployed. The core loop: a trainer books equipment and sees
whether the manager approved it, without anyone opening WhatsApp. Built as three
lanes off the file table in `docs/work-split.md`.

Sprint 2, three stories. The manager creates trainer accounts from the app, a
trainer gets a push notification when a booking is decided, and a trainer attaches
a damage photo. Not split: the split was demonstrated once and repeating it alone
is practice rather than evidence.

Seven backlog stories are not built. They are ordered with a cut order in
`docs/backlog-passes.md`, and they are more CRUD against patterns the earlier
stories already show. Stopping was a choice rather than running out of time.

## Running it

Needs Node 24 and Java 21. Java because the emulators are Java programs.

```
npm ci
cp .env.example .env.local
npx firebase emulators:start        # terminal 1
node scripts/seed.mjs               # terminal 2, after every emulator restart
npm run dev                         # terminal 2
```

Emulator data is in memory, so the seed runs again every time the emulator does.
Sign in with any seeded email, password `test1234`.

```
npm run test:emulator    unit and rules tests, starts the emulators itself
npm run test:e2e         the browser tests, start the dev server too
npm run test:e2e:ui      the same, in Playwright's inspector. For writing tests, not CI.
```

## Tests

Three kinds, each answering something the others cannot.

- unit, a pure function with no database. The booking validator.
- rules, does the emulator refuse the wrong actor. No browser, milliseconds. Most
  of the test suite, because rules are the only thing actually stopping anyone.
- browser, does a write by one role show up on another role's screen. Two tests,
  and the only kind that can check the parts fit together.

Two CI jobs, so a browser flake is visibly a different failure from a rule
breaking.

**The gap:** almost nothing tests that the modules do what the rules permit. Both
silent bugs this project had lived there, and so does the damage upload. See
`docs/retro.md`.

## Dependency hygiene

Set up during the ChainDrop campaign (August 2026), when a compromised maintainer
account published malicious versions across the keyv and cacheable namespaces
with valid provenance signatures, so the signed "verified" badge proved nothing.

- `ignore-scripts=true` in `.npmrc`. Install-time lifecycle scripts do not run,
  which is the execution path those attacks use. Anything that genuinely needs
  one gets `npm rebuild <pkg>` deliberately, or its own command: Playwright's
  browser download is the one package here that needed it.
- `min-release-age=7`. No package version younger than a week gets installed,
  transitive ones included. Most malicious versions are detected and pulled
  within hours.
- `save-exact=true` and a committed lockfile. CI runs `npm ci`, so nothing
  published after a commit can enter a build of that commit.
- CI runs against emulators and holds no secrets, so a compromised dependency in
  the pipeline has nothing to steal.

If an install fails with a missing binary, that is `ignore-scripts` working.
Run that package's script deliberately rather than removing the setting.

Open audit advisories and why they are accepted: `docs/decisions.md`.

## Environment

`NEXT_PUBLIC_USE_EMULATORS` must equal `true` to connect to the local
emulators. Anything else, including unset, means the real project. Opt-in rather
than derived from `NODE_ENV`, because a misspelled variable silently pointing a
dev machine at production is the failure worth making impossible.

The other `NEXT_PUBLIC_FIREBASE_*` values are not secret. They are inlined into
the browser bundle at build time and visible in any network tab. Rules protect the
data, not those.

`FIREBASE_SERVICE_ACCOUNT` is a real secret and the only one here. It is what lets
the Admin SDK create accounts and send push notifications from a route handler. Not
`NEXT_PUBLIC_`, never committed, set as an encrypted variable on Vercel.

`scripts/seed.mjs` hardcodes the emulator hosts so it can never touch a real
project. `scripts/seed-real.mjs` is a separate file for that, and it refuses to run
without an explicit credential or if the emulator host vars are set.

## Status

Deployed and working: sign in by role, browse equipment, book a type and get a
device assigned, see the status, approve or refuse, create trainer accounts, and a
push notification when a booking is decided.

**Storage runs against the emulator only.** Cloud Storage needs the Blaze plan, so
the damage photo works locally and is hidden in the deployed app. The rules are
written and tested; the bucket is not provisioned.

Still not usable by a real centre: no return, no cancel, no equipment management,
and a damaged device stays bookable because taking it out of service is a story
that was not built.