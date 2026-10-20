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
