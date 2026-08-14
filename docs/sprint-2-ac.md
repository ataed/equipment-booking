# Sprint 2 acceptance criteria

Criteria for the three stories being built. The rest stay one-liners.
Not split. Built in `develop` against the emulators, merged to `main` when done.

---

## 0. Create trainer accounts (Sprint 0 carry-over)

**Story**

As a manager, I want to create trainer accounts, so that no one unknown can create
an account and book equipment.

**Acceptance criteria**

1. Given a request to the account creation Route Handler
   When the handler runs
   Then it verifies the caller's Firebase Auth ID token and reads the role from the
        verified token's custom claims, before any Admin SDK operation

2. Given I am signed in as a manager
   When I submit a valid trainer name and email
   Then an Auth account is created with the custom claim role trainer
   And `users/{uid}` is created with name, email, role trainer, and
        `activeBookings: 0`

3. Given an unauthenticated caller, or a caller with the trainer role
   When they hit the Route Handler directly
   Then the request is rejected 401 or 403
   And no Auth account and no Firestore document are created

4. Given a request with no Authorization header, an expired token, or a token from
        another project
   When it reaches the handler
   Then it is rejected before any Admin SDK operation

5. Given I am signed in as a manager
   When my request body asks for role manager
   Then the created account's claim is trainer

6. Given an email already in use
   When I submit the form
   Then I am told the email is taken
   And no second account and no second document are created

7. Given a trainer account created this way and nothing else
   When that trainer signs in and creates a booking
   Then the booking succeeds

**Notes**

Criterion 1 says claims, not the `users/{uid}` role field. The field exists for the
UI. Reading it here costs a document read and moves the boundary onto a document,
when the claim is already inside the token you just verified.

Criterion 7 is what catches a missing `activeBookings`. The booking rule reads that
field, and a rule reading a field that is not there fails, so a trainer created
without it can sign in and be refused on every booking with no visible cause.
Asserting the document exists passes while that bug is present.

Locally the Admin SDK needs `FIREBASE_AUTH_EMULATOR_HOST` and
`FIRESTORE_EMULATOR_HOST`. It does not read `NEXT_PUBLIC_USE_EMULATORS`. Both
written without `http://`, both absent on Vercel.

---

## 1. Push notification on booking decision

**Story**

As a trainer, I want a push notification when my booking is decided, so that I
don't have to open the app to check.

**Acceptance criteria**

1. Given I am a trainer who grants notification permission
   When the token is registered
   Then it is stored on my own `users/{uid}` document

2. Given I am signed in as trainer A
   When a rules test writes a token onto trainer B's user document as me
   Then the write is refused

3. Given I am signed in as a trainer
   When a rules test writes my own token and changes `activeBookings` or `role` in
        the same write
   Then the write is refused

4. Given I am a trainer with a pending booking and a registered token
   When the manager approves or refuses it
   Then I receive a push notification carrying the new status

5. Given I am a trainer with a pending booking and no registered token
   When the manager approves or refuses it
   Then the decision still completes and the status changes

6. Given I receive a decision notification
   When I tap it
   Then the app opens on my bookings screen

**Notes**

Criterion 3 is the one that matters and is easy to skip. The update rule on
`users/{uid}` is currently written around `activeBookings` increments. Loosening it
to accept a token field, written carelessly, accepts a counter change alongside it.
Whatever you do not check, you permit.

Criterion 5 exists because the push is a side effect of the decision, not part of
it. If sending can fail the decision, one trainer with a stale token blocks the
manager.

The push is sent from the route handler on the manager's action, not from a
Firestore trigger. A status changed any other way sends nothing.

---

## Sprint 2 backlog, remaining one-liners

Story 2: As a manager, I want to mark equipment returned, so that it can be booked
by others.

Story 4: As a manager, I want to take a damaged device out of service, so that it
can't be booked until it's repaired.

Story 5: As a manager, I want to see who has which equipment right now, so that I
know what's unavailable and what hasn't been returned.

Story 6: As a trainer, I want to cancel my booking, so that I don't have to do it
through WhatsApp or ask the manager.

Story 7: As a manager, I want to receive a notification for an urgent booking, so
that I can decide on it quickly.

Story 8: As a manager, I want to see all bookings, so that I don't have to look
through WhatsApp messages.

Story 9: As a manager, I want pending bookings to be automatically refused 30
minutes before their start time or after 24 hours pending (whichever comes first),
so that equipment isn't stuck unavailable because nobody looked at the request in
time.

**Deferred to avoid Blaze plan requirement:**
Story 3: As a trainer, I want to attach a photo when equipment comes back damaged, so that
the manager knows before someone else books it.