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
- `docs/decisions.md` - choices where a reasonable person could have gone the
  other way, with the reason and the cost.
- `docs/NOTES.md` - my working notes. Method, not project state.
- `docs/runbook-sprint-0.md` - the steps for Sprint 0, in order. Closed when the
  sprint is done.

## Sprints

Sprint 0 is the foundation: emulator, seed data, CI, and one spike to settle how
a free device gets assigned without two trainers getting the same one.

Sprint 1 is the core loop: a trainer books equipment and sees whether the
manager approved it, without anyone opening WhatsApp.

Sprint 2 is the lifecycle: returns, damage photos, push notifications, and the
manager screens the seed script currently stands in for.

## Dependency hygiene

Set up during the ChainDrop campaign (August 2026), when a compromised maintainer
account published malicious versions across the keyv and cacheable namespaces
with valid provenance signatures, so the signed "verified" badge proved nothing.

- `ignore-scripts=true` in `.npmrc`. Install-time lifecycle scripts do not run,
  which is the execution path those attacks use. Anything that genuinely needs
  one gets `npm rebuild <pkg>` deliberately.
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

## Status

Sprint 0 in progress. Next app scaffolded, Vitest green in CI. Firebase
emulators next, then the spike on the booking write.