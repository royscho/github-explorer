# AI usage

This project was built with heavy, deliberate AI assistance, and this document is the honest account
of it: how the workflow was set up, what AI produced, what it caught that I would have missed, what
it got wrong, and the two bugs it was structurally incapable of catching.

[`docs/ai-log.md`](docs/ai-log.md) is the raw per-milestone log written as each step shipped — every
reviewer finding, every rejection and its reason. This is the readable synthesis.

---

## The workflow

AI wasn't used as autocomplete. It was used as two distinct roles with a human gate between them,
wired into the repo so the process was repeatable rather than improvised:

| In the repo                                       | What it does                                                                                                                             |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| [`CLAUDE.md`](CLAUDE.md)                          | The project's rules, loaded into every session: stack, architecture rules, test policy, commands, workflow                               |
| [`.claude/skills/gen-step`](.claude/skills/)      | `/gen-step <N>` runs one milestone end to end: plan → **gate** → branch → implement → test → check → review → log → **gate** → commit/PR |
| [`.claude/agents/code-reviewer`](.claude/agents/) | A read-only reviewer on a **stronger model** than the implementer, reading the diff against `docs/DESIGN.md` and `CLAUDE.md`             |
| [`docs/steps/NN-*.md`](docs/steps/)               | The plan for each milestone — approved **before** any code was written                                                                   |
| [`docs/ai-log.md`](docs/ai-log.md)                | What AI produced, what I changed or rejected, how it was validated                                                                       |

**Two models, two roles.** Implementation ran on Claude Sonnet; review ran on an Opus-based agent.
Using a stronger model to review a cheaper model's work turned out to be the single highest-value
decision in this setup — the review found a genuine blocker or correctness bug in the majority of
milestones.

**Two human gates per milestone**, non-negotiable: I approve the step plan before any code exists,
and I approve the push before anything leaves my machine. Nothing was ever pushed or merged
automatically.

**Design came first, by a human-directed session.** `docs/DESIGN.md` was written in plan mode before
milestone 1, and the decisions in it — the React Query/Zustand/MMKV split, the TurboModule, one
pushed details route, feature-based folders, `makeStyles`, Sonnet-implements/Opus-reviews — were
mine. The doc then stayed the source of truth: when implementation deviated, the PR updated the doc
in the same branch.

### Scale

| #   | Milestone               | Implementer | Reviewer findings                | Tests |
| --- | ----------------------- | ----------- | -------------------------------- | ----: |
| 00  | Design                  | Opus 5.5    | —                                |     — |
| 01  | Scaffold + tooling + CI | Sonnet 5    | 8 fixed                          |     2 |
| 02  | API layer               | Sonnet 5    | 11 fixed, 1 rejected             |    52 |
| 03  | Repo list               | Sonnet 5    | 19 fixed (incl. 1 blocker)       |   146 |
| 04  | Repo details            | Sonnet 5    | 9 fixed                          |   200 |
| 05  | Search & filter         | Sonnet 5    | 10 fixed, 1 documented           |   229 |
| 06  | Favorites               | Sonnet 5    | 12 fixed, 2 rejected, 1 deferred |   263 |
| 07  | Native module           | Sonnet 5    | 8 fixed                          |   292 |
| 08  | Offline                 | Sonnet 5    | 12 fixed                         |   316 |
| 09  | UI polish               | Sonnet 5    | 6 fixed                          |   330 |
| 10  | Docs                    | Opus 5      | — (no code diff to review)       |   330 |
| —   | Network resume fix      | Opus 5      | 6 fixed, 2 rejected              |   336 |
| —   | DevTools (Rozenite)     | Opus 5      | 10 fixed                         |   338 |

**~111 review findings fixed, 5 rejected on technical grounds, 2 documented as known trade-offs.**
Final state: 338 tests in 64 suites, lint and typecheck clean.

---

## What AI generated

Effectively all of the code, and all of the tests, under the plans and rules above: the API layer and
its typed errors, the theme system, every shared component, all four features, the Kotlin and Swift
TurboModule implementations and their Codegen spec, the offline persistence layer, and the test for
every file.

**What was mine:** the design and every architectural decision in it; the step plans (approved or
amended before implementation); product direction, including two mid-build requirement changes;
rejecting AI's fixes when the fix was in the wrong place; the manual device testing that found what
the test suite couldn't; and the call on every reviewer finding — accept or reject with a reason,
never blanket-apply.

---

## Where AI was genuinely valuable

**It caught a cross-cutting bug that two correct-looking pieces created together.** (#03, blocker.)
A pagination or refresh failure — hitting the 60/hour rate limit on page 3, say — replaced the
_entire already-loaded list_ with a full-screen error whose Retry called `refetch()`, which
re-fetches every page from 1, spending more of the exact budget it had just exhausted. Each half
looked fine alone. This is the class of bug that's hardest to see while building one state at a time,
and it was the most valuable single finding in the project.

**It found a data-correctness bug that needed real API knowledge.** (#04.) GitHub's `watchers_count`
is a legacy alias for `stargazers_count` — so the details screen was displaying the star count twice
under two labels. No type system catches that, and a mapper test asserting against its own fixture
can't either. It took knowing the quirk. Fixed by sourcing `watchers` from `subscribers_count` on the
details endpoint only.

**It caught a serialization bug two milestones before anything could expose it.** (#02.) Domain
dates were mapped to `Date` instances, but `Repo` gets `JSON.stringify`'d into both the favorites
snapshot and the persisted query cache, and `JSON.parse` can't restore a `Date`. Caught before either
store existed — which is the only reason it cost nothing.

**It caught a plausible one-liner that would have quietly broken the headline feature.** (#08.) The
persistence filter `shouldDehydrateQuery: status === 'success'` reads like a faithful implementation
of the design's "successful queries only". But every save overwrites the whole cache, so the moment
any later background refetch failed, that query's cached data would vanish from storage — breaking
the exact "keep working with the last successful data while offline" requirement. Now
`query.state.data !== undefined`, with a regression test for the succeed-then-fail sequence that no
first-pass test exercised.

**It caught my own misreading of my own design doc.** (#06.) I'd placed the favorite toggle on the
details screen only, reasoning from §6.3's content list — while §8, §12 and §14 all clearly assumed a
per-card toggle. The review cross-referenced the sections I hadn't.

**And it found an injection-shaped gap in path building.** (#02.) `org`/`owner`/`repo` were
interpolated into request paths unencoded — a real risk once the org field became user-typed in
milestone 5, and additionally untested because Jest's Node `URL` and RN's polyfill disagree on `..`
path-segment resolution.

---

## Where AI was risky, wrong, or not enough

### The two bugs the test suite could not catch

Both are the same root cause, and they're the most important lesson here: **every test in this
codebase mocks MMKV and mocks the native module, so any behavior that depends on a real state machine
was invisible to a fully green suite.**

**Favorites didn't survive a restart** (#06) — found by me running the app, not by any test. The JS
was correct. The cause was build state: two stale Xcode `DerivedData` folders meant the running
binary predated `react-native-mmkv` being linked, so MMKV's native half genuinely wasn't registered,
while JS hot-reloaded independently against it. Diagnosed by connecting to the live Hermes runtime
over Metro's CDP inspector and probing `nativeModuleProxy` against a known-good module as a control.
Then verified properly: a value written through the real native module, a genuine
`simctl terminate` + `launch`, and a successful read back — direct proof of the mechanism, not a
passing mock.

**An offline search hung on the skeleton forever** (#08) — also found by me running the app. React
Query _pauses_ a fetch when offline rather than failing it, and `status === 'pending'` can't
distinguish that from "still fetching". Fixed by surfacing `isPaused` with an explicit offline branch
in both screens. No mocked-hook screen test could have caught it, because none of them drove a query
through the real pause/resume machinery.

**The standing question this produced:** _does this path traverse the real machinery, or does it just
assert against a hand-set mock value?_ A green suite answers nothing about the former.

### A fix that could not have worked, shipped with five passing tests

The clearest single example in the project, and it happened last. A stuck offline banner was traced
to network state being seeded once per mount, and the fix re-read `getNetworkState()` when the app
returned to the foreground. Five new tests, all green, lint and typecheck clean.

Review found two things. First, the fix **could not have fixed the reported symptom**: on iOS
`getNetworkState()` returns the running `NWPathMonitor`'s `currentPath`, so re-reading a monitor
that had gone stale returns the identical stale answer — the monitor has to be recreated, which is
what a JS reload was doing all along. Second, **none of the five tests distinguished the new event
counter from the old latching boolean it replaced** — reverting that one line left every test green
while making the fix dead on any device that had seen a single event.

Both were caught by reading the native Swift against the JS, not by running anything. The lesson
isn't "write more tests" — there were five. It's that tests written by the same reasoning that
produced the bug tend to encode the same mistake, and that a confident green suite is the most
comfortable place for a wrong assumption to hide.

### A library bridge that worked for one store, not two

The mirror image of the bug above: this time, careful source-reading said it should work, and only
running the real thing said otherwise. Wiring a second devtools tool (live Zustand store
inspection) meant bridging zustand's own `devtools` middleware — which only looks for a
browser-extension global React Native doesn't have — to a Rozenite plugin that instead exposes a
standard Redux `StoreEnhancer`. A throwaway Redux store built through that enhancer, with a reducer
that always read the zustand store's live state, used only the enhancer's own documented, stable
contract — verified by reading the plugin's actual shipped code (not its README), which confirmed
each connected store gets a genuinely unique `instanceId` in an internal registry. Every reason to
expect it would scale to more than one store. It worked perfectly for the first store connected.
The second, in the same running app, never appeared in the panel's instance list — a real
limitation (or bug) in that plugin's current handling of multiple simultaneous connections, visible
only once two stores were actually running live side by side, not from anything in its source.

Rather than keep debugging an undocumented edge of someone else's plugin, the fix was a different
library entirely: a second package existed, purpose-built for inspecting multiple Zustand stores
specifically, that needed no enhancer, no bridge-building, and no extra dependency at all — found
only because the user, watching the first approach fail live, asked whether a dedicated package
existed, which hadn't come up in the research that led to the first approach. Swapped in, verified
live with both stores streaming real state simultaneously, and the entire hand-rolled bridge (plus
the dependency it needed) was deleted outright rather than kept as a fallback.

Two lessons, read together with the entry above: source-reading and live testing catch different
classes of wrong assumption, and neither substitutes for the other. The other lesson is narrower
but worth stating plainly — "is there already a purpose-built tool for this" is worth asking before
"how do I bridge two general-purpose ones," and here it took a second pair of eyes to ask it.

### Other recurring failure modes

**The same async-test gotcha, three times.** This version of `@testing-library/react-native` makes
`render`, `renderHook` and `unmount` async, and omitting `await` **doesn't throw** — it silently
leaves RNTL's `screen` unbound, surfacing later as a confusing unrelated error. It bit milestone 1,
again in 3, and again in 7. Worth generalizing to every async helper the library exposes rather than
re-learning per helper.

**The reviewer introduced a broken test.** (#07.) The review's own new test called `unmount()`
without `await`; its assertions ran before cleanup fired, and the dangling unmount then resolved
mid-flight during the _next_ test, breaking two more. Found by me after the review pass, before
committing — a concrete reminder that review output needs verifying too, and that "the reviewer wrote
it" is not evidence it's right.

**Weak tests that pass vacuously.** Across milestones, review caught: a test that only checked render
didn't throw; a "starts empty" store test that couldn't fail; a `useDebounce` cleanup test that would
have passed without real cleanup; `expect.anything()` where `expect.any(AbortSignal)` was meant; a
`queryByText(/watchers/)` assertion that passed only because the word had moved out of visible text.
A test that cannot fail is worse than no test, because it reports confidence it hasn't earned.

**Confident intuition about library semantics, wrong twice in one file.** (#04.) `placeholderData`
makes React Query report `status: 'success'`, not `'pending'`, while the real fetch is in flight —
which broke both an error-precedence check and a refresh spinner on the first pass.

**A fix in the right spirit but the wrong place — which I rejected.** (#05.) AI proposed logging 404s
as `warn` instead of `error`, reasonable on its face since an org typo isn't an app bug. But it
implemented this in the _global_ `QueryCache.onError` handler, which would also silently downgrade
404s from unrelated queries where a 404 means something different. Reverted before commit; the right
shape is per-query React Query `meta` that the global handler reads.

**Scope corrections cascade.** (#06.) Correcting one wrong assumption about where the favorite toggle
lives turned into a real architecture decision — a render-prop slot threaded through four files to
avoid a `features/repos` ↔ `features/favorites` require cycle. The blast radius of "where does this
prop come from" can far exceed the original mistake.

**Mid-implementation substitutions should be surfaced, not just documented.** (#08.) Swapping the
deprecated sync persister for the async one was correct, but it was decided while writing code and
only written up afterward. Same intent, so I didn't require re-approval — but it should have been
raised first.

**Native fixes remain the least verified code here.** (#07.) The `NET_CAPABILITY_INTERNET` and
`@Volatile` changes compile and typecheck, but Jest's mocked native module cannot exercise a real
connectivity switch or a teardown race. They're reasoned, not proven.

---

## What I'd tell someone doing this

1. **Write the design first, by hand, and make it the contract.** Every useful review finding came
   from the reviewer checking a diff against a document that already said what the system should do.
   Without that, review degenerates into style notes.
2. **Review with a stronger model than you implement with.** The cost difference is trivial next to
   one blocker caught before merge.
3. **Plan, then gate, then code.** Writing the file list, the public API and the _full test list_
   before implementing is what kept each milestone from sprawling — and made "out of scope" a
   decision rather than an accident.
4. **A green test suite is a claim about what you tested, not about what works.** Both of the worst
   bugs here passed every test. Run the real app, on a real device, after a real restart.
5. **Never blanket-apply review findings.** Three were rejected on technical grounds and one of AI's
   own fixes was reverted for being in the wrong place. Each finding needs verifying, not obeying.
6. **Make the AI's own mistakes part of the record.** Writing `docs/ai-log.md` as each step shipped
   is why the recurring patterns above — the async-helper gotcha, the mock-vs-real-machinery blind
   spot — became visible as _patterns_ instead of nine unrelated annoyances.
