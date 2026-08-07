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