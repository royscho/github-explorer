# Step 03 — Repo list

## Goal

Build everything an org's repo list needs to render end-to-end: the app-level providers (React Query,
theme, safe area, error boundary), the React Navigation v7 shell (root stack + bottom tabs), the theming
system (`makeStyles`/`useStyles`), and `ExploreScreen` — org input, infinite-scrolled repo list, and every
list state from DESIGN §6.2 except the ones that depend on infra built in later milestones (offline banner,
favorites, debounced search).

Scope is exactly the milestone 3 row in `docs/DESIGN.md` §16: _"Providers, navigation, theme + `makeStyles`,
ExploreScreen with all list states, pagination, refresh"_. It implements:

- §3.1–3.3 (architecture, folders, data flow) — `app/providers`, `app/navigation`, `shared/theme`,
  `shared/components`, `shared/logger`, `features/repos/{hooks,components,screens}`.
- §4 (state management) — React Query owns the repo list as server state; nothing is copied into Zustand
  (no Zustand store exists yet — first one lands in milestone 6).
- §6.1 (navigation structure) — native-stack root, `MainTabs` (Explore / Favorites / Settings), typed params.
  `RepoDetails` is **not** registered yet (see Out of scope).
- §6.2 (screen states) — loading, error, rate limited, empty, refreshing, loading more. **Offline** is out of
  scope (needs the `DeviceNetwork` native module, milestone 7).
- §6.3 (list item content) — name, description, language, stars, forks, open issues, "updated …".
- §9 (theming & styling) — light/dark tokens, `ThemeProvider`, `makeStyles`/`useStyles`, no UI kit.
- §12 (performance) — FlashList v2, memoized `RepoCard`, stable `renderItem`/`keyExtractor`, `staleTime` on
  the list query.
- §13 (error handling) — typed errors → `ErrorView`; one app-level `ErrorBoundary`; `shared/logger` (its
  first consumer, as flagged in the milestone 2 step doc).
- §14 (accessibility) — role + label on every pressable added this step.

## Scope decisions (read before reviewing Files)

These are sequencing calls, not deviations from DESIGN.md — the milestone-3 table row doesn't mention them,
and the infra they'd need doesn't exist until a later milestone.

1. **Icon package**: `@react-native-vector-icons/ionicons` (+ its `@react-native-vector-icons/common` peer,
   installed transitively) — confirmed with the user. TurboModule-based, built for the New Architecture,
   matches this app's RN 0.88 + New Arch setup. `docs/DESIGN.md` §9 currently says "a vector-icon package"
   without naming one; this step names it there.
2. **`RepoDetails` route is not registered yet.** §6.1 describes it as part of the root stack, but its
   screen, placeholder-data wiring and press-in prefetch are milestone 4's explicit output. Adding an empty
   stub route with nothing behind it would be a half-finished implementation. `RepoCard` is **not**
   `Pressable` this step — press handling and the route both arrive together in milestone 4.
3. **Favorites and Settings tabs are real routes with a shared placeholder screen**, not full features. The
   tab bar needs all three tabs now (it's this step's "navigation" output), but the Favorites store
   (milestone 6) and Settings/theme-picker (milestone 7, alongside the native module) don't exist yet. A
   single `shared/components/ComingSoonScreen` (title + body text) is reused for both tab screens instead of
   scaffolding two feature folders early.
4. **Theme mode is system-only.** `ThemeProvider` reads `useColorScheme()` directly; there is no manual
   light/dark override and nothing is persisted. §9's "choice is saved in `settingsStore`" needs Zustand +
   MMKV, which isn't introduced until milestone 6 (favorites) — the override toggle lands with the real
   Settings screen in milestone 7.
5. **`OrgSearchInput` has no debounce.** It's a controlled text field that fires the query on submit
   (`onSubmitEditing` / a Search button), matching "press Search" from §7 — the debounce-after-typing
   behavior and the name filter are milestone 5's explicit output.
6. **No favorite toggle** on `RepoCard` this step (milestone 6).

## Files

**Create:**

- `src/shared/theme/tokens.ts` — light/dark color, spacing, typography, radii tokens.
- `src/shared/theme/ThemeProvider.tsx` — context provider reading `useColorScheme()`; `useTheme()` hook.
- `src/shared/theme/ThemeProvider.test.tsx`
- `src/shared/theme/makeStyles.ts` — `makeStyles(fn)` → `useStyles()`, `StyleSheet.create` cached per theme.
- `src/shared/theme/makeStyles.test.tsx`
- `src/shared/theme/index.ts` — barrel.
- `src/shared/logger/index.ts` — `logger.error/warn/info(message, context?)`, console-backed.
- `src/shared/logger/logger.test.ts`
- `src/shared/components/Screen.tsx` — safe-area + theme background wrapper.
- `src/shared/components/Text.tsx` — themed `Text` with a small variant prop (`body`/`title`/`caption`).
- `src/shared/components/ErrorView.tsx` + `.test.tsx` — message + optional Retry button.
- `src/shared/components/EmptyView.tsx` + `.test.tsx`
- `src/shared/components/LoadingView.tsx` + `.test.tsx` — first-load skeleton list.
- `src/shared/components/ListFooterLoader.tsx` + `.test.tsx` — pagination footer spinner.
- `src/shared/components/ErrorBoundary.tsx` + `.test.tsx` — class component, fallback UI + "Restart"
  (resets its own state), logs via `shared/logger`.
- `src/shared/components/ComingSoonScreen.tsx` + `.test.tsx` — `{ title: string }` placeholder screen.
- `src/shared/components/index.ts` — barrel.
- `src/app/providers/queryClient.ts` — `createQueryClient()`: `retry` keyed off the typed errors
  (`NetworkError` → retry w/ backoff, `NotFoundError`/`RateLimitError` → no retry, `ApiError` → retry only
  when `status >= 500`), list `staleTime` 5 min.
- `src/app/providers/queryClient.test.ts`
- `src/app/providers/AppProviders.tsx` — composes `SafeAreaProvider` → `QueryClientProvider` →
  `ThemeProvider` → `ErrorBoundary` → children.
- `src/app/providers/AppProviders.test.tsx`
- `src/app/providers/index.ts` — barrel.
- `src/app/navigation/types.ts` — `RootStackParamList` (`MainTabs` only this step), `MainTabParamList`
  (`Explore`, `Favorites`, `Settings`).
- `src/app/navigation/MainTabs.tsx` — bottom-tabs, Ionicons per tab, `ExploreScreen` / two
  `ComingSoonScreen`s.
- `src/app/navigation/RootStack.tsx` — native-stack wrapping `MainTabs`.
- `src/app/navigation/MainTabs.test.tsx`
- `src/app/navigation/index.ts` — barrel.
- `src/features/repos/hooks/useOrgRepos.ts` — `useInfiniteQuery` wrapper.
- `src/features/repos/hooks/useOrgRepos.test.tsx`
- `src/features/repos/hooks/index.ts` — barrel.
- `src/features/repos/components/RepoCard.tsx` + `.test.tsx` — presentational, `memo`, not pressable.
- `src/features/repos/components/RepoCardSkeleton.tsx` + `.test.tsx`
- `src/features/repos/components/OrgSearchInput.tsx` + `.test.tsx`
- `src/features/repos/components/index.ts` — barrel.
- `src/features/repos/screens/ExploreScreen.tsx` + `.test.tsx`
- `src/features/repos/screens/index.ts` — barrel.
- `src/shared/utils/formatRelativeTime.ts` + `.test.ts` — "3 days ago" style text (§9: hand-written,
  Hermes-safe; not in the milestone 2 file list, needed now as `RepoCard`'s first consumer).
- `src/shared/utils/formatCompactNumber.ts` + `.test.ts` — "12.3k" style text (§9, same reason).

**Change:**

- `src/features/repos/index.ts` — also export `ExploreScreen` (so `app/navigation` imports it through the
  barrel, never `features/repos/screens/ExploreScreen` directly).
- `src/app/App.tsx` / `App.test.tsx` — mount `AppProviders` + `NavigationContainer` + `RootStack`; drop the
  placeholder title view.
- `package.json` — add `@tanstack/react-query@^5.104.5`, `@react-navigation/native@^7.5.1`,
  `@react-navigation/native-stack@^7.21.0`, `@react-navigation/bottom-tabs@^7.21.0`,
  `react-native-screens@^4.30.0`, `@shopify/flash-list@^2.3.3`, `@react-native-vector-icons/ionicons@^14.0.0`.
- iOS: `pod install` after the npm install (new native modules: `react-native-screens`, the icon package).
- `docs/DESIGN.md` §9 — name the icon package (see scope decision 1).

## Public APIs

- `shared/theme`: `useTheme(): Theme`, `ThemeProvider`, `makeStyles<T>(fn: (theme: Theme) => T): () => T`.
- `shared/logger`: `logger.error(error: unknown, context?: Record<string, unknown>): void` (+ `warn`/`info`).
- `shared/components`: `Screen`, `Text`, `ErrorView({ message, onRetry? })`, `EmptyView({ message })`,
  `LoadingView`, `ListFooterLoader`, `ErrorBoundary`, `ComingSoonScreen({ title })`.
- `app/providers`: `createQueryClient(): QueryClient`, `AppProviders({ children })`.
- `app/navigation`: `RootStack`, `RootStackParamList`, `MainTabParamList`.
- `features/repos/hooks/useOrgRepos.ts` exports `useOrgRepos(org: string): { repos: Repo[]; status;
error: GitHubApiError | null; hasNextPage: boolean; isFetchingNextPage: boolean; fetchNextPage: () => void;
refetch: () => void; isRefetching: boolean }` — `enabled: Boolean(org)`, `initialPageParam: 1`,
  `getNextPageParam` from `OrgReposPage.hasNextPage`.
- `features/repos/components`: `RepoCard({ repo: Repo })`, `RepoCardSkeleton()`,
  `OrgSearchInput({ value, onChangeText, onSubmit })`.
- `features/repos/screens/ExploreScreen.tsx` — default export, no props (reads org from local `useState`).

## Test list

- `makeStyles.test.tsx` — same theme object across renders → same `StyleSheet` reference (no rebuild); theme
  change → new `StyleSheet`.
- `ThemeProvider.test.tsx` — `useTheme()` outside a provider throws; reflects light/dark from
  `useColorScheme()` mock.
- `logger.test.ts` — `error`/`warn`/`info` call the matching `console.*` with message + context; error object
  is passed through, not stringified.
- `ErrorView.test.tsx` — renders message by role/label; Retry button calls `onRetry`; no button when
  `onRetry` omitted.
- `EmptyView.test.tsx` — renders the given message.
- `LoadingView.test.tsx` — renders N skeleton rows.
- `ListFooterLoader.test.tsx` — renders an activity indicator with an accessible label.
- `ErrorBoundary.test.tsx` — catches a thrown render error, shows fallback, logs via `shared/logger`;
  "Restart" resets and re-renders children.
- `ComingSoonScreen.test.tsx` — renders the given title.
- `queryClient.test.ts` — `retry` fn: `NetworkError` → true (under max attempts); `NotFoundError` → false;
  `RateLimitError` → false; `ApiError` with `status: 500` → true; `ApiError` with `status: 400` → false.
- `AppProviders.test.tsx` — renders children; provides a working `QueryClientProvider` (a child using
  `useQuery` doesn't throw "No QueryClient set").
- `MainTabs.test.tsx` — all three tab labels present by role; switching tabs renders the matching screen
  (`ExploreScreen` mocked to a stub; `ComingSoonScreen` content for the other two).
- `useOrgRepos.test.tsx` (fresh `QueryClient`, retries off, mocks `fetchOrgRepos`):
  - loading → `status: 'pending'`.
  - success → flattened `repos` across pages; `hasNextPage` from the last page.
  - `fetchNextPage` requests page 2 with the same org.
  - error (e.g. `NotFoundError`) → `status: 'error'`, `error` is the typed error.
  - empty org (`''`) → query never fires (`fetchOrgRepos` not called).
  - empty result (`{ repos: [], hasNextPage: false }`) → `repos: []`, no error.
- `RepoCard.test.tsx` — renders name, description (and "No description" when `null`), language (and nothing
  when `null`), star/fork/open-issues counts, relative "updated" text; accessible label describes the repo.
- `RepoCardSkeleton.test.tsx` — renders without a repo prop, doesn't throw.
- `OrgSearchInput.test.tsx` — typing updates the controlled value; submit (button press and
  `onSubmitEditing`) calls `onSubmit` with the current text; submit button has an accessible role/label.
- `ExploreScreen.test.tsx` (RNTL + test `QueryClient`, mocks `useOrgRepos` or `fetchOrgRepos`):
  - idle (no org entered yet) → shows the input, no list, no request.
  - loading (first page) → `LoadingView` skeletons.
  - success → list of `RepoCard`s, one per repo.
  - empty (org with zero repos) → `EmptyView` with the DESIGN §6.2 message.
  - error (generic) → `ErrorView` + Retry; pressing Retry calls `refetch`.
  - rate limited → message includes the formatted reset time; no Retry button/action.
  - loading more → scrolling to the end with `hasNextPage: true` calls `fetchNextPage`, footer shows
    `ListFooterLoader`.
  - refreshing → pull-to-refresh triggers `refetch`.

## Out of scope

- `RepoDetails` screen/route, placeholder data, press-in prefetch, `Linking.openURL` (milestone 4).
- Debounced org input, client-side name filter (milestone 5).
- Favorites store, favorite toggle, real `FavoritesScreen` (milestone 6).
- `DeviceNetwork` native module, `OfflineBanner`, real `SettingsScreen` (theme-mode picker + Device section)
  (milestone 7).
- Persisted React Query cache, offline UX (milestone 8).
- Deep linking config (`linking` prop) — no deep-linkable route exists yet (needs `RepoDetails`, milestone 4).
- ETag requests, live rate-limit countdown (§18 future work).
- **Per-screen error boundary** (§13: "one at app level … one per screen"). Only the app-level
  `ErrorBoundary` ships this step; a per-screen one (reset boundary + query together, e.g. via
  `QueryErrorResetBoundary`) is deferred to milestone 4, which adds the second real screen
  (`RepoDetails`) this pattern would actually need to differentiate from the app-level fallback.

## Risks / open questions

- **FlashList v2 under Jest/RNTL**: FlashList measures real layout, which `react-test-renderer`/RNTL's fake
  layout environment may not drive the same way as a real device. Will confirm during implementation whether
  the default RNTL setup is enough to assert rendered items and `onEndReached`, or whether a small
  `onLayout`/measurement mock is needed; will note here if one is added.
- **`@react-native-vector-icons/ionicons` on a fresh RN 0.88 New-Arch app**: newer package, so will verify
  the icon actually renders on both the iOS simulator and an Android emulator/device, not just that
  typecheck/tests pass.
- **Rate-limit reset-time formatting**: §5.3 says "try again at HH:MM" — will use `Intl.DateTimeFormat` with
  `hour`/`minute` (already the documented approach for absolute times in §9), not a new formatter.

## Deviations from DESIGN.md

None — §9's icon-package blank is being filled in, not changed from what it said.

## Follow-ups (discovered during implementation)

- **iOS font registration**: `@react-native-vector-icons/ionicons`'s CocoaPods resource bundling
  copies `Ionicons.ttf` into the app bundle but does **not** register it with iOS's font system —
  confirmed via `run-ios` + simulator screenshot, which showed "?" tofu glyphs in the tab bar.
  Fixed by adding a `UIAppFonts` array (`Ionicons.ttf`) to `ios/GithubExplorer/Info.plist`; a second
  `run-ios` + screenshot confirmed the compass/star/gear glyphs render. Android wasn't verified on a
  device/emulator this step (no local emulator run) — its autolinking copies the font into
  `assets/fonts/` without an extra manifest step, but that's unverified here; flagging for a
  follow-up manual check.
- **`@testing-library/react-native` 14.x's `render`/`renderHook` are `async`** (confirmed, this
  bit the milestone 1 step too): every call needed `await`; omitting it doesn't throw, it just
  leaves RNTL's `screen` singleton unbound, surfacing later as a confusing "render function has not
  been called" on the next query.
- **`jest.mock('react-native', factory)` + `jest.requireActual('react-native')`** inside a test
  file crashes with a `DevMenu` TurboModule invariant violation when the project's own
  `jest.config.js` sets `setupFiles` (it replaces, not merges with, `@react-native/jest-preset`'s own
  `setupFiles`, which is what mocks native modules). Fixed by listing both setup files explicitly,
  and by switching the two theme tests off the whole-module mock in favor of
  `jest.spyOn(ReactNative, 'useColorScheme')`.
- **`react-native-safe-area-context`'s shipped Jest mock** (`.../jest/mock.js`) exports its
  replacements under `.default`, not as named exports — `jest.mock('react-native-safe-area-context',
() => require('.../jest/mock'))` silently yields `undefined` for `SafeAreaProvider` etc. (a hard
  React "element type is invalid" crash, not a test failure with a clear message). Needs
  `require('.../jest/mock').default` in the factory.
- **`@react-native-vector-icons/ionicons` ships a `.ttf`** that the default `@react-native/jest-preset`
  transform doesn't know how to parse; added a `moduleNameMapper` entry (`\.(ttf|otf)$` → a trivial
  stub module) rather than extending the preset's asset-transformer regex, to keep the preset's own
  transform untouched.
- **`isAccessibilityElement` in this RNTL version requires an explicit `accessible` prop** on a
  plain `View` carrying `accessibilityRole`/`accessibilityLabel` — without it, `getByRole`/`findByRole`
  can't find the element even though it's visibly in the debug tree. Added `accessible` to
  `LoadingView` and `ListFooterLoader`'s container `View`s.
- **FlashList v2's `onEndReached`/scroll-physics can't be driven from the test renderer** (it needs
  real per-cell layout measurement that only a device/simulator provides). `ExploreScreen.test.tsx`
  mocks `@shopify/flash-list` with a trivial `View`-based stand-in that renders `data` via
  `renderItem` and exposes `onEndReached`/`onRefresh`/`refreshing` directly as props, so the test
  verifies _this screen's_ wiring to FlashList's props, not FlashList's own internals (that's
  `@shopify/flash-list`'s own test suite's job).
