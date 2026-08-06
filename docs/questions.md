# Questions on the brief

What I found unclear or missing after reading it. Some I propose a fix for, others
the client has to decide.

## 1. Approval blocks when the manager is away

**Why it matters:** he says a booking must be approved by the manager, and also
that the manager is on leave one week a month. So bookings can't be confirmed for a
quarter of the year.

**Proposed:** a third role, sous-manager, that can approve when the manager is
away.

**Changed my mind.** A sous-manager role doesn't make sense. Approving a booking
isn't the same as handing over the equipment, and the manager holds the storeroom
key. If the second person can approve but has no key, nothing moves. So he needs the
same permissions, including marking returns.

That means it isn't a separate role. It's a second person with the manager role.
Simpler in the rules too, one check instead of two. The client has to accept
trusting two people with full access rather than granting temporary powers.

## 2. What does a pending booking mean, and what can a trainer see?

**Why it matters:** the process is trainer books, then manager confirms. So a
booking isn't confirmed when it's made. Does it hold the slot, or can two trainers
request the same slot and the manager decides between them? The second one puts the
manager back in the middle deciding who gets what, which is the problem he wants to
escape.

Second part: he says a trainer must not see other trainers bookings, but also that
you can't book something already booked. If the trainer can't see anything, he
can't tell an item is taken.

**Proposed:** a pending booking holds the slot, since his main complaint is that two
people can't take the same projector. And the trainer sees that a slot is booked
without seeing who booked it.

**Tradeoff:** a pending booking blocks the item for everyone else. If the manager is
slow to look at it, a projector sits unavailable because of a request that might get
refused. This also connects to item 1: if pending bookings hold slots and the
manager is away a week a month, everything freezes during that week. So a second manager
account isn't just convenience, it's needed for this design to work..

## 3. Equipment quantities are not specified

**Why it matters:** decides the data model. Either each device is its own record,
or an item type carries a count. Different structure, different conflict logic.

**Proposed:** item types with a quantity. A trainer wants a projector, not
projector number 2.

**Note:** See item 8, I changed this.

## 4. No account creation process

**Why it matters:** nobody is named as creating trainer accounts, and nothing stops
someone who isn't a trainer from registering. It affects auth, roles, and the first
screen anyone sees.

## 5. Nobody records the return

**Why it matters:** he says equipment doesn't come back, but nothing says who marks
a booking as returned. The booking end time gives the deadline, so late is anything
past it that isn't marked returned. But somebody has to press that button.

**Proposed:** a manager, since he holds the storeroom key and hands the equipment
over. That also makes the damage photo work: the trainer reports it broken, the
manager marks it returned with the photo attached.

## 6. "Urgent" is not defined

**Why it matters:** the manager gets notified for urgent bookings, but nothing says
who marks a booking urgent or what the tag changes. If the trainer sets it himself,
everyone will use it.

## 7. Nothing expires a pending booking

**Why it matters:** if a booking for 14:00-16:00 is never looked at, it stays
pending the whole time and nobody can book that item. That's worse than the
WhatsApp situation.

**Proposed:** auto-refuse a pending booking that hasn't been approved. Three ways
to decide when:

- at start time, so 14:00 for a 14:00 booking. Frees the slot but too late for
  anyone else to use it.
- before start, an hour or 15 minutes ahead. Gives someone else a small chance.
- on age, so pending more than 24 hours gets refused. Predictable, but doesn't
  cover a booking made this morning for this afternoon.

Probably a combination of the last two. This needs something running on a schedule,
since nothing fires on its own.

## 8. Damage photos only work if I know which device came back broken

**Why it matters:** the brief says a trainer can attach a photo if equipment is
damaged on return. But in item 3 I proposed item types with a count, so "3
projectors" would be one record. If one comes back broken I don't know which one,
and the manager can't send it for repair without asking around. The two
requirements pull against each other.

**Changed my mind on item 3.** Each device gets its own record instead of a count.
A projector that comes back broken can be taken out of service on its own.

Two reasons:

- Going from counts to units later isn't just adding a field. The booking
  transaction changes from decrementing a number to finding and assigning a free
  device, and the rules change with it. That's a rewrite, not a migration.
- Assigning a free device to a trainer is a harder problem than decrementing a
  count, and Firebase is what I'm here to learn. Two trainers booking the same slot
  must each get a different projector, not just both fit under a capacity of 3.

The trainer still picks a type, not a specific device. The system assigns one. So
the interface doesn't get more complicated, only the transaction does.

## Assumptions

No client to answer these, so I decided the ones I had to. They'd need confirming
before anything goes live.

- Two roles, trainer and manager. Two manager accounts, so approvals and returns
  keep working when one is away (item 1)
- A pending booking holds the slot (item 2)
- Each device is its own record, not a type with a count (item 8)
- The manager creates trainer accounts, no self-registration (item 4)
- The manager marks equipment as returned, since he holds the storeroom key
  (item 5)
- Late means past the booking's end time and not marked returned. No separate
  maximum loan duration, the booking's end time is the deadline
- A pending booking auto-refuses 30 minutes before its start time, or after 24
  hours pending, whichever comes first (item 7)
- Urgent flag: the trainer can set it but must give a reason. It triggers an
  immediate push to the manager and sorts to the top of his list. It doesn't give
  priority over another booking (item 6)
