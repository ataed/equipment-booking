# Decisions

## 2026-08-07 Fixed hourly slots, not arbitrary times

Bookings start on the hour and last 1 or 2 hours. Centre hours 08:00 to 18:00.

Why: conflict detection with arbitrary times requires an overlap query per
device. Client SDKs cannot query inside a transaction, and rules cannot query at
all, so overlap could only be computed server-side with nothing readable
beforehand. Fixed slots turn conflict into an existence check on a computable
path.

Also matches how the centre runs: sessions are 1 or 2 hours, not arbitrary
minutes.

Cost: a trainer cannot book 14:30 to 15:30. Accepted.


## 2026-08-07 No denormalisation of trainer identity onto bookings

The manager's pending list needs to identify the trainer. Rejected copying name
onto the booking: users/{uid} holds nothing sensitive (name, email, role), the
centre has 14 trainers, and the pending list is short, so reading the user
document per row costs almost nothing. Copying would add a field that goes stale
on rename and does not solve duplicate names anyway.

Revisit if the list ever grows or if users/{uid} gains private fields, in which
case split the document rather than copy the field.


## 2026-08-08 Dependency install hardening

`.npmrc` sets `ignore-scripts=true`, `save-exact=true` and `min-release-age=7`,
committed before any dependency was installed.

Why during the ChainDrop campaign: the payload ran through an npm preinstall
hook, before installation even finished, and the poisoned tarballs carried valid
provenance signed by GitHub Actions, so every cryptographic check passed. The
threat is not choosing a bad package, it is a package you trust having a
dependency poisoned two days before you install. `ignore-scripts` addresses the
execution path and `min-release-age` addresses the window.

Cost: packages that legitimately need install scripts break and need
`npm rebuild <pkg>`. And `npm audit` does not know about the cooldown, so it will
report fixes as available that cannot be installed yet. Both accepted.

## 2026-08-08 Accepted four open audit advisories

nanoid: resolved 10 August. The fix (3.3.17, published 3 August) fell outside the
cooldown once the rolling window reached it. Three production advisories remain,
postcss and sharp, both nested under next, both unchanged.

**note**: The cooldown is a rolling window. `npm audit` reports a fix as available while
`audit fix` cannot apply it, because audit does not know about `before`. It
resolves itself when the window reaches the fix.

postcss: my direct dependency is 8.5.25, which is not in the vulnerable range.
The vulnerable copy is next@16.2.12's own bundled postcss@8.4.31, so it can only
move by bumping next. Refused: `audit fix --force` wants next@16.3.0, outside my
stated range, five days old so blocked by the cooldown anyway, and published
3 August, the day before ChainDrop began. Not exposed, the sourcemap issues need
attacker-controlled CSS and I write all the CSS.

sharp: pulled in by next, not by me. Not exposed today, and its native binary was
never built because install scripts are disabled.

Revisit when the damage-photo story ships in Sprint 2. That is the first point an
untrusted image enters the system, which is exactly the sharp scenario. Either
sharp moves to >= 0.35 then, or image handling stays in Firebase Storage.

## 2026-08-08 Tailwind 3 rather than the scaffolded Tailwind 4

create-next-app@16.2.12 scaffolds Tailwind 4, which is CSS-first and has no
config file. Downgraded to 3.4.19 before installing anything, matching the setup
I already run on another project.

Reason is familiarity, not merit. Two weeks to learn Firebase is not the time to
also learn a new Tailwind configuration model, and nothing in the acceptance
criteria concerns styling. Cost: 4's improvements, and a future upgrade to do.


## 2026-08-09 Slot documents with deterministic IDs, not a transaction

Slot occupancy lives in a `slots` collection, one document per device per hour,
with the ID computed from the facts: `{deviceId}_{isoHour}`, e.g.
`projector-1_2026-08-11T14`. The document's existence means that device is taken
for that hour. Body is one field, `bookingId`, pointing back at the booking that
claimed it. No `trainerId` on it, ever.

A booking claims all of its hours in a single `writeBatch`. To find a free device
of the requested type, loop the candidate devices, attempt that device's batch,
break on success, continue on refusal, refuse when no device is left.

Enforced by a create-only rule:

    match /slots/{slotId} {
      allow create: if ...;
      allow update, delete: if false;
    }

`update` denied is what makes it work. `setDoc` on an existing document evaluates
update, so denying update turns a second write into a refusal instead of an
overwrite.

### Why not a transaction

The client SDK cannot run a query inside a transaction, only `get` by document
reference, and Security Rules cannot query at all. So "find a conflicting booking,
then write if none exists" has no atomic implementation in the browser. The
alternative was moving the write into a callable Cloud Function using the Admin
SDK, which can query inside a transaction. Not needed, because deterministic IDs
turn the conflict check into an existence check, which the database resolves
atomically without any transaction.

Second reason, and the one that made this the preferred shape rather than merely
sufficient: rules cannot hide fields, so a document is either fully readable or
not readable at all. Bookings carry `trainerId` and must stay private to their
owner, so a trainer cannot read bookings to discover which slots are taken.
`slots` carries no owner, so trainers can read it. One structure does two jobs:
it makes the write atomic, and it is the thing a trainer reads to see availability.

### What was verified, against the emulator

1. Create-only rules refuse rather than overwrite. Second `setDoc` on an existing
   slot returned `permission-denied` and the original survived.
2. A real race resolves correctly. Two `setDoc` calls fired simultaneously via
   `Promise.allSettled` on the same slot ID: one succeeded, one refused, exactly
   one document existed afterwards. No transaction involved.
3. `writeBatch` is atomic across creates. Batching an already-taken hour with a
   free one failed entirely, and the free one was never written. So a multi-hour
   booking claims all of its hours or none.
4. The device loop works. A fresh `writeBatch` per iteration is required, they
   are single-use.
5. Two trainers requesting the same type for the same hours at the same instant
   each got a different device. Both collided on the first device, the loser's
   loop moved on rather than failing.

### Costs accepted

**A refusal is indistinguishable from broken rules.** The loop swallows
`permission-denied` on every iteration. If the rules file is broken, every device
looks taken and the booking is refused with no signal that anything is wrong.
Mitigation is a rules test that asserts a create succeeds for a free slot, so a
broken rule fails the test suite rather than silently degrading into "fully
booked". That test is part of story 3.

**A second structure to keep consistent with bookings.** Slots and bookings can
drift. The write path is single-owned, in `lib/slots/`, and nothing else writes
slot documents.

**One write per hour claimed.** A 2-hour booking is two slot writes plus the
booking document. Billing is per document write, so three writes per booking
rather than one. Acceptable at 14 trainers.

**No arbitrary times.** Depends on the fixed-hourly-slots decision. A trainer
cannot book 14:30 to 15:30.

### Open, and it affects story 5

Refusing a booking has to free the device, and the current rule denies `delete`.
So how a slot gets released is unresolved. Three candidates, to settle when
story 5 is built rather than now: allow delete under a narrow condition, mark the
slot released with a field instead of deleting it, or move release into a Cloud
Function with the Admin SDK. Whichever it is, the release path and the claim path
must be owned by the same module.

The same question covers cancel and the scheduled auto-refuse, both Sprint 2.


## 2026-08-09 No proxy.js, client-side route protection only

Firebase Auth stores the session in IndexedDB, so a server-side proxy cannot see
who is signed in. Making it work needs a session cookie minted by a route handler
using the Admin SDK, plus refresh handling, plus a new failure mode where the
cookie and the live session disagree.

Rejected for Sprint 1. A route guard stops someone seeing a page; Security Rules
stop someone getting data, and an empty page is not a leak. Next renamed
middleware to proxy in v16 to signal the same thing: it is routing
infrastructure, not a security boundary.

Cost: a brief loading flash before the redirect, and no protection for
server-rendered data fetching. Revisit if a screen needs server-side data.



## 2026-08-10 Refusing a booking is two operations, not one

Refusing writes the booking's status and then releases its slots. Two writes, not
one batch.

Why not a batch: releaseSlots lives in lib/slots/claim.js and commits its own,
because slots have a single write path owned by one module. That is what stops
slots and bookings drifting, and it is worth more than atomicity here.

Cost accepted: if the release fails after the status write succeeds, the booking
reads refused while its slots are still held, so the device stays blocked by a
booking nobody has. Both writes are small and adjacent, which makes the window
narrow but not zero.

Reversal condition: if this happens in practice, move refusal into a Cloud
Function using the Admin SDK, which can do both in one transaction. Not now.