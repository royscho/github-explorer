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

**↻ changed after milestone 10, from a final review round.** A third, and the most severe Android
defect in the project: `AndroidManifest.xml` never declared `ACCESS_NETWORK_STATE`. Both
`registerDefaultNetworkCallback` and `getActiveNetwork` require it, so `startNetworkMonitoring` and
`getNetworkState` would have thrown `SecurityException` on every Android run — the offline banner,
the `onlineManager` wiring and Settings → Device all dead, on the one platform that had seen less
device time. Nothing in JS, lint, typecheck or 338 passing tests could surface it: a missing
permission is not a compile error, and every test mocks the native module. Found by reading the
Kotlin against the manifest, confirmed against the SDK's own `@RequiresPermission` annotations, and
fixed with the declaration plus `SecurityException` guards that reject the promise rather than
throwing out of a TurboModule method. Verified on a Pixel 9 emulator: permission granted, and
toggling connectivity drives `onLost` through to the banner.

### ↻ The monitor is recreated when the app resumes, not just re-read

**Changed after milestone 09, from manual testing.** Network state was seeded exactly once per
mount, so any missed `onNetworkStatusChanged` event left the store and `onlineManager` stale until
the next remount — which is why reloading the app appeared to "fix" a stuck offline banner.

The first attempt re-read `getNetworkState()` on foreground. Code review showed that **could not
have worked on iOS**: `getNetworkState()` returns the running `NWPathMonitor`'s `currentPath`, so a
monitor that went stale returns the same stale answer. Only a new monitor forces a real update,
since `start(queue:)` always delivers an initial path — precisely the mechanism a JS reload relies
on. `startNetworkMonitoring()` alone can't do it either, being idempotent by design
(`if monitor == nil`). So a resume now does `stopNetworkMonitoring()` → `startNetworkMonitoring()` →
re-read. On Android the re-read alone would have sufficed, since `getNetworkState()` there is a live
`ConnectivityManager.activeNetwork` query — a real platform difference the first attempt missed.

It fires only on an `'active'` that follows an observed `'background'`, since `'active'` also fires
for transient interruptions that never suspended the app (Control Centre, the app switcher, Face
ID). Verified on a simulator by clearing a genuinely stuck banner with a background/foreground
cycle, with the process PID unchanged to prove it wasn't a restart doing the work.

**Trade-off / honest limitation.** The only _demonstrated_ failure was in the iOS Simulator, where
`NWPathMonitor` goes silent; the device-level case — a suspended app genuinely missing a path
update — is plausible but unproven. And if the app is never backgrounded, a stuck state persists
until it is, because the monitor is the only thing that would report recovery.

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

**Trade-off.** Two functions to own, and they're English-only (see §11). date-fns is the named
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

## 9. Performance

### Everything here is aimed at one screen

**Decision.** The performance budget went to the infinite list and nothing else: FlashList's cell
recycling (§5), a `memo`ized `RepoCard`, Zustand selectors scoped to a single card, and a `useMemo`
filter over debounced input.

**Why.** The list is the only surface in the app that grows without bound — details, favorites and
settings are fixed-size screens where a re-render costs nothing worth measuring. Each mechanism
closes a different leak. `memo` stops a parent re-render from re-rendering thirty cards, but only if
every prop is referentially equal — which is why `RepoCard` takes `onPress(repo)` rather than a
per-card closure, and why `renderItem` is a `useCallback` and `keyExtractor` a module-level
function rather than inline arrows. `useIsFavorite(id)` subscribes each card to one key of the store, so starring a
repo re-renders that card and not the list. The filter runs once per typing pause, not once per
keystroke.

**Trade-off.** Stable-reference discipline is invisible and easy to break: an inline arrow in
`renderItem` silently undoes `memo`, and no test or lint rule catches it. The honest limit — **none
of this was profiled.** There are no traces or frame measurements behind it, only the standard
mechanisms applied where the growth is. DESIGN §12 has the reasoning per mechanism.

### Fewer requests beats faster requests

**Decision.** A 5-minute `staleTime`, `per_page=30`, prefetch on `onPressIn`, and the persisted
cache (§8) — all of it exists to avoid issuing a request at all.

**Why.** Unauthenticated GitHub allows 60 requests/hour. At that budget caching is a correctness
concern rather than an optimization: `staleTime` means returning to Explore doesn't refetch, and
prefetching details on press-in spends the gap between finger-down and navigation committing, which
is enough to make the details screen open on content instead of a skeleton.

**Trade-off.** Prefetch spends a request on presses the user abandons, which is the wrong trade at
60/hour if it happened often — it's bounded by `staleTime` deduping repeat presses on the same repo,
and by the fact that a press-in usually becomes a press. ETag requests (§11) would remove the
tension entirely, since `304`s don't count against the limit.

---

## 10. Testing strategy

### Four layers, and a rule that every step ships its own

**Decision.** Over 340 tests across 64 suites, co-located as `Foo.tsx` + `Foo.test.tsx`, in four
layers:
**unit** (formatters, `Link`-header parsing, mappers, typed errors, the favorites store), **hook**
(`useOrgRepos`/`useRepoDetails` driven through a real `QueryClientProvider`), **component** (RNTL,
queried by role and label) and **screen** (wiring — that a press navigates, that a failure renders a
Retry). `lint`, `typecheck` and `test` all pass before any commit, and CI blocks the merge.

**Why.** Querying by role and label makes the component tests double as the accessibility check
(§5) — one suite covering two requirements, and a renamed label breaks a test rather than silently
degrading VoiceOver. Hook tests drive React Query's real state machine instead of asserting against
a hand-set mock, which is the only reason the offline pause/resume behavior was testable at all.

**Trade-off.** No E2E and no native unit tests (§11). FlashList needs real layout measurement, so
screen tests mock it with a `View`-based stand-in and verify _this screen's_ wiring to its props
(§5); nothing here asserts that FlashList actually recycles, which is its own suite's job.

### The bugs a green suite could not catch

Three of the most consequential bugs in this project shipped with every test passing: the dehydrate
filter that would have dropped cached data on a failed background refetch (§8), the paused query
that hung on a skeleton forever (§8), and the network monitor that went stale when the app resumed
(§4). None was reachable by a test asserting against a mock — each needed either React Query's real
machinery or a real device.

That turned into a standing question for anything network-dependent: **does this path traverse the
real machinery, or just a hand-set mock value?** All three have regression tests now, each written
against the exact sequence that broke rather than against the shape of the fix.

---

## 11. Deliberate scope cuts

Each of these was considered and written up rather than silently dropped — the reasoning is in
`docs/DESIGN.md`.

| Not built                 | Status                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Theme picker**          | Tokens, light/dark and the whole theming layer are built and follow the system setting; the persisted `system \| light \| dark` override isn't wired (§9)                                                                                                                                                                                                                                         |
| **Deep linking**          | Route params are already IDs-only and serializable, so the screen is deep-link-_ready_; the `linking` config isn't registered (§6.1)                                                                                                                                                                                                                                                              |
| **i18n / RTL**            | Planned via `i18next` + `react-i18next`, RTL through `I18nManager`. §18 names the exact work: 6 physical style properties (in three style hooks) to convert to logical `end`/`paddingEnd`/`marginEnd`, inline strings to extract, and locale-aware replacements for the two hand-written formatters                                                                                               |
| **ETag requests**         | `If-None-Match` with cached ETags — GitHub `304`s don't count against the rate limit. The highest-value next step for this app (§18)                                                                                                                                                                                                                                                              |
| **`.env` config**         | No env layer today, deliberately — one unauthenticated read-only API, no secrets to hold, and the two configurable values (`BASE_URL`, `TIMEOUT_MS`) are constants in `shared/api/httpClient.ts`. `react-native-config` once a Sentry DSN or a local-dev GitHub token exists; a bundled token is extractable from the IPA/APK, so that road ends at OAuth or a backend proxy, not at `.env` (§18) |
| **Auth / private repos**  | Non-goal. Would also raise the rate limit from 60 to 5,000/hour                                                                                                                                                                                                                                                                                                                                   |
| **E2E & native tests**    | Maestro/Detox and JUnit/XCTest are future work; the time box went to unit/hook/component coverage instead                                                                                                                                                                                                                                                                                         |
| **Full CI/CD (Fastlane)** | Today's CI is lint/typecheck/test only — it never produces a signed native build. Fastlane-driven signing, versioning and TestFlight/Play Store internal-track delivery from GitHub Actions is the remaining step from green checks to an installable build (§18)                                                                                                                                 |

---

## 12. Runtime DevTools

**Decision.** [Rozenite](https://www.rozenite.dev/) adds a TanStack Query panel
(`@rozenite/tanstack-query-plugin`) and a Zustand panel (`rozenite-zustand-devtools`) directly into
React Native's own built-in DevTools — no Flipper, no extra app screen.

**Why.** Both panels show the exact two state systems this app's architecture is built around
(§1) — the server cache and the client stores — live, with zero app code written for the purpose
beyond registering what to show. Both hooks are verified, in their own shipped code rather than
just their docs, to no-op at app runtime once `NODE_ENV === 'production'`.

**↻ changed mid-build, a second time.** `metro.config.js` first passed an explicit
`enabled: process.env.NODE_ENV !== 'production'` to `@rozenite/metro`'s `withRozenite`, reasoning
that an explicit choice beats trusting a library default that its own console output says is going
away. Code review found this exactly backwards: Metro's CLI loads `metro.config.js` — evaluating
that expression — _before_ it sets `NODE_ENV` for a release bundle (confirmed by reading
`@react-native/community-cli-plugin`'s `buildBundle.js`: `loadMetroConfig` runs first,
`process.env.NODE_ENV = ...` only afterward), so the expression always read a stale, not-yet-set
`NODE_ENV` and evaluated to "on" for a release build — the opposite of its intent. The library's
own default, which this explicit value had also silently bypassed, instead inspects the actual
invoking command (confirmed by reading `@rozenite/metro`'s own source: it checks for the
`bundle`/`export` CLI subcommand, including the exact path Xcode/Gradle invoke for a release build)
and already does this correctly. Reverted to passing no `enabled` option at all — the harmless
one-time console warning this version prints as a result was accepted rather than worked around with
a less-correct replacement condition.

**↻ changed mid-build.** Zustand support took two attempts. The first wired zustand's own
`devtools` middleware to Rozenite's `@rozenite/redux-devtools-plugin` by hand: zustand's middleware
only looks for a browser-extension global (`window.__REDUX_DEVTOOLS_EXTENSION__`) that Rozenite
doesn't provide, but the plugin exposes a standard Redux `StoreEnhancer` instead, so a throwaway
Redux store built through that enhancer — with a reducer that always reads the zustand store's
current state — bridged the two using only the enhancer's own documented, stable contract. It
worked for one store. A second store connected in the same running app never appeared in the
panel's instance list, even after confirming (by reading the plugin's actual runtime code) that
each store gets a unique `instanceId` and is registered correctly — a real limitation surfaced only
by testing two stores live, not by reading source. `rozenite-zustand-devtools` is purpose-built for
exactly this (an array of `{ name, store }` entries, no enhancer, no `redux` dependency at all) and
was confirmed live with both stores streaming correctly, each showing real state (down to a
genuinely offline `network` store mid-test). The hand-rolled bridge and the `redux`/
`@rozenite/redux-devtools-plugin` dependencies it needed were removed entirely rather than kept
alongside the replacement.

**Trade-off.** Three more devtools packages in the dependency tree (gated out of production), and
`useFavoritesStore`/`useNetworkStore` are now exported from their feature's `index.ts` purely for
this registration — feature code itself keeps using the narrower selector hooks
(`useIsFavorite`, `useNetworkStatus`, …), so the architecture's own rule (§1: subscribe with
selectors) isn't bent, just given one additional, clearly-commented reader.

---

## 13. Process

**One milestone = one step doc + one branch + one PR.** Each `docs/steps/NN-*.md` is written and
approved _before_ any code: goal, files, public APIs, the full test list, out-of-scope, risks, and
deviations from DESIGN.md. Conventional commits; CI runs lint + typecheck + tests on every PR.

**Every step ships its tests** — 338 tests across 64 suites, next to the code, covering success,
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

## 14. What I'd do next

1. **ETag conditional requests** — biggest win available; `304`s are free against the rate limit.
2. **`eslint-plugin-boundaries`** — make the architecture rules fail CI instead of relying on review.
3. **Persist the last searched org**, closing the gap in §8's offline story.
4. **Theme picker and deep linking** — both are small, and the groundwork for each is already in.
5. **MSW** for network tests with real headers, pagination and `304`s, then Detox/Maestro for the
   flows that mocked tests structurally cannot cover.
6. **Sentry** behind the existing `shared/logger` abstraction, with `DeviceNetwork`'s device info as
   context — the seam is already there.
