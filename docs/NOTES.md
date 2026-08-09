
## Schema / data modeling

Firestore has no schema enforcement. Any document can have any fields, any
types. Nothing stops a typo'd field name or a missing field.

No joins, no populate, no auto-resolving references. A reference field is
just a fancier ID, you still fire a second query yourself to get the data
it points to. This is why denormalization (copying a field into another
doc) exists: to avoid that second query, at the cost of owning consistency
of the copy.

Root collection vs subcollection vs nested field comes down to one
question: what do I query, and across how many parents at once? If a
screen needs data across multiple parents in one query (all bookings
across all trainers, all equipment across all types), it has to be root
level. If it only ever belongs to one parent and is never queried on its
own, subcollection. If it's small and always read with its parent, nest it
as a field.

Denormalized fields need an owner. For every duplicated field, write down
what updates it and when; because Firestore won't do it for you.

Impossible states are a schema smell. Two fields that can produce a
combination that can never actually happen (refused + returned) usually
means one of them should be a value inside the other, not a separate
field.

Missing fields break rules, not just queries. In Security Rules, checking
a field that doesn't exist on the document doesn't evaluate to false, it
errors and denies the request. So every field needs a default value set
at document creation, never left absent.

Schema has zero enforcement power on its own. "urgent: true with an empty
reason" is valid data unless a rule blocks it. Business logic like that
lives in Security Rules, not the schema.


## Stories to sprints

A backlog doesn't get ordered by comparing stories to each other. Sixteen
stories compared pairwise is paralysis. Instead each story answers three
questions alone, and the sprint plan falls out.
 
Question 1, the loop test: if this story doesn't exist, can the user still
complete the one journey the app exists for?
For this project the journey is: trainer gets equipment without WhatsApp.
Browse, book, see the outcome, approve. Everything the journey breaks without is Sprint 1.
Everything the journey survives without waits, no matter how easy or interesting it looks.
 
Check every verb in the journey sentence: is it an outcome the user needs,
or a mechanism I already pictured? Mine said "notify", which is a
mechanism. That one word would have put push notifications in Sprint 1 for
no reason. The outcome is that the trainer knows the result, and a status
field on the bookings list delivers it.
 
Question 2, the dependency pass: what must exist before this story can
start? This catches four things.
 
Stories that look independent but aren't (who has what needs approve and
return to exist first).
 
Stories that look needed but are already covered. Create accounts is
implemented by the Sprint 0 seed script, so the UI is optional. Covered is
not the same as No: the journey does need the capability, so the story
becomes mandatory again the moment the thing covering it goes away. A No
story is free to drop forever.
 
Stories that split across sprints. Out of service is a Sprint 2 story, but
the booking transaction must exclude out-of-service devices from day one,
so the filter is a task inside the Sprint 1 booking story and only the
manager's toggle waits.
 
Things a story needs that aren't stories at all. Those are Sprint 0. That
list is a side output of this pass and it grows as you fill rows.
 
Write the dependency in both issues or rediscover it at 1am.
 
Question 3, the risk pass: not "is this unfamiliar" but "if I'm wrong
about this, how much has to be rebuilt?" Unfamiliarity is not risk. When
everything is new the first question gives the same answer on every row
and orders nothing.
 
High means other work sits on top, so it goes as early as dependencies
allow and fails while there's still time to change approach. Isolated
means nothing depends on it, so it goes last and cutting it costs nothing
already built. The assignment transaction is High: five stories read the
booking document. FCM is Isolated, and it stays last even though I've
never done it, because nothing sits on top of it.
 
Unfamiliarity gets handled somewhere else: a spike, time-boxed, in Sprint
0, producing a written decision rather than a feature. That's how "I don't
know how yet" stops contaminating the order.
 
A side effect of the loop test: it exposes stories that were really tasks.
Manager sees all bookings failed as a story, but approve can't work
without a pending list, so a minimal pending view is a task inside the
approve story and the full history screen stays a separate later story.
If removing it breaks another story, it was a task in disguise.
 
The reverse check is what catches it: for every story marked No, does any
Yes story need it? If yes, the first answer was wrong. It only works
because pass 1 was done without thinking about dependencies.
 
Order inside a sprint is dependency order, not importance order. Cut order
is the reverse of the backlog: bottom of Sprint 2 goes first, Sprint 1
never gets cut, and if Sprint 1 is at risk the answer is cutting Sprint 2
entirely, not trimming the core loop. Cut whole stories, never half of
one; half-built costs more than absent.
 
 
## The pipeline (when I feel lost, read this)
 
Every artifact answers one question, and each feeds the next:
 
brief             -> what does the client want?
questions.md      -> what did they forget to say?
stories.md        -> what will we build, in user terms?
backlog-passes.md -> in what order, and why? (loop, dependency, risk)
AC                -> what does "done" mean, checkably?
contracts+lanes   -> who builds which piece without colliding?
code              -> the pieces
tests             -> proof each AC is met
CI                -> proof the tests pass on a neutral machine
 
One home per question. If two files can answer the same question they will
disagree eventually, and then neither is trustworthy. The sprint order lives
with the reasoning that produced it, not in a file of its own.
 
It's one question asked repeatedly, "how will we know?", pushed down from
vague (client's wish) to mechanical (green checkmark). Rules, tests,
contracts and CI are all the same move: turn a human agreement into
something a machine can check. Firebase and Vitest are just this week's
tools for making the checks run.
 
Working rule: only two documents are open at a time. The runbook at the
current block, and this file. Everything else is reference, like MDN: you
look things up when a block sends you there, you don't hold it in your
head, and you don't feel bad about that.
 
Lost is what the start of a pipeline feels like when you can see all of
it. It reverses the first time a red test goes green.


## Order: spike before split

Work can only be split once the contracts two people would both touch are
frozen. If a structure is still undecided, splitting means two people building
against something that does not exist.

So: spike decides the shape, then the contracts get frozen in one serialised
commit, then the lanes fan out. Writing the split document before the spike
produces theory. Written after, it names real files and real frozen shapes.

Found this the hard way: the availability structure two lanes would both write
to was sitting behind a deferred decision, invisible to the split.


## Writing acceptance criteria

- The screen is not a security boundary. Rules are. Every story that touches
  data gets a criterion asserting the wrong actor is refused.
- Technique: keep the When fixed, vary the Given. Each variation is a criterion.
- If the expected result differs by actor, it is a separate criterion. If it is
  the same regardless of actor, one criterion is enough.
- 3 to 7 criteria per story. Under 3 usually means the unhappy paths are
  missing. Over 8 usually means the story should be split.
- Do not test Firebase itself. Wrong password behaviour is Auth's job, not mine.
- Sprint 2 stories stay one-liners until Sprint 2 starts. Detail is added at the
  last responsible moment.
  - Every criterion needs the Given to carry the state and the Then to name one
  observable result. "I see all available equipment" cannot be checked, because
  nothing defines available. "Given a type with at least one in-service device,
  then that type is listed" can.
- In the When, use "attempt to" for anything expected to fail. A When that
  asserts the outcome contradicts the Then.

 ## Tests and CI

### The words

**Test.** A function that runs some of my code and asserts something about the
result. If the assertion is false it throws.

**Test runner.** The program that finds test files, runs them, and reports. Mine
is Vitest. `vitest run` runs once and exits. Bare `vitest` watches and never
exits, which hangs CI forever.

**Assertion.** The claim. `expect(x).toBe(y)`. This is the line that turns a
sentence from my acceptance criteria into something mechanical.

**Kinds of test I will write here:**
- unit: one function, no database, milliseconds
- rules: does the emulator refuse a read or write for the wrong actor. Fast, no
  browser, and the most important kind on a Firebase project
- e2e (Playwright): drives a real browser through a whole journey across two
  roles. Slow, and the only thing that proves the screens work together

**CI, continuous integration.** Running the checks automatically on a machine
that is not mine, on every push. The name is older than the practice and does
not describe it well. What it actually is: a clean computer that runs my
commands and reports whether they succeeded.

**GitHub Actions.** GitHub's implementation of that. Free and unmetered for
public repos on standard runners.

**Workflow.** The file, `.github/workflows/ci.yml`. Says when to run and what to
do.

**Runner.** The machine. Fresh Ubuntu, empty, destroyed after the run.

**Job.** A unit of work on one runner. I have one, called `test`. Multiple jobs
run in parallel by default.

**Step.** One thing inside a job. Either `run:` (a shell command) or `uses:` (a
prebuilt action someone else wrote).

**Action.** Reusable code, e.g. `actions/checkout@v7`. Pinned by major version
so it does not change under me.

### What GitHub actually reads

The exit code. Nothing else.

Every shell command exits with a number. Zero means success, anything else
means failure. When my test failed, the last line of the log was
`Process completed with exit code 1`. Everything above it, the diff, the file
name, the caret under the assertion, is for me to read. GitHub only reads the
number.

Consequence: CI is not a testing feature. It is a "run these commands on a clean
machine and check they all exited zero" feature. That is why the same pipeline
will later run the linter, the rules tests and Playwright without any of them
being special cases.

Second consequence: a failed step stops the job. If `npm ci` fails, the tests
never run, and the red is about installation, not about my code. Read which step
went red before reading the log.

### Why the runner starts empty

Because that is the whole point. A machine with nothing on it cannot pass a test
by accident.

Each step adds exactly one thing:

    Set up job         GitHub boots the machine
    checkout           clones my repo onto it. Without this there is no code
    setup-node         installs Node, and caches npm downloads between runs
    npm ci             installs dependencies from the lockfile
    npm test           runs vitest
    Post Run x2        setup-node saves the cache, checkout drops credentials
    Complete job       machine destroyed

Five of those nine steps are mine, in the order I wrote them. Four are GitHub's
setup and teardown.

`npm ci`, not `npm install`. `ci` installs exactly the lockfile and fails if
package.json disagrees. `install` resolves fresh, which would let a version
published after my commit enter a build of that commit.

### What CI proves that npm test locally does not

My laptop has my Node version, my ~/.npmrc, leftover node_modules from three
projects, and environment variables I set months ago and forgot. A test that
passes only there passes by accident.

CI removes all of that. Green on the runner means the code works from a clean
clone, which is the only version of "works" that means anything to anyone else.

It also caught a real thing today: node 24.18.0 on the runner versus 24.14.1
locally, because `node-version: 24` means newest 24.x and drifts. Pinned it.
Same reasoning as save-exact, applied to the runtime.

What CI does not prove: composite indexes exist in the real Firebase project,
custom claims propagate at real timing, cold starts, quotas. The emulator is
faithful, not identical. That is why the definition of done still says deployed
and clicked through by a human.

### How a criterion becomes a file

This is the last link in the pipeline in this file. The same question, "how will
we know", asked at the most mechanical level available.

From sprint-1-ac.md, story 4:

    Given I am signed in as a trainer
    When a rules test reads another trainer's booking as me
    Then the read is refused

Becomes tests/rules/bookings.test.js:

    Given  -> setup: an authenticated context with uid trainer-a, role trainer
    When   -> the call: getDoc on a booking owned by trainer-b
    Then   -> the assertion: assertFails

Given becomes setup, When becomes the call, Then becomes the assertion. No
translation step, which is the reason to write criteria in that shape rather
than as prose.

The emulator is what makes this possible. It accepts any auth token without
verifying signatures, so a test can claim to be any user with any role. No
credentials anywhere. Fabricated identity, real rules file, real refusal.

Which criteria this pipeline will check: all of them eventually. The rules ones
as Vitest against the emulator, the journey ones as Playwright. The tags in
sprint-1-ac.md already say which is which, so the test plan is written.

### Evidence, 8 August

- Broke the sanity test on purpose. Red locally, red on CI, exit code 1, steps
  after it did not run. Fixed it, green again.
- Verified the npmrc reaches the runner: printed npm config on CI and saw
  ignore-scripts, save-exact and min-release-age all read from the project file,
  not from a home config that does not exist there.
- Green in 16 to 27 seconds. Playwright will be minutes, not seconds, which is a
  reason to keep it in a separate job later.


## Firebase Security Rules Audit Checklist


From Firebase's own agent-skills repo (firebase-security-rules-auditor), kept
before deleting the skill files that firebase init installed.

1. Default Deny Rule
   - Ensure default read/write access is denied (`allow read, write: if false;`) on unhandled paths.

2. Authentication Checks
   - Verify all sensitive paths require authentication (`request.auth != null`).
   - Validate user identity matches target document (`request.auth.uid == userId`).

3. Data Validation
   - Enforce schema validation on writes (`request.resource.data`).
   - Restrict allowed data fields to prevent unauthorized payload injection.

4. Authorization & Roles
   - Verify custom claims or role documents (`get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'`).
   - Ensure dynamic lookups using `get()` or `exists()` are bounded to avoid high latency or costs.

5. Granular Operation Checks
   - Split `write` into distinct `create`, `update`, and `delete` rules to prevent unintended overrides or deletions.
   - For this project: bookings get create (story 3) and update (story 5). Delete
     is never granted to anyone. `allow write` would grant all three.




## Firestore client SDK, first contact

Everything is two steps: build a reference to a location, then act on it.

    const ref = doc(db, "collection", "docId");
    await setDoc(ref, data);
    const snap = await getDoc(ref);

`doc()` does not touch the network. It is just an address. Missing the function
name is a silent bug: `const ref = (db, "a", "b")` is valid JavaScript, the comma
operator, and it evaluates to the last value. So `ref` becomes the string `"b"`
and the error surfaces later inside `setDoc`, pointing at the wrong line.

`getDoc` returns a snapshot, not my data. `snap.exists()` is a function call in
the modular API, not a property. 

### The three ways to write, and one of them destroys data

    setDoc(ref, data)                    replaces the ENTIRE document
    setDoc(ref, data, { merge: true })   merges, creates if absent
    updateDoc(ref, data)                 merges, FAILS if absent

Verified: wrote seven fields, then `setDoc` with one field, and the seven were
gone. Then `setDoc` with `{merge: true}` and the new field was added alongside.

Where this would bite in this project: story 5, the manager approving a booking.
`setDoc(bookingRef, { status: "approved" })` would erase trainerId, equipmentId,
startTime, everything. Use `updateDoc` for a status change, and its failing on a
missing document is a feature, since approving a booking that does not exist
should fail.

### Reading something that is not there does not throw

`getDoc` on a missing path returns a snapshot with `exists()` false and `data()`
undefined. No error. So try/catch is the wrong tool for "not found" and if/else
is the right one. try/catch is for things that actually throw: permission denied,
network failure, invalid reference.

### One setDoc evaluates two rules

The emulator Requests tab showed CREATE and UPDATE as two separate evaluations
from one `setDoc` call, because the SDK does not know whether the document
exists. So `allow write` grants both, and any rule that only handles create
leaves update open or vice versa. This is the audit checklist item about
splitting write into create, update and delete, seen happening.

### Where errors appear, and where they do not

Rules denials come back over the wire to the client, so they print in my terminal,
not the emulator's. The emulator side has three places:

- Emulator UI Requests tab: the best one. Shows every client request, denied ones
  in red, and clicking one shows the rules file with the denying line highlighted,
  plus `request.resource.data` (what I tried to write) and `resource` (the
  document as it exists now, undefined on a create).
- `firestore-debug.log` in the repo root, gitignored. Verbose, rarely needed.
- The emulator terminal stays quiet on denials.

The Requests tab only shows client requests. Admin SDK calls and rule-internal
`get()` calls are invisible there because they bypass rules. So when the seed
script runs, that tab will show nothing.

### resource vs request.resource

`request.resource` is what is being written. `resource` is the document as it
currently exists. On a create, `resource` is undefined, so touching it in a create
rule errors and denies rather than evaluating false. This is the "missing fields
break rules" note from the schema section, and it means story 5's rule
(`resource.data.status == "pending"`) can only ever apply to update, never create.

### The error message is better locally than in production

The emulator told me exactly which line denied the request:
`false for 'create' @ L27, false for 'update' @ L27`. In production a client gets
a bare `permission-denied` with no explanation. So rules debugging happens against
the emulator, not against the real project.

## Rules tests

A different kind of test from a unit test. It needs the emulator, because the
thing being tested is the rules file, and only the emulator can evaluate it.

    initializeTestEnvironment()   reads firestore.rules and loads it into the
                                  emulator. So the test tests the real file. Edit
                                  the rules and the tests reflect the edit.
    authenticatedContext("uid")   fabricates a signed-in user. No password, no
                                  real token, the emulator accepts the claim.
    unauthenticatedContext()      nobody signed in.
    assertSucceeds(op)            asserts the operation was allowed.
    assertFails(op)               asserts it was refused.

`assertFails` passing means the operation was correctly denied. That inverts the
usual meaning of a green test and it takes a second to get used to: if a rule
accidentally allowed something, `assertFails` goes red.

`clearFirestore()` in `beforeEach` means every test starts empty. That is the
difference between a test and the spike script: the spike accumulated data across
runs and a rerun looked like a failure, a test cannot.

### Why rules specifically have to be tested

A bug in a screen produces a visible error. A bug in rules produces silent data
exposure. Nothing breaks, nobody complains, and I find out when someone notices
they can read other people's data.

And rules cannot be verified by clicking around, because the app only makes the
requests I programmed it to make. It never tries to read another trainer's
booking, so using the app proves nothing about whether that is blocked. Testing
the wrong actor means deliberately making a request the app would never make,
which is exactly what authenticatedContext is for.

### Running them

    npm test                 fast, but fails with ECONNREFUSED if the emulator is
                             not already up
    npm run test:emulator    firebase emulators:exec starts it, runs vitest, shuts
                             it down, and exits with vitest's code

The second is what CI calls, so the missing-emulator failure cannot happen there.
It also runs the unit tests, which do not need the emulator and pay the startup
cost. Irrelevant at 2 seconds. If the suite grows, tests/ and tests/rules/ are
already separated so they can be split.

### A failed suite is not a failed test

When the emulator was down I got "5 skipped" and a failed suite, not five failed
tests. Setup threw in beforeAll, so nothing ran. Then a second error from
afterAll calling cleanup() on an undefined testEnv, which was a consequence, not
a separate problem. One cause, two messages. Guarded it with testEnv?.cleanup().

### The emulator needs Java

The Firestore emulator is a Java program. Locally I have OpenJDK 21. CI needs
setup-java explicitly rather than relying on whatever the runner image happens to
ship, which is the same reasoning as pinning the Node version.