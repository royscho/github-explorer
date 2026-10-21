# AI log

One entry per milestone, written by `/gen-step` (step 7). Source for `AI_USAGE.md`.

## 00 — Design (2026-10-20)

- Model(s): Claude Opus 5.5 (Claude Code, plan mode)
- AI generated: `docs/DESIGN.md`, `CLAUDE.md`, `/gen-step` skill, `code-reviewer` agent, PR template.
- Decided by me: Zustand + React Query + MMKV, TurboModule, feature-based folders, `makeStyles`/`useStyles`, one details route (push, not modal), FlashList, scope of extras, one PR per step, Sonnet for implementation and Opus for review.
- Validation: design checked against every requirement in the assignment.

## 01 — Scaffold + tooling + CI (2026-10-20)

- Model(s): implementer Claude Sonnet 5 (Claude Code), reviewer code-reviewer (opus)
- AI generated: step plan (`docs/steps/01-scaffold-tooling-ci.md`), the RN CLI 0.88.0 scaffold (merged from `rnc-cli init` into the repo root), TS strict/ESLint/Prettier/Husky/lint-staged wiring, path aliases (`tsconfig.json` paths + `babel-plugin-module-resolver` + Jest `moduleNameMapper`), the `src/app`/`src/features/*`/`src/shared` folder skeleton, `App.tsx` placeholder + `App.test.tsx`, `shared/constants.ts` + its alias-resolution test, `.github/workflows/ci.yml`, merged `.gitignore`, and README setup/run/check instructions.
- Changed / rejected by me: approved the step plan as drafted; no changes beyond what came out of code review.
- Reviewer findings: fixed 2 should-fix + 6 nits — swapped deprecated `react-test-renderer` for `@testing-library/react-native` 14.x (DESIGN's declared test stack) and rewrote `App.test.tsx` to assert the rendered text via RNTL instead of only checking render doesn't throw; added ESLint `ignorePatterns` for `coverage/`/`vendor/`/`ios/`/`android/`; had `App.tsx`/`index.js` go through the `@shared`/`@app` aliases instead of relative imports; widened `lint-staged` globs; added `.nvmrc` + CI `node-version-file`; added CI `permissions`/`concurrency`; renamed the npm package from the reverse-DNS bundle id to `github-explorer`. 0 rejected.
- Validation: lint / typecheck / tests (2 tests, 100% coverage on the files that exist) all pass; manual check: `pod install` + `npx react-native run-ios` built and launched the app on an iPhone 17 simulator, screenshot confirmed "GitHub Explorer" renders. Android emulator not verified (no local Android SDK confirmed) — not required for this step's automated checks.
- Where AI was useful / risky: useful for merging the generated template into the existing repo correctly (gitignore, folder layout) and for catching the React 19 `react-test-renderer` deprecation during review, which I would likely have missed at scaffold time. Risky spot: the first-pass `App.test.tsx` only checked that rendering didn't throw — a weak test that review caught; also needed a manual fix for RNTL 14's `render()` being `async` (its `screen` singleton throws a somewhat opaque error if you query before awaiting it).

## 02 — API layer (2026-10-20)

- Model(s): implementer Claude Sonnet 5 (Claude Code), reviewer code-reviewer (opus)
- AI generated: step plan (`docs/steps/02-api-layer.md`), `shared/api/{errors,rateLimit,httpClient}.ts` (typed errors, `X-RateLimit-*` parsing, a `fetch` wrapper with hand-rolled timeout/caller-abort combining instead of `AbortSignal.any`), `shared/utils/linkHeader.ts` (`Link`-header parsing), `features/repos/{types,api/dto,api/mappers,api/endpoints,api/queryKeys}.ts`, and the matching test for every file (43 tests on the first pass, 52 after review fixes).
- Changed / rejected by me: approved the step plan as drafted, including its noted deviation from a literal reading of `Repo`/`RepoDetails` — clarified with the reviewer's first finding (see below) that domain dates stay ISO strings, not `Date` instances. Rejected one nit: RFC 8288 support for unquoted/multi-value `rel` in `parseLinkHeader` — GitHub's API only ever sends quoted, single-value `rel`, so the added complexity isn't justified.
- Reviewer findings: fixed 3 should-fix + 8 nits, rejected 1 nit (reason above).
  - Should-fix: `Repo.createdAt`/`updatedAt` were typed and mapped as `Date` instances, which don't survive the `JSON.stringify`/`parse` round-trip used by the favorites snapshot (§8) and the persisted query cache (§11) — changed to ISO strings, parsed to `Date` only at render time; clarified DESIGN §5.4's "`Date`-safe" wording to say so explicitly. `org`/`owner`/`repo` were interpolated into request paths unencoded, which both under-tests the real runtime behavior (RN 0.88's regex-based `URL` polyfill resolves `..` path segments differently than Node's `URL` used in Jest) and is an injection risk once the org input is user-typed (milestone 5) — added `encodeURIComponent` on each segment and switched `httpClient`'s URL building to plain string concatenation + `URLSearchParams` so it no longer depends on `URL`'s path-resolution semantics at all. `endpoints.test.ts` only asserted `signal: undefined`, never proving a real `AbortSignal` reaches `httpGet` — added tests passing a live `AbortController().signal` through both `fetchOrgRepos` and `fetchRepoDetails`.
  - Nits fixed: distinguish timeout-vs-caller-abort by `controller.signal.aborted` instead of error shape (more robust across fetch-polyfill/Hermes differences); narrowed `mapErrorResponse`'s return type; moved status-check out of the `fetch` `try/catch` for clarity; added a comment + test for the deliberate choice to treat a non-JSON 200 body as `NetworkError`; added a trust-boundary comment on the `as T` cast; `queryKeys.ts` now derives from `repoKeys.all` via spread and lowercases org/owner/repo so differently-cased names share one cache entry (with a test); restored `globalThis.fetch` in `afterAll`; added tests for a 403 with no rate-limit headers, abort-listener cleanup, and timeout cleanup after a successful response.
- Validation: lint / typecheck / tests (52 tests) all pass. No UI to manually check this step — pure API-layer logic, exercised entirely through mocked `fetch`/`httpGet`.
- Where AI was useful / risky: the review caught a real persistence bug (`Date` objects in data that gets JSON-serialized) before any store existed to expose it, and a path-encoding gap that unit tests alone wouldn't have surfaced since Jest's Node `URL` and RN's polyfill disagree on `..` handling. Risky spot: my first pass leaned on `new URL(path, BASE_URL)` for convenience without checking whether its dot-segment resolution matches the RN runtime — worth double-checking any future use of `URL`/`URLSearchParams` against the actual RN polyfill rather than Node's.

## 03 — Repo list (2026-10-20)

- Model(s): implementer Claude Sonnet 5 (Claude Code), reviewer code-reviewer (opus)
- AI generated: step plan (`docs/steps/03-repo-list.md`), `app/providers` (`QueryClient` factory with
  typed-error retry + `QueryCache` error logging, `AppProviders`), `app/navigation` (`RootStack`,
  `MainTabs`, `AppNavigationContainer` theming React Navigation + `StatusBar`), `shared/theme`
  (tokens, `ThemeProvider`, `makeStyles`), `shared/logger`, `shared/components` (`Screen`, `Text`,
  `ErrorView`, `EmptyView`, `LoadingView`, `ListFooterLoader`, `ErrorBoundary`, `ComingSoonScreen`),
  `shared/utils` (`formatRelativeTime`, `formatCompactNumber`), `features/repos` `useOrgRepos`,
  `RepoCard`/`RepoCardSkeleton`/`OrgSearchInput`, and `ExploreScreen` with every in-scope list state,
  plus the matching test for every file (146 tests after review fixes, up from 127 on the first pass).
- Changed / rejected by me: approved the step plan as drafted, including its explicit scope cuts
  (no `RepoDetails` route/press yet, placeholder Favorites/Settings tabs, system-only theme, no
  debounce/favorite-toggle this step — all deferred to the milestones that own them). Picked
  `@react-native-vector-icons/ionicons` for tab icons when asked (modular, TurboModule-based, fits
  the New Architecture setup) over the classic `react-native-vector-icons` package.
- Reviewer findings: fixed 1 blocker + 8 should-fix + 10 nits, rejected 0.
  - Blocker: a pagination or pull-to-refresh failure (e.g. hitting the 60 req/hour rate limit on
    page 3) replaced the _entire already-loaded list_ with a full-screen error, and its Retry called
    `refetch()` — which re-fetches every page from 1, burning more of the same rate limit it just
    hit. Fixed by only showing the full-screen error/loading view when `repos.length === 0`;
    `useOrgRepos` now also exposes `isFetchNextPageError`/`isRefetchError`, and a mid-list failure
    shows a compact footer message (with its own Retry calling `fetchNextPage`, not `refetch`)
    while the list stays visible.
  - Should-fix: resubmitting the same org after a rate limit was a no-op (state didn't change, so
    nothing re-ran) — `handleSubmit` now calls `refetch()` when the trimmed input matches the
    current org; the rate-limit `ErrorView` also allows Retry once `resetAt` has passed (checked at
    render, no live countdown — that's still §18 future work). `useOrgRepos`'s `error` was an
    unchecked `as GitHubApiError` cast that mistyped a non-GitHub error as one — added a
    `toGitHubApiError` helper that falls back to wrapping unknown errors in `ApiError`.
    `fetchNextPage`/`refetch` were new closures every render and `keyExtractor`/`renderItem` were
    inline arrows passed to `FlashList` — wrapped the hook's two functions in `useCallback` (keyed
    off the stable underlying React Query functions, not the whole `query` object, since that's a
    new reference every render too) and hoisted the list's render functions to module scope.
    `NavigationContainer` had no `theme` and there was no `StatusBar`, so dark mode didn't reach
    navigation chrome or the status bar icons (DESIGN §9) — added `AppNavigationContainer`, which
    maps the app theme onto React Navigation's `Theme` type and renders a themed `StatusBar`.
    `RepoCard`'s `accessible` + custom label meant VoiceOver/TalkBack only announced name + stats,
    dropping description/language/updated-time — the label now includes all of it. Failed queries
    were never logged anywhere (DESIGN §13: `shared/logger` is "the single place to plug in Sentry
    later") — added a `QueryCache.onError` that logs every failure except cancelled
    (`AbortError`) ones. `docs/DESIGN.md` §9 still said "a vector-icon package" after this step
    named one — updated it. The step doc's "Deviations: None" didn't record that only the app-level
    `ErrorBoundary` ships this step, not the per-screen one DESIGN §13 also describes — added it to
    Out of scope, deferred to milestone 4 (the first step with a second real screen).
  - Nits fixed: `formatCompactNumber` rounded values like `999_950` up into the wrong unit
    ("1000k" instead of "1m") — now bumps to the next unit when rounding overflows; added boundary
    tests. `formatRelativeTime` returned `"NaN years ago"` for an unparseable date — now returns
    `''`. Moved `MainTabs`'s inline `tabBarStyle` object into `makeStyles`. Dropped a hardcoded
    `marginBottom: 2` on `RepoCard` (redundant with its container's `gap`). Replaced the `⑂` fork
    glyph (missing from many Android system fonts) with the word "forks". Added the negative
    pagination cases `onEndReached` needs (no `hasNextPage`, already fetching) and an org-trimming
    assertion to `ExploreScreen.test.tsx`. Strengthened a weak `toHaveBeenCalled()` in
    `OrgSearchInput.test.tsx` to assert the typed character, and `expect.anything()` to
    `expect.any(AbortSignal)` in `useOrgRepos.test.tsx`. Gated `logger.warn`/`.info` on `__DEV__`
    (kept `.error` unconditional, per DESIGN §13). Fixed two test-filename typos in the step doc.
- Validation: lint / typecheck / tests (146 tests) all pass. Manual check: built and ran the app on
  an iPhone 17 simulator (`react-native run-ios`) twice — once before and once after the review
  fixes — and screenshotted both; confirmed the Explore screen, its empty state, and all three tab
  icons render. Found and fixed a real bug this way that nothing in the test suite could have
  caught: the tab bar icons rendered as "?" tofu glyphs because
  `@react-native-vector-icons/ionicons`'s font isn't auto-registered with iOS — added a
  `UIAppFonts` entry to `Info.plist`. Also visually caught (from a user-provided screenshot) a
  blank gray gap between the repo list and the tab bar, caused by `Screen`'s `SafeAreaView`
  reserving a bottom safe-area inset that the bottom-tab navigator was already reserving — fixed by
  excluding the `bottom` edge by default (overridable per-screen for the day a screen sits directly
  above the device's bottom edge with no tab bar under it). Android wasn't verified on a
  device/emulator this step.
- Where AI was useful / risky: the review caught a genuinely dangerous interaction between two
  pieces of this step that looked independently fine — the error-replaces-list UI and
  `refetch()`'s "re-fetch every page" semantics — which is exactly the kind of cross-cutting bug
  that's easy to miss when building one state at a time. Risky spot: several RNTL/Jest
  infrastructure gotchas (documented in the step doc's "Follow-ups") cost real time and would have
  silently produced misleadingly-green tests if not tracked down — in particular, `render`/
  `renderHook` being `async` in this `@testing-library/react-native` version fails _silently_
  (no throw, just an unbound `screen`), and a `jest.config.js` `setupFiles` override replacing
  rather than extending `@react-native/jest-preset`'s own setup is a sharp edge worth remembering
  for every future step that touches Jest config.

## 04 — Repo details (2026-10-20)

- Model(s): implementer Claude Sonnet 5 (Claude Code), reviewer code-reviewer (opus)
- AI generated: step plan (`docs/steps/04-repo-details.md`), `RepoDetailsScreen` + its own
  `getErrorMessage` utils, `useRepoDetails` (cache-scanned placeholder data) and
  `usePrefetchRepoDetails` hooks, `RepoStats` and `RepoDetailsSkeleton` components, `RepoCard`
  made pressable (`onPress`/`onPressIn`), `ScreenErrorBoundary` (the per-screen boundary deferred
  from milestone 3), the `RepoDetails` route on `RootStack` with a header titled from the route
  param, `repoKeys.lists()` added to the query-key factory, `formatDate`/`formatResetTime` moved
  into `shared/utils`, plus the matching test for every file (200 tests after review fixes, up
  from 191 on the first pass).
- Changed / rejected by me: approved the step plan as drafted (deep linking re-deferred a third
  time with that flagged explicitly as a risk rather than silently dropped; favorite toggle and
  the offline banner left to their owning milestones, per the plan).
- Reviewer findings: fixed 9, rejected 0; the review (full report in the step doc's Follow-ups)
  found six real correctness/consistency bugs, all fixed before commit:
  - `watchers` was silently duplicating `stars` — GitHub's `watchers_count` always equals
    `stargazers_count`; the real figure, `subscribers_count`, is only reliable on the single-repo
    endpoint. Moved `watchers` off the base `Repo` entirely, onto `RepoDetails`, sourced from
    `subscribers_count`.
  - A failed pull-to-refresh was replacing already-loaded repo details with a full-screen error,
    because React Query keeps the last successful `data` across a failed background refetch while
    still flipping `status` to `'error'` — the screen's check didn't account for that. Fixed to
    match `ExploreScreen`'s existing "don't throw away data already paid for" pattern.
  - The pull-to-refresh spinner was showing during the very first, placeholder-backed load, because
    `placeholderData` makes React Query report `status: 'success'` (not `'pending'`) while the real
    fetch is still in flight — `isRefetching` is derived from that and was `true` the whole time.
  - `RepoCard`'s new `onPress`/`onPressIn` props were unstable (a fresh closure per cell per
    render), defeating `RepoCard`'s own `memo`; changed the props to take the repo as an argument so
    one stable function can be shared across every cell.
  - `Linking.openURL`'s rejection was an unhandled promise; now logged through `shared/logger`.
  - A hand-built `[...repoKeys.all, 'list']` prefix (bypassing the query-key factory, against
    CLAUDE.md) became `repoKeys.lists()`, a new factory entry, with a defensive shape guard added
    at the one call site that scans it.
  - Smaller fixes: per-stat `accessibilityLabel`s on `RepoStats` (promised in the step's own test
    list but missing), a hidden-from-accessibility assertion on `RepoDetailsSkeleton`, a real
    `QueryErrorResetBoundary`-reset test on `ScreenErrorBoundary`, a loading-skeleton presence
    assertion, and import-order/doc-wording nits.
- Validation: lint / typecheck / tests (200 tests) all pass. **No manual device/simulator run this
  step** — unlike milestone 3, which caught a real font-registration bug by screenshotting the iOS
  simulator, this step's checks are lint/typecheck/tests only; the new screen, the placeholder→real
  data transition, and the native-stack header title have not been visually confirmed on a
  simulator or device.
- Where AI was useful / risky: the `watchers`/`subscribers_count` bug is the standout — a data
  correctness bug inherited from milestone 2's mapper, invisible until this milestone's UI actually
  surfaced the field, and not the kind of thing a type system or a naive test (which would just
  assert the mapper against its own made-up fixture numbers) catches on its own; it took reviewer
  knowledge of a real GitHub API quirk to flag it. Risky spot: the placeholder-data status
  semantics (`'success'` + `isPlaceholderData: true`, not `'pending'`) are easy to get wrong by
  intuition, and did get wrong on the first pass in two different places (the error-precedence
  check and the refresh-spinner) — worth remembering for any future `placeholderData` use in this
  codebase.

## 05 — Search & filter (2026-10-20)

- Model(s): implementer Claude Sonnet 5 (Claude Code), reviewer code-reviewer (opus)
- AI generated: step plan (`docs/steps/05-search-filter.md`), the generic `useDebounce<T>` hook
  (`shared/hooks`), a `'danger'` color option on the shared `Text` component, `NameFilterInput` +
  its styles hook, `filterReposByName` (`ExploreScreen.utils.ts`), and `ExploreScreen`'s org-search
  submit handling / client-side name filter wiring (DESIGN §7), plus every test for all of it.
- Changed / rejected by me: mid-step, after the initial implementation and review pass were both
  done (debounced ~500 ms auto-search in addition to the Search button, matching the DESIGN text
  as originally written), I changed the requirement in two rounds: first, that the org query
  should fire **only** on an explicit Search-button press or keyboard submit, never while typing
  — which removed the auto-search debounce effect (and the `useDebounce` call driving it) entirely
  from `ExploreScreen`; then, that a too-short submission should require 2 characters (not the 1 I
  first gave as the minimum) and show a visible "Enter at least 2 characters" message rather than
  silently no-op. `docs/DESIGN.md` §7 was updated in the same PR to match both changes, per
  `CLAUDE.md`'s rule to update the doc alongside any deviation. The name-filter half of §7 was
  unaffected throughout.
- Reviewer findings (from the review pass against the original, debounced-auto-search version):
  fixed 10, documented-not-fixed 1, rejected 0.
  - Fixed: `showNameFilter` was gated on `status === 'success'`, which hid (and orphaned) the
    filter during a page/refresh error even though filtering kept applying to the still-visible
    list — changed to `repos.length > 0`. The name filter wasn't reset when a new org was
    submitted, so a filter typed against one org could silently hide repos in the next org's
    results — added a reset effect keyed on `org`. The "no matches" state replaced the whole
    `FlashList` with a bare `EmptyView`, losing pull-to-refresh and the pagination footer — switched
    to `FlashList`'s `ListEmptyComponent`. Also fixed: a weak `useDebounce` unmount test that would
    have passed even without real cleanup, a duplicate-id trap in a test fixture,
    `NameFilterInput`'s `returnKeyType="search"` implying a submit action it doesn't have, and a
    weak keystroke-count assertion in `NameFilterInput.test.tsx`. (The reviewer's regression test
    for a debounce-effect snap-back bug, and two other test cases it flagged as promised-but-
    missing, were superseded by the mid-step behavior change — see below.)
  - Documented, not fixed: a narrow filter can make `FlashList` fire `onEndReached` on layout alone
    (independent of scrolling), auto-paginating through an org while idle. Pre-existing risk (an
    unfiltered short first page has the same property), not introduced by this step, and a proper
    fix means distinguishing layout- from scroll-triggered `onEndReached` — out of scope here;
    recorded as a known trade-off in the step doc's Follow-ups.
- Validation: lint / typecheck / tests (225 tests) all pass. No manual device/simulator run this
  step (text-input/submit behavior only; no new visual surface beyond the existing input style and
  one new inline validation message).
- Where AI was useful / risky: caught, by itself, during the first implementation (before the
  review pass, and before the requirement changed) that an org-search debounce effect must depend
  only on the debounced value, not on `org` too — depending on both made it re-run right after
  `handleSubmit`'s immediate `setOrg` and snap `org` back to the still-stale debounced value
  (surfaced as two existing tests failing, not a new one — a useful reminder that a regression can
  hide behind unrelated-looking test names). That whole mechanism was later removed once the
  requirement changed to explicit-trigger-only, so the bug no longer applies to the shipped code —
  but the general lesson is worth keeping for next time: any "debounce a value, but let an explicit
  action bypass the wait" pattern needs the debounce effect to react only to the debounced value
  itself, never to state the explicit action also writes. Separately, a plain (non-`.changeText`/
  `.press`) RNTL `fireEvent(...)` call returns a `Promise` that must be awaited before asserting on
  a re-render — an unawaited keyboard-submit `fireEvent` produced a flaky-looking assertion
  failure (read a stale pre-submit render) until awaited.

### Follow-up: clear buttons (same day, same branch)

- AI generated, by request, after the milestone-5 commit above: a clear ("×") button on both
  `OrgSearchInput` and `NameFilterInput` — an absolutely-positioned `Pressable`
  (`Ionicons` `close-circle`) shown only while the field has text, clearing it on press. Used a
  custom cross-platform button rather than RN's `clearButtonMode`, which is iOS-only. Covered by
  new tests (hidden when empty, shown + clears on press, for both components).
- Also explored, then explicitly reverted by the user: moving the global `QueryCache.onError`
  handler in `queryClient.ts` to log a 404 (`NotFoundError`) as `logger.warn` instead of
  `logger.error`, since an org/repo 404 is a user-correctable "not found", not an app bug. The
  user judged the fix's _location_ wrong (a global, per-query-type special case there also
  silently downgrades 404s from unrelated queries, like `useRepoDetails`, where a 404 carries
  different meaning) and asked to revert; both files were restored via `git restore` before
  anything was committed. Recommended alternative, not yet implemented: tag the specific query
  with React Query `meta` (e.g. `meta: { expectedNotFound: true }`) and have the global handler
  read that flag, keeping the handler generic while letting each feature opt in to softer logging
  for the 404s it actually expects.
- Validation: lint / typecheck / tests (229 tests) all pass.

## 06 — Favorites (2026-10-20)

- Model(s): implementer Sonnet 5, reviewer code-reviewer (opus).
- AI generated: the `favoritesStore` (Zustand + MMKV `persist`, snapshotted to `Repo`-only fields),
  `shared/storage`'s MMKV instance + Zustand storage adapter, `FavoriteButton`/`FavoriteToggle`,
  `FavoritesScreen`, the `renderFavoriteToggle` slot threaded through `RepoCard`/`ExploreScreen`/
  `RepoDetailsScreen`, the `app/navigation` wiring that connects them, and all new/changed tests.
  Also ran `cd ios && pod install` for the new native dependency and committed `Podfile.lock`.
- Changed / rejected by me: nothing by hand outside this session — all changes were authored and
  reviewed here.
- Reviewer findings: fixed 12, rejected/deferred 3.
  - Fixed: the favorite toggle's scope was wrong (Details-only, reasoned from §6.3's content
    bullets) — §8/§12/§14 all assume a per-card toggle, confirmed with the user and widened to
    `RepoCard` (used by both Explore and Favorites); the resulting `features/repos`↔`features/favorites`
    require cycle that a naive "card needs favorites" fix would have caused, via the
    `renderFavoriteToggle` slot-prop + `app/navigation` wiring pattern; `toggleFavorite` persisting a
    full `RepoDetails` (including fake placeholder values) instead of a `Repo`-shaped snapshot; no
    test actually exercised MMKV persistence/rehydration; no prefetch-on-press-in from the
    Favorites tab (Explore already had it); the iOS Podfile.lock not reflecting the new native
    dependency; a redundant hand-written `react-native-mmkv` jest mock duplicating the library's
    own built-in test-mode mock; a vacuous "starts empty" store test that couldn't fail;
    `useFavoritesList`'s test list missing a removal case; a few lines Prettier wanted reformatted.
  - Rejected: a shared `Icon` component wrapping `Ionicons` (MainTabs already uses `Ionicons`
    directly today — not a regression introduced here, and out of scope to build now);
    deduplicating the 3-line `keyExtractor` shared by Explore/Favorites (not worth an abstraction
    per CLAUDE.md's "three similar lines beat a premature abstraction").
  - Deferred (documented, not fixed): opening a favorited repo's Details while offline still hits
    the network and fails — fixing it needs `useRepoDetails` to accept the favorites snapshot as a
    placeholder-data source, the same cross-feature-awareness problem the `renderFavoriteToggle`
    slot was built to avoid, and full offline support is milestone 8's explicit scope. Recorded in
    the step doc's Risks.
- Validation: lint / typecheck / tests (263 tests) all pass. `pod install` completed cleanly
  (90 pods installed).
- Where AI was useful / risky: the review caught a real misread of DESIGN that a careful first
  read still missed — §6.3's content-bullet listing of "favorite toggle" under Details read as a
  placement spec, when §8/§12/§14 (read earlier in the same pass) already described a per-card
  toggle and just weren't cross-referenced against it. Useful demonstration that a second pass
  genuinely catches things the first one feels confident about. Risky/notable: the fix for that
  one wrong assumption cascaded into a real architecture decision (a render-prop slot pattern
  threaded through four files) rather than a one-line change — worth watching for whenever a
  scope correction surfaces mid-step, since the blast radius of "where does this prop come from"
  can be larger than the original mistake.

### Follow-up: restart-persistence investigation + immer (same day, same branch)

- The user ran the app and reported "Favorites should persist after app restart," alongside a
  screenshot of a live `[zustand persist middleware] Unable to update item 'favorites-storage', the
given storage is currently unavailable.` warning from React Native DevTools.
- AI generated: launched the app on an iOS simulator (`npx react-native run-ios`), read zustand's
  actual `persist`/`createJSONStorage` source to find exactly when that warning fires, then
  connected directly to the running app's Hermes runtime over Metro's CDP inspector
  (`ws://localhost:8081/inspector/...`) to probe `globalThis.nativeModuleProxy['MmkvCxx']` against a
  known-working native module as a control. Root cause: a stale native build (two leftover Xcode
  `DerivedData` folders) — the simulator instance connected to Metro was running a binary compiled
  before `react-native-mmkv` was linked, so the native half of MMKV genuinely wasn't registered; JS
  hot-reloads independently of the native binary, so newer JS calling into MMKV ran against older,
  unlinked native code. Fixed by uninstalling the app from every simulator, clearing both stale
  `DerivedData` folders, and doing a clean rebuild; re-probed `MmkvCxx` to confirm it now resolves.
  Then, rather than trust that and stop, wrote a probe value through the real native `MmkvCxx`
  module directly (bypassing the JS wrapper entirely, same CDP connection), did a genuine
  `xcrun simctl terminate` + `simctl launch` (an actual process kill), and read the value back
  successfully — direct, non-mocked proof of the exact mechanism "survives restart" depends on, on
  the corrected build. Full writeup in `docs/steps/06-favorites.md`'s new "Verified: restart
  persistence" section.
- Also by explicit user request: refactored `favoritesStore.ts`'s `toggleFavorite` to use zustand's
  `immer` middleware (`persist(immer(creator), persistOptions)`) instead of manual object
  spread/`delete` for the add/remove branches. Needed adding `immer` to
  `jest.config.js`'s `transformIgnorePatterns` — its `"react-native"` package-export condition
  points at an ESM build Jest can't parse by default, the same situation `zustand` itself required
  an allowlist entry for.
- Changed / rejected by me: nothing by hand — diagnosis, fix and refactor all done in-session.
- Validation: lint / typecheck / tests (263 tests, unchanged pass count — the immer refactor kept
  the same external store API) all pass. Verified live on an iOS simulator: native module linkage
  confirmed via CDP probe, and a real MMKV write survived a genuine process kill/relaunch.
- Where AI was useful / risky: this is the clearest example yet in this project of a bug that
  unit tests structurally cannot catch — every test in this codebase mocks MMKV (either the
  project's own now-removed hand mock, or `react-native-mmkv`'s built-in `JEST_WORKER_ID`-detected
  mock), so "does this actually survive a cold process restart on a real native binary" was
  never exercised by `npm test`. Going straight to a live device/simulator and a CDP-level probe,
  rather than re-reading the (already-correct) JS source for a bug that wasn't there, was the
  right call — the bug was in build state, not code, and no amount of staring at
  `favoritesStore.ts` would have found that. Risky/notable: this required fairly deep, somewhat
  fragile tooling (manually driving Metro's CDP inspector protocol with a raw WebSocket, guessing
  at `globalThis.nativeModuleProxy` as the bridgeless-mode native-module access point) that isn't
  something this project has any standing skill or script for — worth capturing as a reusable
  debugging technique if a similar "is the native side actually linked" question comes up again in
  milestone 7's own custom native module.

## 07 — Native module `DeviceNetwork` (2026-10-21)

- Model(s): implementer Claude Sonnet 5 (Claude Code), reviewer code-reviewer (opus)
- AI generated: Codegen spec (`specs/NativeDeviceNetwork.ts`), Kotlin (`DeviceNetworkModule`/
  `DeviceNetworkPackage`) and Swift+ObjC++ (`DeviceNetwork.swift`/`.h`/`.mm`) implementations, the
  typed JS wrapper (`features/device/native`), `networkStore` (Zustand, unpersisted — it's live
  device state, not something to restore stale), `useNetworkStatus`/`useDeviceInfo`/
  `useDeviceNetworkMonitoring`, `OfflineBanner`/`DeviceInfoSection`, the real `SettingsScreen`
  (replacing the placeholder `ComingSoonScreen`), and the matching test for every file (292 tests
  after review fixes).
- Changed / rejected by me: approved the step plan as drafted, including the `OfflineBanner` copy
  simplification (no "showing data from HH:MM" timestamp until milestone 8's cache persistence
  exists) and deferring the `system | light | dark` theme-mode picker gap to whichever future step
  claims it.
- Reviewer findings: fixed 8, rejected 0.
  - Android's `isConnected` was gated on `NET_CAPABILITY_VALIDATED`, which flashes "offline" for a
    moment on every network switch because validation happens asynchronously after the switch —
    changed to `NET_CAPABILITY_INTERNET`, which matches iOS's `.satisfied` more closely and avoids
    the flash.
  - `DeviceNetworkModule`'s `networkCallback` field had no concurrency guard between the method-
    invocation thread (`start`/`stopNetworkMonitoring`) and `invalidate()`'s teardown thread — made
    `@Volatile`.
  - `useDeviceNetworkMonitoring` seeded state from one `getNetworkState()` call issued before
    `startNetworkMonitoring()` had resolved — on iOS this reads an unstarted monitor's default
    (unsatisfied) path — and the seed could land after and clobber a newer live event. Fixed to
    subscribe before starting, start, then seed only if no event has landed yet.
  - `OfflineBanner` had no top safe-area inset, so it rendered under the status bar/notch/Dynamic
    Island on header-less tab screens, and no `accessibilityLiveRegion`, so a screen reader
    wouldn't announce it appearing — added both.
  - `DeviceInfoSection` showed the raw `connectionType` union value (e.g. `"wifi"`) instead of a
    human-readable label, and its `InfoRow` had no accessible grouping of label + value — added a
    `connectionTypeLabels` map and `accessible`/`accessibilityLabel` on each row.
  - `useDeviceInfo` and `useDeviceNetworkMonitoring` swallowed native-call failures silently —
    added `shared/logger` calls on every rejection path, with tests asserting them.
  - `ComingSoonScreen` and its styles hook became dead code once `SettingsScreen` shipped — deleted,
    along with their tests and barrel exports.
  - The step doc's Public APIs section listed `useDeviceNetworkMonitoring` as feature-internal even
    though `AppProviders` is a caller outside the feature — moved it to the exported list per
    §3.2's import-through-`index.ts` rule.
- Found and fixed by me, after the reviewer pass, before committing: the reviewer's own new test
  (`useDeviceNetworkMonitoring.test.tsx`'s "stops monitoring and unsubscribes on unmount") called
  RNTL's `unmount()` without `await` — `unmount` is `async` in this `@testing-library/react-native`
  version (it wraps `act()` internally), the same unawaited-render gotcha milestone 3 already hit,
  now surfacing on `unmount` instead of `render`/`renderHook`. The assertions ran before cleanup had
  actually fired, failing that test directly, and the dangling unmount then resolved mid-flight
  during the next test, breaking two more (`logs and does not throw when startNetworkMonitoring
rejects` / `…when the seed getNetworkState rejects`) by interleaving with their own `act()` calls.
  Confirmed by running the file in isolation (deterministic across reruns) and each later test alone
  (each passed alone, failed only after the broken test ran first). Fixed by awaiting every
  `unmount()` call in the file.
- Validation: lint / typecheck / tests (292 tests) all pass. No manual Android/iOS on-device check
  this review-fix pass — the implementation pass's own manual check (documented in the step doc's
  Follow-ups: both platforms, screenshots, a real selector-crash fix) predates the
  `NET_CAPABILITY_INTERNET`/`@Volatile` native changes above, so those two are unverified on a real
  device/emulator as of this entry.
- Where AI was useful / risky: the unawaited-`unmount()` bug is the same class of RNTL async-helper
  gotcha as milestone 3's unawaited `render`/`renderHook` — worth generalizing the lesson to _every_
  async helper this library exposes (`render`, `renderHook`, `rerender`, `unmount`), not just the
  two already burned. Risky spot: the two native-code review fixes
  (`NET_CAPABILITY_INTERNET`, `@Volatile`) are exactly the kind of change Jest's mocked native
  module can't exercise at all — they compile and typecheck but have had no real connectivity-switch
  or teardown-race test on a device since being written; worth a manual check before relying on
  them being correct in practice.

## 08 — Offline (2026-10-21)

- Model(s): implementer Claude Sonnet 5 (Claude Code), reviewer code-reviewer (opus)
- AI generated: step plan (`docs/steps/08-offline.md`), `shared/storage/queryPersister.ts`
  (`createAsyncStoragePersister` over a direct MMKV adapter, `queryPersistOptions`),
  `shared/storage/lastSynced.ts`, `shared/utils/formatTime.ts`, `features/device/hooks/
useOfflineMessage.ts`, the `QueryCache.onSuccess → recordSync()` wiring in `app/providers/
queryClient.ts`, swapping `AppProviders`' `QueryClientProvider` for `PersistQueryClientProvider`,
  `OfflineBanner`'s "showing data from HH:MM" copy, and the matching test for every file (312 tests
  after review fixes, up from 304 on the first pass).
- Changed / rejected by me: approved the step plan as drafted; asked for two new dependencies
  (`@tanstack/query-sync-storage-persister`/`@tanstack/react-query-persist-client`, not literally
  named in `docs/DESIGN.md` but implementing exactly the `persistQueryClient` mechanism §11
  describes) before installing them, per `CLAUDE.md`. Mid-step, switched the sync persister for the
  non-deprecated async one (see Reviewer findings) without a separate approval round — a same-intent
  implementation substitution, not new scope.
- Reviewer findings: fixed 8, nits fixed 4, rejected 0.
  - **The dehydration filter (`shouldDehydrateQuery: status === 'success'`) would silently drop
    already-cached data the moment a later background refetch failed** (e.g. a rate limit, which
    §13 already says not to retry) — directly contradicting §11's actual goal of keeping the last
    successful data visible while offline, since every save dehydrates and overwrites the whole
    cache. Changed the filter to "has ever loaded data" (`query.state.data !== undefined`), with a
    regression test for a query that succeeded once and then failed a refetch.
  - The "showing data from HH:MM" timestamp had no upper bound, so it could show a specific time for
    data that no longer exists (after the persisted cache aged past its own 24h `maxAge`, or was
    busted by an app-version bump) — gated the banner's message to the same `QUERY_CACHE_MAX_AGE`,
    falling back to the plain "You're offline" once the last sync is older than that.
  - `OfflineBanner` read `getLastSyncedAt()` directly, breaking `CLAUDE.md`'s
    `components → hooks → store/shared` rule — moved that logic into a new `useOfflineMessage()`
    hook in `features/device/hooks`, which the component just renders.
  - Added a direct dependency on `@tanstack/query-persist-client-core` purely for a type that
    `@tanstack/react-query-persist-client` already re-exports — removed it.
  - Missing restore-failure-path tests: a persisted client saved under a different `buster`, and
    one older than `maxAge`, should both fail to restore — §11's actual requirements, not just the
    happy path. Added both to `AppProviders.test.tsx`.
  - Several tests (`lastSynced`, `OfflineBanner`, `AppProviders`) silently depended on run order
    because the in-memory MMKV mock isn't reset between tests in the same file — added
    `beforeEach(() => mmkv.clearAll())` to each.
  - `docs/ai-log.md` wasn't updated yet at review time — this entry.
  - Nits fixed: a cast-based fake `Query` in `queryPersister.test.ts` replaced with a real one built
    through `QueryClient.fetchQuery`; `formatTime`/`formatResetTime` duplicated the same
    `Intl.DateTimeFormat` call — `formatResetTime` now delegates to `formatTime`; the storage
    adapter in `queryPersister.ts` was built by re-wrapping `zustandMmkvStorage` (a type mismatch
    workaround) instead of the plain `mmkv` instance directly — simplified; the step doc's wording
    overstated the persistence restore as happening "before screens mount" (`PersistQueryClientProvider`
    actually gates `useQuery`/`useInfiniteQuery` via `isRestoring`, not mounting itself) — corrected.
  - Flagged but not changed, documented instead: §11's "last viewed list … renders immediately"
    isn't fully achieved — `ExploreScreen`'s `org`/`nameFilter` stay local `useState`, so a cold
    restart still opens on the empty search state even though a resubmitted org's data is sitting
    restored in cache. Persisting "last searched org" is real new scope (same call step 07 made for
    the theme-picker gap), not folded in here uninvited; recorded in the step doc's Risks/Out of
    scope instead. Also documented: the global (not per-query) last-synced timestamp can show a
    technically-correct-but-misleading time when two different orgs/repos were viewed at different
    times; and a request already in flight at the moment of going offline can resolve a tick after
    the banner's one-time read, lagging by one successful fetch until the next re-render.
- Found and fixed by the user, manually, after the review pass: ran the app on an iPhone 18 Pro
  simulator (`npx react-native run-ios`) and found that searching an org with nothing cached yet,
  while offline, hung on the loading skeleton forever instead of showing anything — a real bug the
  mocked-hook screen tests couldn't have caught, since none of them drove a query through React
  Query's actual pause/resume state machine. Root cause: React Query _pauses_ (not fails) a fetch
  while offline, which `ExploreScreen`/`RepoDetailsScreen` never distinguished from "still fetching"
  in their `status === 'pending'` check. Fixed by adding `isPaused` to `useOrgRepos`/
  `useRepoDetails` and a new offline branch in both screens' `renderContent()`, with new tests in
  `useOrgRepos.test.ts`, `useRepoDetails.test.tsx`, `ExploreScreen.test.tsx`, and
  `RepoDetailsScreen.test.tsx` (316 tests after this fix, up from 312). Full writeup in the step
  doc's new "Follow-ups" section. Separately during the same manual session: confirmed
  `NWPathMonitor` sometimes doesn't re-fire its "back online" event in the iOS Simulator specifically
  (reloading the app — which re-seeds state the same way a cold launch does — immediately showed
  "online" correctly) — a Simulator-only quirk, not a code bug, and not something app code can fix;
  noted as a testing-methodology caveat rather than changed.
- Validation: lint / typecheck / tests (316 tests, up from 304 before any fixes) all pass. Manual
  check: built and ran the app on an iPhone 18 Pro simulator; confirmed the offline banner, the
  fixed stuck-search state, and (after reload) the reconnect behavior, all as described above.
- Where AI was useful / risky: the dehydration-filter bug is the most consequential _automated_
  finding of this review — a plausible-looking, DESIGN-quoting one-line filter
  (`status === 'success'`) that would have quietly broken the exact "keep working with the last
  successful data while offline" behavior the product owner asked for by name, and nothing in the
  first-pass test suite caught it because every test used queries that only ever succeeded or only
  ever failed, never both in sequence. The stuck-loading bug the user found manually afterward is
  the more important lesson of the two, though: it's a second instance of the same root cause as
  milestone 06's MMKV-persistence bug (`docs/ai-log.md` #06) — a behavior that depends on a real
  state machine (there, native module linkage; here, React Query's online/offline pause) that every
  mocked-hook test in the suite sidesteps by construction, so a passing test suite said nothing
  about it either way. Worth treating "does this path actually traverse the real pause/offline
  machinery, or just assert against a hand-set mock value" as a standing question for any future
  offline/network-dependent step, not just a one-off catch. Risky spot, unrelated: picking the async
  persister over the (more literally MMKV-shaped) sync one was a judgment call made mid-implementation
  from reading the sync persister's own deprecation notice, not from the step plan — correct in
  hindsight, but worth being more explicit about this kind of substitution before writing code next
  time, rather than resolving it silently and only documenting it afterward.

## 09 — UI polish (2026-10-21)

- Model(s): implementer Claude Sonnet 5 (Claude Code), reviewer code-reviewer (opus)
- AI generated: step plan (`docs/steps/09-ui-polish.md`), a new `elevation` theme token
  (`shared/theme/tokens.ts`) and shared `Card` component (`shared/components/Card.tsx` +
  `shared/hooks/useCardStyles.ts`) for the elevated-surface look, `RepoCard`/`RepoCardSkeleton`
  switched from a bordered box to `Card`, a themed language pill, `RepoStats` switched from an
  emoji/text-suffix layout to `Ionicons` glyphs, and `DeviceInfoSection` regrouped into two `Card`s
  ("Device", "Network") with `accessibilityRole="header"` titles — plus the matching test updates
  (`Card.test.tsx` new; `RepoCard.test.tsx`, `RepoStats.test.tsx`, `RepoDetailsScreen.test.tsx`,
  `DeviceInfoSection.test.tsx` updated for the new visible text/structure).
- Changed / rejected by me: mid-step, swapped milestone 9/10 in `docs/DESIGN.md` (UI polish before
  Docs, not after) — a planning decision, not a code review outcome.
- Reviewer findings: fixed 6 (DESIGN.md §3.2/§9 left undocumented after adding `Card`/`elevation`;
  the grouping test only checked both headers existed, not which rows sat in which card; stat star
  icon reused the same filled-`star` glyph as the favorite toggle, risking visual confusion; repeated
  `size={14}` on every stat icon; `Card.test.tsx` hard-coded `borderRadius: 8` instead of referencing
  the theme token; "Network" card had a redundant "Network" row label under the "Network" title),
  rejected 0.
- After the review pass, the user shared two "before/after" mockup images and asked for "a little
  coloring like in the images." Added: `shared/utils/hexToAlpha.ts` (hex+alpha → `rgba()` helper,
  +test), a bounded ~15-language color map (`features/repos/constants.ts`, +test) for the language
  pill's dot/tint, tinted circular icon badges on each Settings card header (accent for Device,
  success for Network), and a `tone?: 'success' | 'neutral'` option on `DeviceInfoSection`'s
  `InfoRow` that renders "Status"/"Low power mode" as a small dot + tinted pill. Flagged to the user
  before implementing: the per-language color map is a deliberate, scoped exception to CLAUDE.md's
  "no hard-coded colors" rule (a data-driven indicator, the same convention GitHub itself uses, not
  a theme color hardcoded in a component) — user confirmed, chose the per-language map over a
  single-accent-color alternative. New tests: `hexToAlpha.test.ts`, `constants.test.ts`, plus cases
  in `RepoCard.test.tsx` (mapped vs. unmapped language dot color) and `DeviceInfoSection.test.tsx`
  (status pill tone follows online state).
- Validation: lint / typecheck / tests (330 tests, up from 319 before this step) all pass. No manual
  device/simulator run performed in this session — automated checks only.
- Where AI was useful / risky: the review's "Network" card having both a "Network" title and a
  "Network" row label (so the row's own accessibility label and the card's header said the same
  word twice) was a small but real redundancy a first pass missed; renaming the row to "Status" also
  happened to match the user's own mockup exactly, a useful cross-check. Risky spot: the coloring
  pass introduces per-instance inline `style={[...]}` arrays computed from runtime data (language,
  online state) rather than pure `makeStyles` theme functions, which the project's styling rule reads
  as close to "no inline style objects" — justified here by existing precedent (`OfflineBanner`'s
  dynamic `paddingTop`) and the fact that these values are genuinely data-dependent, not static
  design tokens, but worth re-confirming this reading holds if a future step wants to add more
  data-driven coloring.

## 10 — Docs (2026-10-21)

- Model(s): implementer Claude Opus 5 (Claude Code); **no reviewer agent this step** — see below.
- AI generated: step plan (`docs/steps/10-docs.md`), `README.md` (expanded from a 28-line stub to a
  full reviewer-facing readme: features, rate-limit caveat, setup/run/checks, architecture-at-a-glance
  with the three-state-tools table and folder tree, the `DeviceNetwork` summary, testing notes, and an
  explicit "Scope" section for what deliberately isn't built), `DECISIONS.md` (new — 11 sections of
  decision/why/trade-off, with every mid-build change marked **↻ changed mid-build** and traceable to
  a step doc), `AI_USAGE.md` (new — workflow, a per-milestone scale table, "where AI was valuable" vs
  "where AI was risky/wrong/not enough", and a closing "what I'd tell someone doing this"), plus the
  `docs/DESIGN.md` §18 i18n/RTL entry and the §3.2/§6.1/§9 accuracy fixes described below.
- Changed / rejected by me: approved the step plan, then added one scope item during the gate — record
  **planned i18n via `i18next` + `react-i18next` with RTL support** as future work. Also ruled, when
  asked, that the theme picker and deep linking are **not in scope** and are described in DESIGN.md
  deliberately, to show they'd been considered rather than overlooked — so they're written up as
  conscious scope cuts (with the groundwork each already has) rather than as gaps or TODOs. After the
  first commit, asked for **`.env` configuration** to be recorded as future work too, referring to it
  as something already mentioned — it wasn't (grep confirmed no `.env`/`dotenv`/token mention anywhere
  in the new docs; the repo's only "env" is RN's own `.xcode.env.local` in `.gitignore`), so I said so
  rather than agreeing, then added it: §18 plus the `README.md`/`DECISIONS.md` scope entries, grounded
  in the fact that `BASE_URL`/`TIMEOUT_MS` are module constants in `shared/api/httpClient.ts` and the
  app holds no secrets at all today. Included the caveat that bounds the whole idea — a bundled token
  is extractable from the IPA/APK, so `.env` is build-time config, not a secret store, and raising the
  rate limit for real users ends at OAuth or a backend proxy.
- Found while writing (no reviewer agent, so these came out of cross-checking the docs against the
  code):
  - **`docs/DESIGN.md` described two things in the present tense that don't exist.** §9/§3.2 said the
    theme mode choice "is saved in `settingsStore` and survives restart" and listed a settings store;
    there is no `settingsStore` at all and `SettingsScreen` renders only `DeviceInfoSection` (the gap
    #07 deferred to "whichever future step claims it" — and none did). §6.1 said the Settings tab is
    "theme picker + Device section", and described the details route as deep-linkable when no `linking`
    config is registered anywhere. Left the design intent in place (per the ruling above) but marked
    each as future work pointing at §18, and added both to §18's list, so the doc no longer reads as a
    claim that they shipped.
  - **The i18n/RTL entry was made concrete by grep rather than left aspirational**: the codebase has no
    `I18nManager` usage and no logical style props, and exactly 6 physical direction-dependent
    properties, all in three style hooks (`useOrgSearchInputStyles`, `useNameFilterInputStyles`,
    `useRepoCardStyles` — the two clear buttons and the favorite toggle). Recorded in §18 with the
    file names, since that cost is cheap to state now and grows silently otherwise.
  - Reconciled the AI_USAGE scale table against `docs/ai-log.md` entry by entry (~95 findings fixed,
    3 rejected on technical grounds, 2 documented as known trade-offs) rather than estimating.
- Deviation from the `/gen-step` workflow, deliberate and recorded in the step doc: **step 6
  (`code-reviewer` agent) was skipped.** The agent reviews a diff against `docs/DESIGN.md`/`CLAUDE.md`'s
  _code_ rules (architecture, tests, lint) and this step has no code diff — the three documents were
  reviewed by the user directly instead. Flagged at the gate with the option to dispatch it anyway.
- Validation: lint / typecheck / tests (330 tests, unchanged — docs-only step, no `src/` changes) all
  pass. No manual device run (nothing to run; no behavior changed).
- Where AI was useful / risky: useful for condensing a 48 KB per-milestone log into an `AI_USAGE.md`
  that keeps the specifics worth keeping (the two structurally-untestable bugs, the `watchers` alias,
  the dehydration filter, the thrice-repeated RNTL async-helper gotcha) instead of flattening it into
  generic "AI helped write the code" prose — and the per-milestone log existing at all is the only
  reason that synthesis was possible rather than reconstructed from memory. Risky spot: a docs
  milestone is exactly where an assistant is most tempted to write what the design doc _says_ instead
  of what the code _does_ — which is how §9's theme-picker claim survived three milestones after being
  deferred. Cross-checking each claim against the source (grep for `settingsStore`, for `linking`, for
  the directional style props) before writing it down caught all three; worth treating "verify, don't
  transcribe" as the default for any future doc pass, since nothing in lint/typecheck/tests can fail
  on a confidently wrong sentence.

## Fix — `DeviceNetwork` resume handling (2026-10-21)

Not a numbered milestone: a standalone fix made while milestone 10 was under review, merged before
it (PR #11).

- Model(s): implementer Claude Opus 5 (Claude Code), reviewer code-reviewer (opus)
- Reported by me: on the iOS Simulator the offline→online transition didn't update the app — the
  "You're offline" banner stayed until I reloaded. I asked whether that was acceptable or needed
  handling.
- AI generated: the `AppState` resume handling in `useDeviceNetworkMonitoring` (monitor recreation
  plus re-read), the `eventCount` guard replacing the one-shot `receivedEvent` flag, 6 new tests,
  and the `docs/DESIGN.md` §10.3 rewrite.
- Diagnosis worth keeping: two separate things were conflated. `NWPathMonitor` is genuinely
  unreliable in the iOS Simulator and nothing in app code fixes that. But it exposed a real gap —
  state was seeded exactly once per mount, so _any_ missed event left the store and `onlineManager`
  stale until a remount, which is why reloading appeared to fix it.
- Changed / rejected by me: chose monitor recreation over the two alternatives offered (keep the
  re-read and document the iOS limitation; or add a native `refreshNetworkState()` method), gated to
  real background→active returns. Declined a follow-up that would also recreate the monitor on
  pull-to-refresh while offline — background/foreground is enough given a real device's monitor is
  reliable. Also pushed back on whether the fix was warranted at all, which produced a more honest
  write-up: the only _demonstrated_ failure is Simulator-specific and the device-level case remains
  unproven.
- Reviewer findings: fixed 6, rejected 2.
  - **The first implementation could not have fixed the reported symptom.** It re-read
    `getNetworkState()` on foreground, but on iOS that returns the running `NWPathMonitor`'s
    `currentPath` — a stale monitor returns the same stale answer. Only recreating it forces a real
    update (`start(queue:)` always delivers an initial path), which is what a JS reload was doing.
    `startNetworkMonitoring()` alone can't, being `if monitor == nil`. The reviewer also identified
    the platform split the first pass missed: on Android `getNetworkState()` is a live
    `activeNetwork` query, so a re-read there genuinely would have sufficed.
  - **None of the first 5 tests distinguished `eventCount` from the boolean it replaced** — all 334
    passed with the counter reverted, while the fix would have been dead on any device that had seen
    one event (the flag latches and discards every later read). Added the test that pins it, then
    mutated the guard to confirm it fails.
  - A read could be issued before `startNetworkMonitoring()` resolved, which on iOS reads an
    unstarted monitor's unsatisfied default and would apply a spurious offline state at startup —
    every read is now chained onto a resolved start.
  - A vacuous `isOnline === true` assertion the seed had already satisfied; an untyped `AppState`
    spy forcing a cast at every use site; DESIGN.md §10.3 overstating that a bare re-read covered
    the Simulator.
  - Rejected: a retry when a resume read is dropped (speculative interleaving; the reviewer concedes
    the mirror case argues the opposite — the assumption is documented in the code instead), and a
    monotonic read id for concurrent reads (judged benign, and chaining onto a resolved start shrinks
    the window).
- Found by typecheck, not review: `AppState.currentState` is nullable, which pushed the "was it
  backgrounded" tracking onto the observed events themselves — type-safe, and it survives a
  `background → inactive → active` sequence that the original `previousStatus` comparison would have
  missed.
- Validation: lint / typecheck / tests (336 tests, up from 330). **Manually verified on an iPhone 18
  Pro simulator (iOS 27.0):** the app was left in a genuinely stuck "You're offline — showing data
  from 11:31" state with the network restored, and a background→foreground cycle cleared the banner.
  Confirmed the app process survived the cycle (PID unchanged at 30021) so the banner cleared from
  the resume path and not from a restart — the distinction that makes the test meaningful, since a
  restart would clear it either way.
- Where AI was useful / risky: the standout is that a confidently-written fix with 5 passing tests
  was wrong in its central mechanism, and the tests encoded the same wrong assumption the
  implementation did — caught only by reading the Swift against the JS. This is the third instance
  in this project of the same root pattern (#06 MMKV linkage, #08 React Query's offline pause): a
  behavior that depends on real native or library machinery, which every mocked test sidesteps by
  construction. It's also the first time the _manual_ verification was designed to rule out the
  obvious false positive (checking the PID to prove a restart wasn't doing the work) rather than just
  observing the happy outcome — worth making the default for any future device check.
