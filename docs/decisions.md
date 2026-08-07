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

## 2026-08-07 Trainer name denormalised onto the booking

The manager's pending list needs the trainer's name. Rules cannot hide fields,
so allowing managers to read users/{uid} would also expose phone and address.
Copying the name onto the booking means managers never read users at all.

Cost: a rename does not propagate to existing bookings. Accepted at this scope.