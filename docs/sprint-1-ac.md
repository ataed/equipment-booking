# Sprint 1 acceptance criteria

Written before any code. Sprint 2 stories stay one-liners until Sprint 2 starts.

Goal: a trainer books equipment and sees whether the manager approved it,
without anyone opening WhatsApp.

Stories are in dependency order. Numbers match the rows in backlog-passes.md.

---

## 1. Sign-in and role routing (row 16)

**Story**

As a trainer or manager, I want to sign in and land on my own screen, so that I
only see what my role allows.

**Acceptance criteria**

1. Given a seeded trainer account
   When I sign in with correct credentials
   Then I land on the trainer screen

2. Given a seeded manager account
   When I sign in with correct credentials
   Then I land on the manager screen

3. Given I am signed in as a trainer
   When I navigate directly to a manager-only URL
   Then I do not see manager data

4. Given I am signed in as a trainer
   When a rules test reads a manager-only document as me
   Then the read is refused

5. Given no one is signed in
   When I navigate to any app URL
   Then I am sent to the sign-in screen

Criteria 3 and 4 look like the same thing and are not. 3 is the route guard, a
browser test. 4 is the rule, no browser involved. A route guard on its own is
decoration, since anyone can call the database directly.

**Tasks**

- Role read from the custom claim, never from a user-writable field
- Route guard by role
- Rules read the claim

**Depends on:** Sprint 0 seeded accounts with custom claims
**Blocks:** every other story

---

## 2. Trainer sees available equipment (row 1)

**Story**

As a trainer, I want to see all available equipment, so that I know what I can
book without asking the manager.

**Acceptance criteria**

1. Given a type with at least one in-service device
   When I open the equipment screen
   Then that type is listed

2. Given a type where every device is out of service
   When I open the equipment screen
   Then that type is listed as unavailable
   And I cannot select it to book

3. Given I am signed in as a trainer
   When a rules test reads the equipment collection as me
   Then the read is allowed

4. Given no one is signed in
   When a rules test reads the equipment collection
   Then the read is refused

5. Given I am signed in as a trainer
   When a rules test writes to the equipment collection as me
   Then the write is refused

6. Given I am signed in as a trainer
   When a rules test writes to the types collection as me
   Then the write is refused

Criteria 5 and 6 were not in the first draft. They came from asking what happens to
the other operation and the other collection while writing the tests. Nothing in
this app writes types or equipment from a client: the manager's add and remove
screens are Sprint 2 stories and even then would be manager only. Asserting it now
means a later rule cannot loosen it without a test going red.

Criterion 2 shows the type instead of hiding it. Hiding is simpler, but the
story exists so the trainer stops asking the manager, and hiding a broken
projector means he asks whether the centre owns one.

**Tasks**

- Query types, then check each has at least one in-service device
- Rules: read allowed to any signed-in user, writes denied to everyone. Manager
  writes arrive with the Sprint 2 equipment screens.

**Depends on:** story 1, Sprint 0 seeded equipment and types
**Blocks:** story 3

**Open**

- Does the trainer see how many devices of a type are free, or only available
  and unavailable? He picks a type and the system assigns the device, so the
  count may not be his business.

---

## 3. Trainer books a type for a slot (row 2)

**Story**

As a trainer, I want to book equipment by choosing a date and time, so that I
don't have to ask in WhatsApp.

**Acceptance criteria**

1. Given I am signed in as a trainer
   When I attempt to create a booking whose start is before 08:00, whose end is
        after 18:00, whose start is not on the hour, or whose duration is not 1
        or 2 hours
   Then the attempt is refused

2. Given a type with at least one in-service device free for the slot I want
   When I create a booking for that type and slot
   Then a pending booking belonging to me is created with one device assigned
        and a server-recorded creation time

3. Given every in-service device of a type is already held for that slot by a
        pending or approved booking
   When I attempt to create a booking for that type and slot
   Then the attempt is refused and no device is assigned

4. Given a type where every in-service device is held for that slot and one
        out-of-service device exists
   When I attempt to create a booking for that type and slot
   Then the attempt is refused and the out-of-service device is not assigned

5. Given I already have 2 active bookings
   When I attempt to create a third
   Then the attempt is refused

6. Given I am signed in as trainer A
   When I attempt to create a booking that belongs to trainer B
   Then the attempt is refused

7. Given two trainers create a booking for the same type and the same slot at
        the same moment, and two devices of that type are free
   When both requests are processed
   Then both bookings are created with different devices assigned
   And no device is assigned to two bookings for that slot

Criterion 1 groups four invalid inputs into one criterion because they are one
behaviour with four inputs, and one table-driven test covers them. Splitting
them would push this story past 8 criteria, which is the signal a story is too
big.

Criterion 7 is why the spike exists. It cannot be checked through the UI, since
you cannot drive a real race through a browser.

**Tasks**

- Assignment: find a free in-service device for the requested slot and assign it
  atomically. Approach decided by the Sprint 0 spike.
- Pending and approved both hold a slot. Refused, canceled and returned do not.
- Slot shape validated server side, not only in the UI
- Max 2 active bookings enforced server side, not only in the UI
- Out-of-service filter, the Sprint 1 half of row 13
- Owner taken from the verified token, never from the request body
- Server-recorded creation time

**Depends on:** story 2, the Sprint 0 spike, the fixed-slots decision
**Blocks:** stories 4 and 5

**Deferred to the spike**

Showing the trainer which slots are already taken needs a structure he is
allowed to read with no owner on it, since bookings carry the trainer id and
stay private to their owner. Rules cannot hide fields, so the fact has to exist
somewhere else. That structure is probably the same one that makes the
assignment atomic. The spike decides its shape and this story gets one more
criterion afterwards.

**Open**

- "Active" in criterion 5 needs a definition. In Sprint 1 it can only mean
  pending plus approved, since return does not exist yet. It changes when the
  return story ships, and the auto-refuse story touches the same question.

---

## 4. Trainer sees own bookings with status (row 3)

**Story**

As a trainer, I want to see my own bookings, so that I don't search WhatsApp
history.

**Acceptance criteria**

1. Given I have a pending booking and an approved booking
   When I open my bookings screen
   Then both are listed, each showing its status, the equipment assigned and the
        slot

2. Given another trainer has a booking
   When I open my bookings screen
   Then that booking is not listed

3. Given I am signed in as a trainer
   When a rules test reads another trainer's booking as me
   Then the read is refused

4. Given I am signed in as a trainer
   When a rules test queries all bookings without narrowing to my own
   Then the query is refused

5. Given I have no bookings
   When I open my bookings screen
   Then I see an empty state, not an error

Criteria 2 and 3 are the pair that matters. 2 is the screen, 3 is the rule. A
screen that filters client side passes 2 and fails 3, and that is the bug.

Criterion 4 is the all-or-nothing behaviour turned into a test. Rules are not
filters, so an unnarrowed query on bookings is refused entirely rather than
returning the ones I am allowed to see. This is also the criterion that will
fail while I build it and remind me why the where clause is mandatory.

Criteria 2, 3 and 4 together are the brief's rule that a trainer must not see
other trainers' bookings.

**Tasks**

- Query bookings narrowed to me
- Rules: a trainer reads only bookings belonging to them
- Composite index if the query filters and sorts, committed to the repo
- Status shown as text on the row. No push notification in this story

**Depends on:** story 3
**Blocks:** nothing in Sprint 1

---

## 5. Manager approves or refuses (row 8)

**Story**

As a manager, I want to approve or refuse a trainer's booking, so that I don't
have to tell them in WhatsApp.

**Acceptance criteria**

1. Given pending, approved and refused bookings exist
   When I open the pending list
   Then only the pending ones are listed, each showing which trainer requested
        it, the equipment assigned and the slot

2. Given a pending booking
   When I approve it
   Then it becomes approved
   And the trainer who owns it sees the new status on their own screen

3. Given a pending booking
   When I refuse it
   Then it becomes refused
   And the device it held is free for that slot again

4. Given a booking that has already been approved or refused
   When I attempt to decide it again
   Then the attempt is refused

5. Given I am signed in as a trainer
   When I attempt to change the status of any booking, including my own
   Then the attempt is refused

6. Given there are no pending bookings
   When I open the pending list
   Then I see an empty state, not an error

Criterion 3's second line matters. Pending and approved hold a slot, refused
does not, so refusing has to release the device or a refused request blocks it
forever and the auto-refuse story in Sprint 2 becomes pointless.

Criterion 5 says including my own on purpose. A trainer approving someone else's
booking is the obvious hole. A trainer approving their own is the one that
defeats the whole approval workflow.

**Tasks**

- Minimal pending list, the task absorbed from row 7
- Rules: only a manager changes status
- Legal transitions only: pending to approved, pending to refused. Nothing else
  exists in Sprint 1
- Trainer identity on the row: read the user document per row. See decisions.md
  for why this is not copied onto the booking

**Depends on:** story 3 for the booking shape, and Sprint 0 seeded pending
bookings so this can be built in parallel with story 4
**Blocks:** nothing in Sprint 1

**Open**

- Duplicate trainer names. The centre has 14 trainers and the manager creates
  the accounts, so two people with the same name is plausible. If the row shows
  only a name I cannot tell them apart, which makes criterion 1 uncheckable.
  Either the seed data uses distinct names or the row shows the email too.
  Decide before building the list.