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

nanoid: the fix is 3.3.17, published 3 August, inside the 7-day cooldown. So
audit reports a fix as available and `audit fix` cannot apply it. Resolves itself
around 10 August. Not exposed meanwhile, the bug needs nanoid(0).

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