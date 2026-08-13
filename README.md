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
- `docs/work-split.md` - how the booking loop divides between three developers,
  read off a table of which files each story touches.
- `docs/decisions.md` - choices where a reasonable person could have gone the
  other way, with the reason and the cost.
- `docs/NOTES.md` - my working notes. Method, not project state.
- `docs/runbook-sprint-0.md` - the steps for Sprint 0, in order. Closed.
- `spikes/` - throwaway scripts that answered one question each. Conclusions in
  `docs/decisions.md`.

## Sprints

Sprint 0, done. Emulators, CI, seed data, the frozen contract, and one spike to
settle how a free device gets assigned without two trainers getting the same one.

Sprint 1, shipped. The core loop: a trainer books equipment and sees whether the
manager approved it, without anyone opening WhatsApp.

Sprint 2, not started. The lifecycle: returns, damage photos, push notifications,
and the manager screens the seed script currently stands in for. Ordered in
`docs/backlog-passes.md`, bottom of that list is what gets cut first.

## Running it

Needs Node 24 and Java 21. Java because the Firestore emulator is a Java program.

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
npm run test:emulator    unit and rules tests, starts the emulator itself
npm run test:e2e         the browser test, starts the dev server too
npm run test:e2e:ui      the same, in Playwright's inspector. For writing tests, not CI.
```

## Tests

Three kinds, each answering something the others cannot.

- unit, a pure function with no database. The booking validator.
- rules, does the emulator refuse the wrong actor. No browser, milliseconds. Most
  of the test suite, because rules are the only thing actually stopping anyone.
- browser, does a write by one role show up on another role's screen. One test,
  the whole loop, and the only kind that can check the parts fit together.

52 unit and rules tests, one end to end test, all green in CI. Two jobs so a
browser flake is visibly a different failure from a rule breaking.

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

`NEXT_PUBLIC_USE_EMULATORS` must equal the string `true` to connect to the local
emulators. Anything else, including unset, means the real project. Opt-in rather
than derived from `NODE_ENV`, because a misspelled variable silently pointing a
dev machine at production is the failure worth making impossible.

The other `NEXT_PUBLIC_FIREBASE_*` values are not secret. They are inlined into
the browser bundle at build time and visible in any network tab. Rules protect the
data, not those.

`scripts/seed.mjs` hardcodes the emulator hosts so it can never touch a real
project. `scripts/seed-real.mjs` is a separate file for that, and it refuses to run
without an explicit credential or if the emulator host vars are set.

## Status

Sprint 1 shipped and deployed. A trainer books equipment and sees whether the
manager approved it, with rules doing the blocking rather than the interface.

Not usable by a real centre yet: accounts can only be created by running a script,
and there is no return, cancel, damage reporting or equipment management. Those are
Sprint 2.