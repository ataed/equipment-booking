# Equipment Booking

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
- `NOTES.md` - my working notes. Method, not project state.
- `docs/runbook-sprint-0.md` - the steps for Sprint 0, in order. Closed when the
  sprint is done.

## Sprints

Sprint 0 is the foundation: emulator, seed data, CI, and one spike to settle how
a free device gets assigned without two trainers getting the same one.

Sprint 1 is the core loop: a trainer books equipment and sees whether the
manager approved it, without anyone opening WhatsApp.

Sprint 2 is the lifecycle: returns, damage photos, push notifications, and the
manager screens the seed script currently stands in for.

## Status

Planning done. Next is Sprint 0: the spike, then the frozen data contracts.