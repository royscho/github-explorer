# Decisions

Why GitHub Explorer is built the way it is. [`docs/DESIGN.md`](docs/DESIGN.md) is the full design and
the source of truth; this document is the short version a reviewer can read first — the decisions
worth defending, each with its trade-off, plus **what changed during the build and why**, which is
usually the more interesting half.

Decisions that only emerged mid-implementation are marked **↻ changed mid-build**. Most of those came
out of code review or from running the real app, and each one is traceable to a step doc in
[`docs/steps/`](docs/steps/) and an entry in [`docs/ai-log.md`](docs/ai-log.md).

---

## 1. Architecture

### Three state tools, one job each

**Decision.** React Query owns **server** state, Zustand owns **client** state, MMKV owns
**persistence**. Server data lives in React Query only and is never copied into Zustand.

**Why.** The single biggest source of mess in a growing RN app is server data copied into a global
store: now it has two owners, two lifetimes and no clear invalidation story, and you end up
hand-rolling caching, pagination and refetching that React Query already does. Keeping the boundary
absolute means caching, pagination, retries, cancellation and offline behavior are a library
concern, and Zustand stays small enough to be boring — favorites and online status, no reducers, no
middleware stack beyond `persist`/`immer`.

**Trade-off.** Three libraries instead of one, and a rule the team has to actually hold. The payoff
is that no feature has ever needed to ask "where does this data live" — the question answers itself.

### Feature-based structure, one-way dependencies

**Decision.** `src/features/<feature>/{api,hooks,components,screens,store}` + `src/shared/` +
`src/app/`. Dependencies flow `screens → hooks → api/store → shared`. Features import each other only
through `index.ts`.

**Why.** Grouping by feature instead of by type (`components/`, `hooks/`, …) keeps everything a
change touches in one folder, and a feature's public surface is one file. It's the structure that
scales with team size, not just with file count.

**Trade-off.** It requires discipline that lint doesn't yet enforce; `eslint-plugin-boundaries` is
listed in §18 as the obvious next step.

**↻ changed mid-build.** Milestone 6 proved the rule's value the hard way. The favorite toggle
belongs on `RepoCard` (used by both Explore and Favorites), but `features/repos` importing
`features/favorites` — which imports `Repo` from `features/repos` — is a require cycle. Rather than
reach through the boundary, `RepoCard` took a `renderFavoriteToggle` render-prop slot that
`app/navigation` fills in. The feature stays unaware of favorites; the composition happens at the
app layer, which is the layer allowed to know about both.

### API DTOs never leave `api/`

**Decision.** `dto.ts` types the raw GitHub JSON; `mappers.ts` converts it to small domain models
(`Repo`, `RepoDetails`). UI code only ever sees domain models.

**Why.** One place to absorb an API change, and the UI isn't shaped by someone else's JSON.

**Trade-off.** A mapper per endpoint to write and test. It paid for itself in milestone 4 — see the
`watchers` bug in §3.

---

## 2. Networking

### Native `fetch`, not axios

**Decision.** A small `httpClient` wrapper over built-in `fetch`.

**Why.** React Query hands every query function an `AbortSignal`, and `fetch` takes one — so
cancellation is free and correct. axios's headline feature, interceptors, is not needed for a
read-only unauthenticated API. This is a zero-dependency decision that loses nothing.

**Trade-off.** Timeout handling is hand-rolled (combining a timeout signal with the caller's).
`AbortSignal.any` would be cleaner but isn't reliably available in the RN runtime.

### Errors are types, not strings

**Decision.** `NetworkError`, `NotFoundError`, `RateLimitError`, `ApiError` in
`shared/api/errors.ts`, mapped from the HTTP status (and `X-RateLimit-Remaining`). Retry policy and
UI copy are both driven off the type.

**Why.** "Organization not found" and "you've used your 60 requests this hour" need completely
different UX and completely different retry behavior — a 404 must never be retried, and retrying a
rate limit actively makes it worse. Encoding that in the type system means no screen has to
re-derive it from a status code.

**Trade-off.** More ceremony than `catch (e) { showError() }`, and GitHub's 403-vs-429 rate-limit
signalling needs care. It's the difference between an app that handles the rate limit and one that
hits it harder.

### Pagination from the `Link` header

**Decision.** `hasNextPage` comes from the `Link` header's `rel="next"`, not from counting pages.

**Why.** It's what GitHub actually tells you, so the list stops at the right place with no guessing.

**Trade-off.** A header parser to write and test. Deliberately **not** made fully RFC 8288 compliant
(unquoted/multi-value `rel`) — GitHub only ever sends quoted single-value `rel`, and a code review
suggestion to generalize it was rejected on those grounds.

### ↻ Domain dates are ISO strings, not `Date` instances

**Changed mid-build** (milestone 2, from review). `Repo.createdAt`/`updatedAt` were originally mapped
to `Date` objects. But `Repo` gets `JSON.stringify`'d twice over — into the favorites snapshot and
into the persisted query cache — and `JSON.parse` cannot turn a string back into a `Date`. Every
restored favorite would have had a string where the types promised a `Date`, and
`.toLocaleDateString()` would have thrown at render time.

Domain models now hold ISO-8601 strings and formatters parse at render time. Caught before any store
existed to expose it, which is the only reason it was cheap. DESIGN §5.4's "`Date`-safe" wording was
clarified to say this explicitly.

---

## 3. Data correctness

### ↻ `watchers` comes from `subscribers_count`, and only on the details endpoint

**Changed mid-build** (milestone 4, from review). GitHub's `watchers_count` is a legacy alias for
`stargazers_count` — identical numbers, always. The real watcher count is `subscribers_count`, and
it's only reliable on the single-repo endpoint.

The first implementation displayed `watchers` next to `stars` showing the same value. A type system
can't catch this, and a unit test asserting a mapper against its own fixture can't either — both
numbers are "correct" in the sense of matching the input. `watchers` moved off the base `Repo`
entirely and onto `RepoDetails`, sourced from `subscribers_count`. Worth recording because it's the
clearest example in this project of a bug that only domain knowledge finds.

---

## 4. Native module — `DeviceNetwork`

### A TurboModule, not the legacy bridge

**Decision.** A Codegen spec (`specs/NativeDeviceNetwork.ts`) generating typed Kotlin and Swift
interfaces; all methods async; one typed `EventEmitter` event.

**Why.** Calls go over JSI instead of serialized bridge messages, the module loads lazily, and
Codegen means JS and native cannot drift apart — the spec is the contract, and a native signature
that doesn't match stops compiling. Keeping every method a `Promise` guarantees nothing blocks the
JS thread.

**Trade-off.** Requires the New Architecture and a recent RN version; `NativeEventEmitter` was the
planned fallback if the Codegen `EventEmitter` hadn't been available.

### Network + device state, because the app needs it

**Decision.** The assignment asked for a native module without prescribing what it does. This one
reports connectivity and device info, and the app genuinely depends on it: each
`onNetworkStatusChanged` event updates both the Zustand network store **and** React Query's
`onlineManager`.

**Why.** That second half is the point. It's what makes queries _pause_ while offline and resume on
reconnect rather than failing and burning retries against a 60/hour budget. A module that only
powered a label in Settings would have been a demo; this one is load-bearing, and
**Settings → Device** doubles as a visible window into it.

**Trade-off.** Two real platform implementations to get right
(`ConnectivityManager`/`NetworkCallback` vs `NWPathMonitor`), and their semantics differ in ways
Jest cannot test — see §8.

**↻ changed mid-build** (milestone 7, from review). Two native fixes worth noting: Android's
`isConnected` was gated on `NET_CAPABILITY_VALIDATED`, which flashes "offline" on every network
switch because validation completes asynchronously _after_ the switch — changed to
`NET_CAPABILITY_INTERNET`, which also matches iOS's `.satisfied` more closely. And the Kotlin
`networkCallback` field was read from the method-invocation thread and written by `invalidate()`'s
teardown thread with no guard — made `@Volatile`.

---

## 5. Navigation & UI

### One `RepoDetails` route, pushed, not a modal

**Decision.** Registered once in the root stack, reachable from Explore, Favorites and (in future) a
deep link. Params are IDs only (`{ owner, repo }`).

**Why.** Three entry points, one screen — registering it per-tab would mean three copies and three
places to fix. Push with native back is right because details are drill-down content, not a separate
task: the tabs stay mounted underneath, so going back returns to the same list _and_ the same scroll
position. ID-only params are serializable, which is what makes deep linking and state restoration
possible later.

**Trade-off.** The screen can't assume a list already loaded it, so it uses the cached list item as
`placeholderData` and fills in the rest — more moving parts than passing the whole object, but it
works from a cold deep link too.

**↻ changed mid-build** (milestone 4). `placeholderData` makes React Query report
`status: 'success'` (not `'pending'`) while the real fetch is in flight. That tripped two separate
bugs on the first pass: a pull-to-refresh spinner that showed during the initial load, and an error
check that got its precedence wrong. Easy to get wrong by intuition.

### FlashList over FlatList

**Decision.** `@shopify/flash-list` v2 for the repo lists.

**Why.** FlatList mounts a component per row and unmounts far-off rows; on a long infinite list that
costs CPU and memory and shows blank cells during fast scrolling. FlashList recycles rows, so memory
stays flat however long the list grows. For one 30-item page it wouldn't matter — it matters as
infinite scroll accumulates pages, and in DESIGN §7's 50k-repo scenario.

**Trade-off.** A dependency, and its scroll physics can't be driven from the test renderer (it needs
real layout measurement). Screen tests therefore mock it with a `View`-based stand-in and verify
_this screen's wiring_ to FlashList's props — FlashList's internals are its own test suite's job.

### `makeStyles(theme => …)` + `useStyles()`

**Decision.** Styles are declared with a factory that calls `StyleSheet.create` **once per theme**
and caches it at module level. No inline style objects, no hard-coded colors.

**Why.** Every one of the (potentially hundreds of) mounted `RepoCard`s shares one style object, and
styles rebuild only when the theme changes — cheaper than a `useMemo` per instance, and components
stay free of theme plumbing. Style definitions later moved out of component files into
`use<Component>Styles.ts` hooks, so component files hold only JSX and local logic.

**Trade-off.** Genuinely data-dependent styling (a per-language pill color, the offline banner's
safe-area padding) still needs an inline `style={[...]}` array. That's a conscious reading of the
rule — static design tokens go through `makeStyles`; values computed from runtime data cannot.

### No UI kit

**Decision.** `shared/components` is hand-built (`Screen`, `Text`, `Card`, `ErrorView`,
`EmptyView`, `LoadingView`, `ListFooterLoader`, `ErrorBoundary`). The only UI dependencies are what
navigation requires, FlashList, and Ionicons.

**Why.** For an app this size a kit would add weight, an opinionated look and an upgrade treadmill,
in exchange for components that are a few dozen lines each.

**Trade-off.** More to write, including the theming layer. It also keeps the accessibility
story under our control — role and label on every pressable, which the tests assert by querying
role/label.

### Hand-written `formatRelativeTime` / `formatCompactNumber`

**Decision.** Two small, fully unit-tested helpers instead of a date library.

**Why.** Hermes ships only partial `Intl` support — `RelativeTimeFormat` and compact notation are
unreliable — so the "just use `Intl`" answer doesn't hold on the actual runtime. `Intl.DateTimeFormat`
_is_ used, for absolute dates, where it works.

**Trade-off.** Two functions to own, and they're English-only (see §9). date-fns is the named
fallback if needs grow. Both had real edge-case bugs caught by review — `999_950` formatting as
`"1000k"` instead of `"1m"`, and an unparseable date yielding `"NaN years ago"`.

### One colored-dot exception to "no hard-coded colors"

**Decision.** A bounded ~15-language color map (`features/repos/constants.ts`) drives the language
pill's dot and tint. Unmapped languages fall back to a neutral theme color.

**Why.** It's a data-driven indicator — the same convention GitHub itself uses — not a theme color
hardcoded in a component. Flagged as a deliberate exception and confirmed before implementing,
rather than quietly bent.

**Trade-off.** It is still a hardcoded list that no theme can restyle. Bounded on purpose: ~15
languages, with a graceful fallback, instead of the full several-hundred-entry map.

---

## 6. Search & filter

### ↻ The org search fires only on an explicit action

**Changed mid-build** (milestone 5, by product direction, in two rounds). The design originally
specified a ~500 ms debounced auto-search in addition to the Search button. That was implemented,
then removed: the query now runs **only** on a Search press or keyboard submit, and never while
typing. A submission under 2 characters shows an inline "Enter at least 2 characters" message
instead of searching. `docs/DESIGN.md` §7 was rewritten in the same PR to match.

**Why.** Every keystroke-triggered search spends from a 60-requests/hour budget on a query the user
hadn't asked for yet. Explicit-trigger-only makes the cost model obvious to the user.

**Worth keeping** from the removed mechanism: a debounce effect must depend _only_ on the debounced
value, never on state that the explicit action also writes — depending on both made the effect re-run
right after `setOrg` and snap the org back to the stale debounced value.

### The name filter is client-side

**Decision.** `useDebounce` (~250 ms) + `useMemo` over the already-loaded repos. No API calls while
typing. Infinite scroll pauses while a filter is active.

**Why.** The repos are already in memory; re-asking the server to filter them would be slower and
cost rate limit. Pausing pagination matters because a short filtered list fits the viewport and would
otherwise trigger `onEndReached` repeatedly.

**Trade-off, stated plainly.** It only searches _loaded pages_. At DESIGN §7's 50k-repo scale that
stops being meaningful and the answer is GitHub's Search API
(`q=org:{org}+{term}+in:name`) — debounced, cancelable, paginated, with its own lower rate limit.
Known and documented, not hidden.

**Known issue, documented not fixed.** A narrow filter can make FlashList fire `onEndReached` from
layout alone, independent of scrolling. Pre-existing (a short unfiltered first page behaves the same
way), and a real fix means distinguishing layout- from scroll-triggered `onEndReached`.

---

## 7. Favorites

### Snapshots, not IDs

**Decision.** `favoritesStore` persists a `Record<id, Repo>` — the whole repo — not a list of IDs.

**Why.** The Favorites tab then works with no network and no API calls at all. Storing IDs would mean
_n_ requests on open, which is both slow and the worst possible use of the rate limit, and would make
the offline case impossible.

**Trade-off.** Snapshots can go stale (a star count from last week). For this screen that's clearly
the right trade; the store is versioned (`version` + `migrate`) so the shape can evolve.

**↻ changed mid-build** (milestone 6, from review). `toggleFavorite` was persisting a full
`RepoDetails` — including fabricated placeholder values — rather than a `Repo`-shaped snapshot.
Separately, `useIsFavorite(id)` is a selector specifically so that toggling one favorite re-renders
one card and not the list.

---

## 8. Offline

### The React Query cache is persisted to MMKV

**Decision.** `PersistQueryClientProvider` over an MMKV-backed persister, with a 24h `maxAge` and a
cache buster tied to the app version. Favorites are snapshots, so they work offline regardless.

**Why.** It satisfies "keep working with the last successful data" for free across _every_ query,
rather than per-screen caching logic. MMKV's synchronous reads mean no loading flash.

**Trade-off / honest limitation.** §11's "the last viewed list renders immediately" isn't fully
achieved: `ExploreScreen`'s `org` is local `useState`, so a cold launch still opens on the empty
search state even though that org's data is sitting restored in cache. Persisting "last searched org"
is real new scope and wasn't folded in uninvited. The last-synced timestamp is also global rather
than per-query, so it can show a technically-correct-but-misleading time.

### ↻ Dehydrate "has ever loaded data", not `status === 'success'`

**Changed mid-build** (milestone 8, from review — the most consequential automated finding in the
project). The obvious filter, `shouldDehydrateQuery: status === 'success'`, is wrong in a way that
reads as correct: every save dehydrates and overwrites the _whole_ cache, so the moment any later
background refetch failed — a rate limit, say, which §13 says never to retry — that query's
already-cached data would be dropped from storage. The exact "keep the last successful data while
offline" requirement would have broken, quietly.

Now `query.state.data !== undefined`. No first-pass test caught it because every test used queries
that only ever succeeded or only ever failed, never both in sequence; there's now a regression test
for exactly that sequence.

### ↻ React Query _pauses_ offline queries — which is not "pending"

**Changed mid-build** (milestone 8, found by running the app). Searching an org with nothing cached
while offline hung on the loading skeleton forever. React Query doesn't fail a fetch when offline, it
**pauses** it, and both screens' `status === 'pending'` check couldn't tell that apart from "still
fetching". `isPaused` is now surfaced through `useOrgRepos`/`useRepoDetails` with an explicit offline
branch in both screens.

No mocked-hook screen test could have caught this, because none of them drove a query through React
Query's real pause/resume state machine. Along with the MMKV bug below, it's why "does this path
traverse the real machinery, or just assert against a hand-set mock value" became a standing question
for anything network-dependent.

### Async persister over the sync one

**Decision.** `createAsyncStoragePersister`, even though MMKV is synchronous and
`createSyncStoragePersister` looks like the more literal fit.

**Why.** The sync persister's own JSDoc marks it `@deprecated` in favor of the async one, whose
storage interface accepts synchronous return values just as happily (`MaybePromise<T>`). No
behavioral difference for a synchronous backing store.

**Trade-off / process note.** This substitution was made mid-implementation from reading a
deprecation notice, not from the step plan. Same intent, so no re-approval was sought — but the
honest lesson is that it should have been surfaced before writing the code rather than documented
after.

---

## 9. Deliberate scope cuts

Each of these was considered and written up rather than silently dropped — the reasoning is in
`docs/DESIGN.md`.

| Not built                | Status                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Theme picker**         | Tokens, light/dark and the whole theming layer are built and follow the system setting; the persisted `system \| light \| dark` override isn't wired (§9)                                                                                                                                                                                                                                         |
| **Deep linking**         | Route params are already IDs-only and serializable, so the screen is deep-link-_ready_; the `linking` config isn't registered (§6.1)                                                                                                                                                                                                                                                              |
| **i18n / RTL**           | Planned via `i18next` + `react-i18next`, RTL through `I18nManager`. §18 names the exact work: 6 physical style properties (in three style hooks) to convert to logical `end`/`paddingEnd`/`marginEnd`, inline strings to extract, and locale-aware replacements for the two hand-written formatters                                                                                               |
| **ETag requests**        | `If-None-Match` with cached ETags — GitHub `304`s don't count against the rate limit. The highest-value next step for this app (§18)                                                                                                                                                                                                                                                              |
| **`.env` config**        | No env layer today, deliberately — one unauthenticated read-only API, no secrets to hold, and the two configurable values (`BASE_URL`, `TIMEOUT_MS`) are constants in `shared/api/httpClient.ts`. `react-native-config` once a Sentry DSN or a local-dev GitHub token exists; a bundled token is extractable from the IPA/APK, so that road ends at OAuth or a backend proxy, not at `.env` (§18) |
| **Auth / private repos** | Non-goal. Would also raise the rate limit from 60 to 5,000/hour                                                                                                                                                                                                                                                                                                                                   |
| **E2E & native tests**   | Maestro/Detox and JUnit/XCTest are future work; the time box went to unit/hook/component coverage instead                                                                                                                                                                                                                                                                                         |

---

## 10. Process

**One milestone = one step doc + one branch + one PR.** Each `docs/steps/NN-*.md` is written and
approved _before_ any code: goal, files, public APIs, the full test list, out-of-scope, risks, and
deviations from DESIGN.md. Conventional commits; CI runs lint + typecheck + tests on every PR.

**Every step ships its tests** — 330 tests across 64 suites, next to the code, covering success,
loading, error and empty paths. No test was ever skipped, weakened or deleted to make checks pass,
and no lint rule was disabled for it.

**`docs/DESIGN.md` is the source of truth, and deviations update it in the same PR.** That rule is
why §7 (org search), §5.4 (date handling), §9 (`Card`, elevation tokens, icon package) and §3.2
(`app/hooks`) all read differently now than when they were written — the doc tracked reality instead
of drifting from it.

**Two models, two roles.** Implementation by Claude Sonnet, review by a stronger Opus-based
`code-reviewer` agent reading the diff against DESIGN.md and CLAUDE.md, with human approval gates
after the plan and before any push. What that caught, and what it missed, is written up in
[`AI_USAGE.md`](AI_USAGE.md).

---

## 11. What I'd do next

1. **ETag conditional requests** — biggest win available; `304`s are free against the rate limit.
2. **`eslint-plugin-boundaries`** — make the architecture rules fail CI instead of relying on review.
3. **Persist the last searched org**, closing the gap in §8's offline story.
4. **Theme picker and deep linking** — both are small, and the groundwork for each is already in.
5. **MSW** for network tests with real headers, pagination and `304`s, then Detox/Maestro for the
   flows that mocked tests structurally cannot cover.
6. **Sentry** behind the existing `shared/logger` abstraction, with `DeviceNetwork`'s device info as
   context — the seam is already there.
