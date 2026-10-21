# Step 08 — Offline (persisted query cache)

## Goal

Make the last successful data survive both app restarts and live offline sessions, per §11
("Offline strategy (bonus)") and the "Offline" row of §6.2 and §15. Milestone 7 already wired the
live half of this (`onlineManager.setOnline(...)` from `useDeviceNetworkMonitoring`, which pauses
queries while offline and resumes/refetches them on reconnect, and a plain "You're offline"
`OfflineBanner`) — explicitly left the rest ("persisting the React Query cache to MMKV, the
'showing data from HH:MM' offline copy" — step 07's Out of scope) for this step. This step closes
that gap:

- Persist the React Query cache to MMKV via `persistQueryClient`/`PersistQueryClientProvider`
  (§11): queries that have ever loaded data, a 24 h max age, a buster tied to the app version.
- Restore it through `PersistQueryClientProvider`, which gates `useQuery`/`useInfiniteQuery` behind
  `isRestoring` until the persister's restore resolves (§11's "restored synchronously … so the last
  viewed list and details render immediately" — see Risks for what this does and doesn't cover).
- Give `OfflineBanner` the "showing data from HH:MM" copy §11 asks for, once there's a recent-enough
  timestamp to show.

Pausing/resuming queries and the base banner are **not** re-done here — already correct from step
07's `onlineManager` wiring.

## Files

**Create:**

- `src/shared/storage/queryPersister.ts` (+ test) — `createAsyncStoragePersister` over a small
  adapter directly on the `mmkv` instance, plus the exported `QUERY_CACHE_MAX_AGE` and
  `queryPersistOptions` (`maxAge: QUERY_CACHE_MAX_AGE`, `buster: <package.json version>`,
  `dehydrateOptions.shouldDehydrateQuery: query.state.data !== undefined`) passed to
  `PersistQueryClientProvider`. (`createSyncStoragePersister` — the sync-storage persister from
  `@tanstack/query-sync-storage-persister` — is `@deprecated` in favor of the async one; see
  Deviations.)
- `src/shared/storage/lastSynced.ts` (+ test) — `recordSync(timestamp = Date.now())` /
  `getLastSyncedAt(): number | null` over one MMKV key. Tracks "the last time any query actually
  succeeded."
- `src/features/device/hooks/useOfflineMessage.ts` (+ test) — `(): string | null`. `null` while
  online; else `getLastSyncedAt()` gated by `QUERY_CACHE_MAX_AGE` (see Risks for why), formatted into
  `"You're offline — showing data from HH:MM"`, or the plain `"You're offline"` with no usable
  timestamp. Lives in `features/device/hooks` (not read directly by a component — see Deviations)
  so `OfflineBanner` stays presentational.
- `src/shared/utils/formatTime.ts` (+ test) — `formatTime(date: Date): string`,
  `Intl.DateTimeFormat` `HH:MM`; `formatResetTime` now delegates to it (same formatting, two
  correctly-named one-liners instead of one misnamed for two concepts).

**Change:**

- `package.json` — add `@tanstack/query-async-storage-persister` and
  `@tanstack/react-query-persist-client`, matching the installed `@tanstack/react-query` version
  range (`^5.104.5`, this repo's existing convention — not an exact pin). Flagging explicitly per
  `CLAUDE.md`: not literally named in `docs/DESIGN.md`, but `persistQueryClient`/the MMKV-backed
  persister it describes in §11 **is** named, and this is the official (current, non-deprecated)
  TanStack package pair that implements it.
- `src/shared/storage/index.ts` — export `QUERY_CACHE_MAX_AGE`, `queryPersistOptions`,
  `recordSync`, `getLastSyncedAt`.
- `src/shared/utils/index.ts` — export `formatTime`.
- `src/app/providers/queryClient.ts` (+ test) — `QueryCache`'s `onSuccess` calls `recordSync()`
  (sibling to the existing `onError` → `logger.error`).
- `src/app/providers/AppProviders.tsx` (+ test) — swap `QueryClientProvider` for
  `PersistQueryClientProvider` (`client={queryClient} persistOptions={queryPersistOptions}`); it
  supplies its own query-client context, so it replaces rather than wraps the old provider.
- `src/features/device/hooks/index.ts` — export `useOfflineMessage`.
- `src/features/device/components/OfflineBanner.tsx` (+ test) — renders `useOfflineMessage()`'s
  result (`null` → nothing), instead of reading storage itself.
- `docs/ai-log.md` — append this step's entry.

## Public APIs

- `@shared/storage`: adds `QUERY_CACHE_MAX_AGE: number`,
  `queryPersistOptions: Omit<PersistQueryClientOptions, 'queryClient'>` (the type from
  `@tanstack/react-query-persist-client`), `recordSync(timestamp?: number): void`,
  `getLastSyncedAt(): number | null`.
- `@shared/utils`: adds `formatTime(date: Date): string`.
- `features/device/hooks` (internal, not re-exported through `@features/device`'s barrel — only
  `OfflineBanner` in this feature needs it): adds `useOfflineMessage(): string | null`.
- No change to `OfflineBanner()`'s exported signature — still `(): React.JSX.Element | null`.

## Test list

- `formatTime.test.ts` — formats a known `Date` to `"HH:MM"`.
- `lastSynced.test.ts` — `getLastSyncedAt()` is `null` before any `recordSync()`; `recordSync(ts)`
  makes `getLastSyncedAt()` return that `ts`; `recordSync()` with no argument stores (close to)
  `Date.now()`. MMKV cleared in `beforeEach` so these don't depend on run order.
- `queryPersister.test.ts` — `queryPersistOptions.buster` equals `package.json`'s `version`;
  `maxAge` equals `QUERY_CACHE_MAX_AGE`; `shouldDehydrateQuery` is `true` for a query that has data
  (built through a real `QueryClient.fetchQuery`, not a cast) and `false` for one that never got
  any; **a query whose most recent fetch failed but that still holds data from an earlier success
  is still dehydrated** (the regression case for "successful queries only" silently dropping
  already-cached data the moment a background refetch fails); the persister's
  `persistClient`/`restoreClient` round-trip over the real (Jest-mocked, in-memory) MMKV.
- `queryClient.test.ts` — a successful `fetchQuery` calls `recordSync()`; a failed one does not
  (spied on the module that defines it, `@shared/storage/lastSynced` — `@shared/storage`'s barrel
  re-export is a non-configurable getter in the compiled output that `jest.spyOn` can't redefine);
  existing `onError`/retry tests untouched.
- `useOfflineMessage.test.ts` — `null` while online; `"You're offline"` offline with no prior sync;
  includes the formatted time offline with a recent sync; falls back to the plain message once the
  last sync is older than `QUERY_CACHE_MAX_AGE`. MMKV cleared in `beforeEach`.
- `OfflineBanner.test.tsx` — offline + no prior sync → label is exactly `"You're offline"`; offline
  - a recent recorded sync → label includes the real formatted time; existing "renders nothing
    while online" test untouched. MMKV cleared in `beforeEach`.
- `AppProviders.test.tsx` — data persisted through the real `queryPersister` under a given query
  key before render is visible to a descendant's `useQuery` for that same key without its own
  `queryFn` ever resolving (proves restore is wired end to end, not just that the persister
  functions work in isolation); a persisted client saved under a _different_ buster is not
  restored; one older than `maxAge` is not restored either — the two behaviors §11 actually asks
  for, not just the happy path. MMKV cleared in `beforeEach` (the real persister writes to the same
  MMKV key every test in this file touches `PersistQueryClientProvider`, so without this, an
  earlier test's throttled background write could land mid-test and clobber a later test's seeded
  data); existing three tests (renders children / working `QueryClient` / starts monitoring) still
  pass unchanged against `PersistQueryClientProvider`.

## Out of scope

- Any change to `ExploreScreen`/`RepoDetailsScreen`/`FavoritesScreen` pull-to-refresh or pause/resume
  behavior — already correct via step 07's `onlineManager.setOnline(...)` wiring (a `refetch()`
  triggered while offline is paused by React Query itself, not fetched and not logged as an error).
  The already-visible `OfflineBanner` is what "explains why" a pull-to-refresh does nothing while
  offline — no separate disabled-spinner affordance is added. Favorites needs nothing here at all:
  it's a Zustand snapshot, not a query, so it already works fully offline (§8).
- Persisting _which_ org was last searched (`ExploreScreen`'s `org`/`nameFilter` stay local
  `useState`, as before). This means a cold restart still opens Explore on its empty
  "Search a GitHub organization…" state, even though that org's query result is sitting restored in
  the cache the moment the same org is resubmitted — see Risks for why this is a real gap against
  §11's "last viewed list … renders immediately" and why it isn't closed here.
- ETag conditional requests, rate-limit countdown UX — explicit future work (§18), unrelated.
- Settings → Device screen content — unchanged from step 07.
- Native `getDeviceInfo()`'s `appVersion` as the cache buster — see Deviations.

## Risks / open questions

- **§11's "last viewed list … renders immediately" is only partly true after this step.** The
  persisted _query cache_ is restored, but nothing persists _which_ org/repo was last viewed — Explore
  always opens on its empty search state after a cold start (see Out of scope), and `RepoDetails` is
  only reachable by navigating there in-session (no deep-link/last-route restore either). What
  actually gets the restore benefit on a cold start: re-submitting an org already in the cache (or a
  `RepoDetails` the user navigates back to, via prefetch/`placeholderData`) resolves instantly from
  the restored cache instead of hitting the network. Closing the gap fully would mean persisting
  "last submitted org" (e.g. in a small settings-style store) — real scope, not something to fold in
  here uninvited (same call step 07 made for the theme-mode-picker gap). Flagging it rather than
  silently claiming more than this step delivers.
- **"Restored … before screens mount" is imprecise and has been corrected above.**
  `PersistQueryClientProvider` mounts its children immediately; what it actually gates is
  `useQuery`/`useInfiniteQuery` themselves, via an internal `isRestoring` context, until the
  persister's restore resolves. Screens render right away, in their loading state, and fill in once
  restore finishes (near-instant with a synchronous MMKV read behind the async-storage adapter,
  typically well under one visible frame, but not literally "before mount").
- **`useOfflineMessage`'s "no reactivity needed" reasoning has a narrow gap.** A request already in
  flight at the exact moment the device goes offline can still resolve and call `recordSync()` a
  tick later; the banner won't reflect that newer timestamp until its own next re-render (e.g. the
  next network-state change). Accepted as a minor, rare lag rather than wiring a reactive store for
  it.
- **The "showing data from HH:MM" timestamp is global, not per query.** One MMKV key tracks the most
  recent successful fetch across the whole app, not "when did the data for the screen you're
  currently looking at load." Viewing org A (loaded at 10:00) right after org B (loaded at 11:00)
  while offline would say 11:00 under both. Gating it to `QUERY_CACHE_MAX_AGE` (added after review —
  see below) stops it from ever naming a time for data that no longer exists; a fully accurate
  per-query time would mean threading each query's own `dataUpdatedAt` down to the banner, which
  isn't done here (see Out of scope's note on `OfflineBanner`'s existing no-props shape).
- `QueryCache`'s constructor `onSuccess` callback (v5) — used the same way the existing code already
  uses its `onError` sibling; confirmed against the installed `@tanstack/react-query` types.

## Follow-ups (found during manual simulator testing)

Manual verification on an iPhone 18 Pro simulator (`npx react-native run-ios`) surfaced a real bug
the test suite's mocked-hook screen tests couldn't have caught, because they never drive a query
through React Query's actual pause/resume state machine:

- **Searching an org with nothing cached yet, while offline, hung on the loading skeleton forever.**
  React Query _pauses_ (rather than fails) a fetch while `onlineManager` reports offline (§10.3) —
  correct for a background refetch over already-loaded data (§11's whole point), but
  `ExploreScreen`/`RepoDetailsScreen` only ever checked `status === 'pending'` for their first-load
  skeleton, with no way to tell "still fetching" apart from "paused with nothing to show and
  nothing will arrive until reconnect." Fixed by adding `isPaused` (`status === 'pending' &&
fetchStatus === 'paused'`) to `useOrgRepos`/`useRepoDetails`'s return values, and a new branch in
  each screen's `renderContent()` that shows `"You're offline — search/this will load once you're
back online"` via the existing `ErrorView` instead of an endless skeleton. Covered by new tests in
  `useOrgRepos.test.ts`, `useRepoDetails.test.tsx`, `ExploreScreen.test.tsx`, and
  `RepoDetailsScreen.test.tsx` (316 tests total, up from 312).
- **`NWPathMonitor` (iOS) sometimes doesn't re-fire its `pathUpdateHandler` on the "back online"
  transition in the Simulator**, even though it reliably fires going offline. Confirmed this is a
  Simulator-only quirk, not a bug in `useDeviceNetworkMonitoring`'s wiring: reloading the app (which
  re-seeds state via one fresh `getNetworkState()` call, same code path as a cold launch) correctly
  showed "online" immediately. No code change — not something app code can fix reliably (the
  Simulator's virtualized network interface, not a real radio, is the actual cause), and milestone
  7's own manual check already ran on a real device for the native module. Noted here only as a
  testing-methodology gotcha: verifying "back online" behavior in the Simulator needs an app reload
  after reconnecting, not just toggling Wi-Fi back on.

## Deviations from DESIGN.md

- §11 names `persistQueryClient` with "an MMKV-backed persister" without naming a package. The sync
  persister (`@tanstack/query-sync-storage-persister`'s `createSyncStoragePersister`) matches MMKV's
  synchronous reads most literally, but its own JSDoc marks it `@deprecated` in favor of
  `createAsyncStoragePersister` (`@tanstack/query-async-storage-persister`), whose storage interface
  accepts synchronous return values just as well (`MaybePromise<T>`). Used the current, non-deprecated
  package; no behavioral difference for a synchronous backing store like MMKV.
- §11 says the cache buster is "tied to the app version" without naming a mechanism. Rather than the
  native module's `getDeviceInfo()` (async — wrong shape for a value needed synchronously at
  provider-setup time, before any native call could resolve), the buster uses `package.json`'s
  `version` field, imported directly (`resolveJsonModule` is already on via
  `@react-native/typescript-config`). Same intent (a cache from an older release is discarded),
  simpler mechanism; relies on `package.json`'s `version` actually being bumped per release, which
  isn't automated here.
- §11's "successful queries only" is implemented as "queries that have ever loaded data" instead of
  a literal `status === 'success'` check — found in review: a `status === 'success'` filter would
  drop a query's `data` from the persisted cache the moment any later _refetch_ of it failed (e.g. a
  rate limit, which §13 already says not to retry), which directly contradicts §11's actual intent
  of keeping the last successful data visible while offline. `query.state.data !== undefined` keeps
  it.
- `OfflineBanner` reading storage directly (as originally written) didn't fit `CLAUDE.md`'s
  "screens → hooks → api/store → shared" rule for a component — moved that logic into
  `useOfflineMessage()` so the component stays a plain "render what the hook returns."
