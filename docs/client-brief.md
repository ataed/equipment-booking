# Client Brief — Equipment Reservation System

**Client:** Al Manar Training Centre, Tangier _(fictional)_
**Contact:** Rachid Benali, Administrative Manager
**Date:** 6 August 2026

---

_This brief is AI-generated for practice purposes. It is written the way real client
briefs are written — vague in places, incomplete, with at least one requirement that
contradicts another. Reading it critically is the first exercise; the result is in
`questions.md`._

---

## 1. About us

We are a vocational training centre in Tangier. We have 14 trainers and around 200
students.

We own equipment that's shared between classrooms: laptops, projectors, a few
tablets and a camera. Everything is kept in a storeroom and the technical manager
holds the key.

## 2. The problem

Right now everything happens on WhatsApp. A trainer writes in the group "I'm taking
the projector Tuesday morning", and the technical manager notes it in a notebook.

It doesn't work anymore:

- Two trainers book the same projector without knowing. This happens at least once
  a week and sometimes a class starts with no equipment.
- Nobody knows what's available without asking the technical manager.
- Equipment doesn't come back and we don't know who took it.
- The technical manager is on leave one week a month and during that time it's
  chaos.

## 3. What we want

An app where trainers book equipment themselves, and the manager approves.

### For trainers

- See available equipment
- Book for a slot (date + start time + end time)
- See their own bookings
- Cancel a booking
- Attach a photo if equipment is damaged on return
- Be notified when their booking is approved or refused

### For the manager

- See all bookings
- Approve or refuse
- Add and remove equipment
- See who has what right now
- Be notified immediately when an urgent booking is requested

### Business rules

- A trainer cannot have more than 2 active bookings at the same time (otherwise
  some people monopolise the laptops)
- A booking must be approved by the manager before it's confirmed
- You cannot book equipment already booked for the same slot
- A trainer must not see other trainers' bookings
- The manager must be able to see everything

## 4. Constraints

- **Must work on a phone.** Trainers are in classrooms, not at a desk.
- We have no IT department. Once delivered, nobody here will know how to change the
  code.
- French only for now. Maybe Arabic later.
- Limited budget — we're a small centre.
- We'd like to use it before the September term starts.

## 5. What we don't want

- No payments, equipment is free for trainers
- No student management for now
- No complicated statistics. Knowing who has what is enough.

## 6. Client remarks

> "The most important thing is that two people can't take the same projector.
> Everything else we can work around."

> "And it has to work even when the manager is away — somebody else needs to be
> able to approve."
