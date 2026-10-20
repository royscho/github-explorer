# Step 04 — Repo details

## Goal

Build `RepoDetailsScreen`: a pushed, back-navigable screen reachable from a tapped `RepoCard`, showing
everything DESIGN §6.3 lists for details beyond the list item (default branch, license, repository URL,
created/updated dates), with the tapped list item used as instant `placeholderData` and prefetch-on-press-in
so navigation feels instant.

Scope is exactly the milestone 4 row in `docs/DESIGN.md` §16: _"RepoDetailsScreen, placeholder data,
prefetch, open URL"_. It implements:

- §6.1 (navigation structure) — registers the one `RepoDetails` route on the **root** stack (reachable from
  Explore now; Favorites/deep link later), `{ owner, repo }` params only, header with back button,
  placeholder data from the cached list item, prefetch on press-in.
- §6.2 (screen states) — loading, error, rate limited, refreshing for a single-item (non-list) screen; empty
  and "loading more" don't apply here (see Out of scope).
- §6.3 (details content) — full name, description, stars/forks/watchers/open issues, default branch,
  license (if any), repository URL (`Linking.openURL`), created/updated dates. Favorite toggle is out of
  scope (no favorites store yet).
- §3.2 — introduces `RepoStats`, named in the folder list but not yet built in milestone 3.
- §9 — adds `formatDate` (absolute date), the other half of "`Intl.DateTimeFormat` for absolute dates" that
  milestone 3 didn't need yet.
- §13 — adds the per-screen error boundary deferred from milestone 3 ("a per-screen one is deferred to
  milestone 4, which adds the second real screen this pattern would actually need to differentiate from the
  app-level fallback"), applied to both `ExploreScreen` and `RepoDetailsScreen`.
- §14 — role + label on the new pressable `RepoCard` and the "View on GitHub" link.

## Scope decisions / design notes (read before reviewing Files)

1. **Cross-feature navigation typing.** `RootStackParamList` (owned by `app/navigation`) must reference the
   `RepoDetails` param shape, but `features/repos` (where the screen that navigates to it, `ExploreScreen`,
   lives) must never import from `@app/navigation` — architecture flows `screens → hooks → api/store →
shared`, never the other way. Fix: `RepoDetailsRouteParams` is defined and exported from
   `features/repos` (via its barrel); `app/navigation/types.ts` imports it into `RootStackParamList`. Screens
   inside `features/repos` that need to navigate to or read this route type against a **local, minimal**
   param-list literal (`{ RepoDetails: RepoDetailsRouteParams }`) instead of the app's full
   `RootStackParamList` — structurally identical, no upward import.
2. **`watchers` is a `RepoDetails`-only field, matching §6.1 exactly.** Originally implemented with
   `watchers` on the base `Repo` (mapped from the list/detail DTO's `watchers_count`) and this note claimed
   §6.1 was "slightly imprecise" — that was backwards, caught in code review. GitHub's `watchers_count` is a
   long-standing API quirk that always duplicates `stargazers_count`; the real "people watching" figure is
   `subscribers_count`, which is only reliable on the single-repo endpoint response. Fixed: `watchers` moved
   to `RepoDetails` (mapped from `subscribers_count` in `mapRepoDetails`), `defaultBranch`/`license`/`watchers`
   are all three "fill in after the list item" fields, and the cache-scanned placeholder sentinel treats all
   three the same way (see note 3) — `watchers` specifically renders as "not yet known" by omitting the prop
   from `RepoStats` (which already supports an optional `watchers`) rather than inventing a fourth UI state.
3. **Where "the cached list item" comes from.** Route params are IDs only (§6.1), so the details hook can't
   receive the tapped `Repo` object directly. `useRepoDetails` instead scans the `QueryClient` cache for any
   org-list query (`repoKeys.lists()`, a new factory entry both `orgList` and this scan build from), flattens
   its pages, and finds a `Repo` whose `fullName` matches `${owner}/${repo}` (case-insensitively) — generic
   across any org list already in cache, not wired to "the org currently open in Explore". This only finds a
   hit when reached from a list that's still cached (Explore); Favorites (milestone 6, a Zustand snapshot) and
   a cold deep link legitimately get no placeholder and fall to the real loading state.
4. **`formatResetTime` moves from `ExploreScreen.utils.ts` to `shared/utils`.** It's already
   screen-agnostic (formats a `Date` as `HH:MM`); `RepoDetailsScreen` needs the identical rate-limit message.
   `getErrorMessage` is **not** shared — "Organization not found" vs. "Repository not found" differ per
   screen, so each screen keeps its own small `getErrorMessage`.
5. **Per-field "still loading" UI, not a second skeleton.** While `isPlaceholderData` is true, the screen
   renders the real list-item fields immediately and shows a small inline placeholder (not the full-screen
   `RepoDetailsSkeleton`) for `defaultBranch`/`license`, and omits `watchers` from `RepoStats` entirely, until
   the real fetch resolves. Relatedly: because `placeholderData` makes React Query report `status: 'success'`
   (not `'pending'`) while the real fetch is in flight, `useRepoDetails` masks `isRefetching` to `false`
   whenever `isPlaceholderData` is true — otherwise every navigation from a cached list would show the
   pull-to-refresh spinner on top of the screen's own placeholder UI (caught in code review).
6. **No favorite toggle, no language row.** Favorites needs milestone 6's store. `language` isn't in §6.3's
   details field list (it's a list-item-only field), so it's intentionally dropped from the details screen.
7. **Per-screen error boundary scope.** Wraps `ExploreScreen` and `RepoDetailsScreen` at the navigation
   layer (`MainTabs`/`RootStack`), not inside the screens themselves, so it's one reusable piece rather than
   copy-pasted per screen. Reuses `ErrorView`'s existing "Retry" label/affordance rather than introducing a
   second piece of wording ("Try again") for the same concept. Uses `QueryErrorResetBoundary` so Retry resets
   the boundary **and** the query together, per §13 — resolved during implementation (see Risks: the reset
   is per-boundary-instance, not global to the `QueryClient`, so it's correctly scoped as written).

## Files

**Create:**

- `src/shared/utils/formatDate.ts` + `.test.ts` — absolute date, `Intl.DateTimeFormat` (`year: 'numeric',
month: 'short', day: 'numeric'`).
- `src/shared/utils/formatResetTime.ts` + `.test.ts` — moved from `ExploreScreen.utils.ts` (same behavior).
- `src/shared/components/ScreenErrorBoundary.tsx` + `.test.tsx` — `QueryErrorResetBoundary` + a class error
  boundary; fallback is `ErrorView`-shaped ("Something went wrong" + "Try again" button that resets both).
- `src/features/repos/components/RepoStats.tsx` + `.test.tsx` — presentational
  `{ stars, forks, openIssues, watchers? }`, formatted via `formatCompactNumber`; replaces `RepoCard`'s
  inline stat `Text`s.
- `src/features/repos/components/RepoDetailsSkeleton.tsx` + `.test.tsx` — same bar-skeleton pattern as
  `RepoCardSkeleton`, hidden from accessibility.
- `src/features/repos/hooks/useRepoDetails.ts` + `.test.tsx` — single-repo query with cache-scanned
  placeholder data (see scope decision 3).
- `src/features/repos/hooks/usePrefetchRepoDetails.ts` + `.test.tsx` — returns a stable
  `(owner, repo) => void` calling `queryClient.prefetchQuery`.
- `src/features/repos/hooks/useRepoDetailsScreenStyles.ts`, `useRepoStatsStyles.ts`,
  `useRepoDetailsSkeletonStyles.ts` — per-component style hooks (existing convention).
- `src/features/repos/screens/RepoDetailsScreen.tsx` + `.test.tsx`
- `src/features/repos/screens/RepoDetailsScreen.utils.ts` + `.test.ts` — this screen's own
  `getErrorMessage` (not JSX; no `keyExtractor` needed here, that's list-specific).

**Change:**

- `src/features/repos/types.ts` — add `RepoDetailsRouteParams { owner: string; repo: string }`.
- `src/features/repos/index.ts` — export `RepoDetailsRouteParams` and `RepoDetailsScreen`.
- `src/features/repos/components/RepoCard.tsx` + `.test.tsx` — wrap in `Pressable`
  (`onPress`, `onPressIn?` props added), `accessibilityRole="button"`; use `RepoStats` instead of inline
  stat `Text`s.
- `src/features/repos/screens/ExploreScreen.tsx` + `.test.tsx` — `renderItem` moves inside the component
  (needs `useNavigation` + `usePrefetchRepoDetails`), wires `onPress` → `navigation.navigate('RepoDetails',
{ owner: repo.owner.login, repo: repo.name })`, `onPressIn` → prefetch; wrapped in `ScreenErrorBoundary` at
  the navigation layer, not here.
- `src/features/repos/screens/ExploreScreen.utils.ts` + `.test.ts` — remove `formatResetTime` (moved to
  `shared/utils`), re-import it from there.
- `src/app/navigation/types.ts` — `RootStackParamList` gains `RepoDetails: RepoDetailsRouteParams`
  (imported from `@features/repos`).
- `src/app/navigation/RootStack.tsx` + new `RootStack.test.tsx` — add `Stack.Screen name="RepoDetails"`,
  `options=({ route }) => ({ headerShown: true, title: route.params.repo })`; both `MainTabs` and
  `RepoDetails` wrapped in `ScreenErrorBoundary` at this layer... (`MainTabs` itself isn't a screen needing
  it; the wrap happens one level down, on `ExploreScreen`/`RepoDetailsScreen` where they're registered —
  see note 7).
- `src/app/navigation/MainTabs.tsx` — `ExploreScreen`'s tab wraps it in `ScreenErrorBoundary`.
- `src/shared/components/index.ts` — export `ScreenErrorBoundary`.
- `src/features/repos/hooks/index.ts`, `components/index.ts` — barrel updates for the new exports.

## Public APIs

- `shared/utils`: `formatDate(iso: string): string`, `formatResetTime(resetAt: Date): string`.
- `shared/components`: `ScreenErrorBoundary({ children })`.
- `features/repos` (via barrel): `RepoDetailsRouteParams`, `RepoDetailsScreen` (default-less named export,
  no props — reads `route.params`).
- `features/repos/hooks`: `useRepoDetails(owner: string, repo: string): { repoDetails: RepoDetails |
undefined; status; error: GitHubApiError | null; isPlaceholderData: boolean; isRefetching: boolean;
refetch: () => void }`; `usePrefetchRepoDetails(): (owner: string, repo: string) => void`.
- `features/repos/components`: `RepoStats({ stars, forks, openIssues, watchers? })` (each stat carries its
  own `accessibilityLabel`, e.g. "220k stars" — added in review since these aren't always nested inside a
  single `accessible` container the way `RepoCard` nests them), `RepoDetailsSkeleton()`.
- `RepoCard` gains `onPress: (repo: Repo) => void`, `onPressIn?: (repo: Repo) => void` — taking the repo as
  an argument (not pre-bound per card) so a parent list can pass one stable function to every cell; an
  earlier version took no argument and required a fresh per-cell closure, which defeated `RepoCard`'s own
  `memo` (caught in code review, fixed before commit).

## Test list

- `formatDate.test.ts` — formats a known ISO string to the expected `Intl` output; invalid input → `''`
  (mirrors `formatRelativeTime`'s defensive empty-string case).
- `formatResetTime.test.ts` — moved verbatim from `ExploreScreen.utils.test.ts`.
- `ScreenErrorBoundary.test.tsx` — catches a thrown render error, shows fallback; "Try again" resets the
  boundary and calls the query-reset callback from `QueryErrorResetBoundary`.
- `RepoStats.test.tsx` — renders formatted stars/forks/openIssues; renders watchers only when passed;
  accessible label per stat.
- `RepoDetailsSkeleton.test.tsx` — renders without a repo prop, hidden from accessibility tree.
- `useRepoDetails.test.tsx` (fresh `QueryClient`, retries off):
  - no cache, loading → `status: 'pending'`, `repoDetails: undefined`, `isPlaceholderData: false`.
  - success → `repoDetails` from `fetchRepoDetails`, `status: 'success'`.
  - error (e.g. `NotFoundError`) → `status: 'error'`, typed error returned.
  - matching cached list item present → `repoDetails` is the cached `Repo` + `defaultBranch: ''`/`license:
null`, `isPlaceholderData: true`, while the real fetch is in flight; resolves to real data after.
  - cached list item for a _different_ owner/repo → no match, behaves like the no-cache case.
  - `refetch()` re-invokes the query function.
- `usePrefetchRepoDetails.test.tsx` — calling the returned function populates
  `queryClient.getQueryData(repoKeys.detail(...))` after the mocked `fetchRepoDetails` resolves; a second
  call for the same owner/repo doesn't call `fetchRepoDetails` again (React Query dedup via default
  `staleTime`).
- `RepoCard.test.tsx` (additions) — press calls `onPress`; press-in calls `onPressIn`; omitting `onPressIn`
  doesn't throw on press-in; existing accessibility-label assertions still pass with the `Pressable` wrapper.
- `RepoDetailsScreen.test.tsx` (RNTL + test `QueryClient`, mocks `useRepoDetails`):
  - loading, no placeholder → `RepoDetailsSkeleton`.
  - loading with placeholder (`isPlaceholderData: true`) → known fields render immediately; default
    branch/license show the inline "still loading" placeholder, not their sentinel values.
  - success → full name, description (and "No description"), `RepoStats`, default branch, license (and "No
    license" when `null`), created/updated dates, "View on GitHub".
  - error, generic → `ErrorView` + Retry; pressing Retry calls `refetch`.
  - error, `NotFoundError` → "Repository not found" message, no Retry.
  - error, `RateLimitError` → reset-time message, no Retry until reset (same `canRetry` logic as
    `ExploreScreen`).
  - pull-to-refresh → triggers `refetch`.
  - pressing "View on GitHub" calls `Linking.openURL` with `repoDetails.htmlUrl`; the pressable has
    `accessibilityRole="link"` and a label.
- `ExploreScreen.test.tsx` (additions) — pressing a `RepoCard` calls `navigation.navigate('RepoDetails', {
owner, repo })` (mocked `useNavigation`); press-in calls the mocked `usePrefetchRepoDetails` result with
  the same `owner`/`repo`.
- `RootStack.test.tsx` (new) — `RepoDetails` route is registered; its header is shown (unlike `MainTabs`)
  with the route's `repo` param as the title.
- `MainTabs.test.tsx` (no new cases expected — `ScreenErrorBoundary` wrapping is structural, covered by
  `ScreenErrorBoundary.test.tsx` itself; will add one smoke case only if the wrap changes what's queryable by
  role).

## Out of scope

- Favorite toggle on the details screen (milestone 6 — no favorites store yet).
- Deep linking (`linking` prop on `NavigationContainer`, `githubexplorer://repo/:owner/:repo`). Milestone 3
  deferred it only because the route didn't exist; re-assessed here: no milestone row calls it out as a
  deliverable, and it needs its own URL-parsing/validation test coverage that's bigger than "add a route" —
  deferred again, flagged below as a risk so it isn't silently dropped.
- "Loading more" and "Empty" screen states (§6.2) — both are list-specific; a single-repo screen is either
  loading, errored, or showing the one repo it was asked for.
- Offline banner / behavior on this screen (needs `DeviceNetwork`, milestone 7).
- Language field on the details screen — not in §6.3's details list (list-item-only field).

## Risks / open questions

- **Deep linking re-deferred twice now.** If the assignment reviewer specifically probes
  `githubexplorer://repo/:owner/:repo`, it won't resolve. Flagging explicitly rather than re-deferring
  silently a third time; can be pulled into milestone 5 or its own small step if the user wants it sooner.
- **`QueryErrorResetBoundary` reset scope — resolved.** `QueryErrorResetBoundary` creates its own reset
  value per boundary instance; `reset()` only clears the "needs reset" flag for `throwOnError` queries
  mounted under that specific boundary, not globally across the `QueryClient`. Verified with a test
  (`ScreenErrorBoundary.test.tsx`) that mounts a real `throwOnError` query under the boundary and confirms
  Retry both clears the fallback and re-invokes the query function. Today no query in the app sets
  `throwOnError`, so this half is inert in practice (the boundary still catches genuine render exceptions
  either way) — it's forward-compatible plumbing for if/when one does.
- **Cache-scan placeholder (`getQueriesData` over a key prefix)**: now built from `repoKeys.lists()` (added
  to the factory) rather than a hand-assembled prefix, with an `Array.isArray(data?.pages)` guard before
  flattening — still assumes every query under that prefix is `InfiniteData<OrgReposPage>`-shaped (true
  today, the only query there), but a shape mismatch now returns no match instead of throwing inside
  `placeholderData`.
- **Prefetch-on-press-in fires on scroll starts too.** `Pressable.onPressIn` fires on touch-down, before RN's
  gesture responder negotiation has decided whether the touch becomes a scroll or a tap — so flinging through
  a list fires a `GET /repos/{owner}/{repo}` prefetch for every card the finger touches down on, against the
  60-requests/hour unauthenticated budget (§19). This is exactly the mechanism DESIGN §6.1 asks for
  ("prefetched on press-in"), and a real fix (e.g. a delay-and-cancel-on-pressOut) risks delaying the prefetch
  past the point of a genuine fast tap's own press-out, defeating the feature it's meant to speed up — not
  attempted this step. Mitigated only by the 5-minute `staleTime` deduping repeat scrolls over the same cards;
  flagging as a known, accepted trade-off rather than fixing blindly.

## Follow-ups (discovered during implementation / code review)

- **`watchers` was duplicating `stars`** (see scope decision 2) — GitHub's `watchers_count` is always equal
  to `stargazers_count`; fixed by sourcing `RepoDetails.watchers` from `subscribers_count` instead, and
  moving `watchers` off the base `Repo` entirely (it's only reliable from the single-repo endpoint). Required
  touching `dto.ts`, `mappers.ts`, `types.ts`, and every `Repo`/`RepoDetails` test fixture.
- **A failed pull-to-refresh was replacing already-loaded details with a full-screen error.** React Query
  keeps the last successful `data` across a failed background refetch while still flipping `status` to
  `'error'`; the screen's original `if (status === 'error' && error)` check fired before checking whether
  `repoDetails` already had data. Fixed to `status === 'error' && !repoDetails && error`, matching
  `ExploreScreen`'s existing "don't throw away data already paid for" pattern (§19).
- **The pull-to-refresh spinner was showing during the very first (placeholder-backed) load.** See scope
  decision 5 — `isRefetching` is masked off while `isPlaceholderData` is true.
- **`RepoCard`'s new `onPress`/`onPressIn` callbacks were unstable**, each cell wrapping them in a fresh
  inline closure per render, which defeated `RepoCard`'s own `memo` (DESIGN §12 asks for stable callbacks).
  Fixed by changing the props to take the repo as an argument so `ExploreScreen` can pass the same
  `useCallback`-memoized function to every cell.
- **`Linking.openURL`'s rejection was unhandled** if nothing on the device could open the URL; fixed to log
  through `shared/logger` instead of leaving an unhandled promise rejection.
- All caught by the `code-reviewer` agent pass in step 6; fixed before commit.

## Deviations from DESIGN.md

None — §9's `RepoStats` gap is being filled in (it was already named in the §3.2 folder list but never
built), not changed from what DESIGN said.
