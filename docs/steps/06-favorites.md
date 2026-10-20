# Step 06 — Favorites

## Goal

Implement DESIGN §4 ("Zustand — client state"), §8 ("Favorites") and the relevant parts of §3.2
(`shared/storage`, `features/favorites`), §6.1 (Favorites tab — "saved repos, works offline"),
§6.3 (Details content's "favorite toggle"), §12 (toggling re-renders one card, not the list) and
§14 (favorite-toggle accessibility). A `favoritesStore` (Zustand + MMKV `persist`) holds a snapshot
of each favorited `Repo` so the Favorites tab works fully offline with zero API calls. The favorite
toggle itself renders on every repo card — Explore's list, the Favorites tab's list, and
`RepoDetailsScreen` — not just Details; see **Revised during review** below for why the scope
changed mid-step. This is also the first step to touch `shared/storage` and to add `zustand` /
`react-native-mmkv` as dependencies — both already named in DESIGN's stack table (§2) and
architecture (§3.2), so no deviation, just their first real usage.

## Revised during review

The first pass of this step put the favorite toggle on `RepoDetailsScreen` only, reasoning from
§6.3's content bullets (which list "favorite toggle" under Details, not under the list-item
bullet). Code review caught that three other DESIGN sections assume a per-card toggle instead:
§8 ("toggling re-renders only that card"), §12 ("toggling one favorite re-renders one card, not the
list") and §14's accessibility example ("react, 220k stars, add to favorites" — a card label). That
reading was confirmed and the scope widened: the toggle now renders on `RepoCard` (used by both
Explore and Favorites) as well as on `RepoDetailsScreen`.

Putting the toggle on `RepoCard` meant both `ExploreScreen` and `FavoritesScreen` would otherwise
need to read favorites state directly — but `RepoCard`/`ExploreScreen` live in `features/repos`,
and `features/favorites` already depends on `features/repos` (for the `Repo` type and `RepoCard`
itself). Importing `@features/favorites` from `features/repos` the other way would be a require
cycle. The fix is dependency inversion: `RepoCard` and `RepoDetailsScreen` take a
`renderFavoriteToggle` slot prop; `app/navigation` (which may depend on any feature) supplies the
favorites-aware implementation. `features/repos` ends up with zero knowledge of favorites; the
dependency graph is one-way (`favorites → repos`, `app → both`).

## Verified: restart persistence

After the first commit draft, a live run surfaced `[zustand persist middleware] Unable to update
item 'favorites-storage', the given storage is currently unavailable.` in the React Native DevTools
console on every `toggleFavorite` call. Traced to root cause rather than patched blind:

- Read zustand's actual `persist`/`createJSONStorage` source (`node_modules/zustand/middleware.js`):
  that warning fires only when `options.storage` is falsy, which only happens when the `getStorage`
  callback passed to `createJSONStorage` throws (the throw is caught internally and swallowed —
  `persist` falls back to an in-memory-only `set` wrapped with the warning, rather than crashing).
- Connected directly to the running app's Hermes runtime via Metro's CDP inspector
  (`ws://localhost:8081/inspector/debug?...`, found via `GET /json/list`) and probed
  `globalThis.nativeModuleProxy['MmkvCxx']` against a known-working module
  (`globalThis.nativeModuleProxy['PlatformConstants']`) as a control: `PlatformConstants` resolved,
  `MmkvCxx` came back `null` — `react-native-mmkv`'s native TurboModule genuinely wasn't registered
  in the binary that was running, so `createMMKV()` threw inside `mmkv.ts`'s module-level
  `new MMKV(...)`, which is exactly what `createJSONStorage`'s `getStorage` callback hits.
- Root cause: **a stale native build**, not an app bug. Two separate Xcode `DerivedData` folders
  existed for this project; the simulator instance connected to Metro was running a binary built
  before `react-native-mmkv` was linked, left over from an earlier run in this same session. JS
  hot-reloads independently of the native binary, so the newer JS (which now calls into MMKV) kept
  running on the older, unlinked native binary.
- Fix: `xcrun simctl uninstall` on every simulator with the app installed, cleared both stale
  `DerivedData` folders, and did a genuinely clean `pod install` + `react-native run-ios` rebuild.
  Re-probing `nativeModuleProxy['MmkvCxx']` after the rebuild confirmed `present`.
- End-to-end proof, not just "no more warning": wrote a probe value through the real native
  `MmkvCxx` module under the exact `app-storage` id/`favorites-storage` key this store uses (via the
  same CDP connection, calling the native module directly — no JS wrapper involved), then did a
  genuine `xcrun simctl terminate` + `simctl launch` (an actual process kill, not a JS reload) and
  read the value back successfully. This is the literal mechanism "survives app restart" depends on,
  exercised for real rather than inferred from the unit-level rehydrate test alone.
- Takeaway for later steps: a stale `DerivedData`/native install can silently make a brand-new
  native dependency look broken at the JS layer while giving a misleadingly soft failure (a console
  warning, not a crash) — worth remembering for milestone 7's actual custom native module, where a
  stale build would be easy to misdiagnose as a JS/spec bug instead.

## Files

**New dependencies** (in DESIGN's stack table already, not previously installed):

- `zustand` (`5.0.15`).
- `react-native-mmkv` (`3.3.3`, **not** the current `4.x` line — v4 moved to Nitro Modules and pulls
  in `react-native-nitro-modules` as a required peer/native dependency; v3 is plain
  JSI/TurboModule-based, matches DESIGN's description, and keeps the native-linking surface this
  step adds to a single module). `cd ios && pod install` run and `ios/Podfile.lock` committed.
- `immer` (`11.1.21`), added after a user request post-review to use it in `favoritesStore`'s
  `toggleFavorite` instead of manual object spread/`delete` for the add/remove branches. Wired via
  zustand's `zustand/middleware/immer`, composed as `persist(immer(creator), persistOptions)` (immer
  innermost, per zustand's own documented ordering). `immer`'s `"react-native"` package-export
  condition points at an ESM build (same pattern as `zustand`'s own export map, see §"API layer"
  decisions in earlier steps), so it needed adding to `jest.config.js`'s `transformIgnorePatterns`
  allowlist alongside the existing RN-ecosystem packages, or Jest can't parse it.

**Create:**

- `src/shared/storage/mmkv.ts` — the singleton `MMKV` instance.
- `src/shared/storage/zustandMmkvStorage.ts` + `.test.ts` — a Zustand `StateStorage` adapter
  (`getItem` / `setItem` / `removeItem`) backed by `mmkv`, for `persist`'s `createJSONStorage`.
- `src/shared/storage/index.ts` — barrel (`mmkv`, `zustandMmkvStorage`).
- `src/features/favorites/store/favoritesStore.ts` + `.test.ts` — `useFavoritesStore`: state
  `{ favoritesById: Record<number, Repo> }` + one action, `toggleFavorite(repo: Repo)`, wrapped in
  `persist` (`name: 'favorites-storage'`, `version: 1`, `storage: createJSONStorage(() => zustandMmkvStorage)`,
  `partialize` to drop the action from the persisted blob). `toggleFavorite` normalizes its argument
  through `toRepoSnapshot` before storing — callers often pass a `RepoDetails` (structurally a
  `Repo` plus `defaultBranch`/`license`/`watchers`, so TS lets it through), and storing it as-is
  would leak those extra fields — and, if captured while still placeholder data, their fake
  placeholder values — into a store typed and persisted as `Record<number, Repo>`. Internal to the
  feature, not re-exported from `features/favorites/index.ts`.
- `src/features/favorites/store/index.ts` — internal barrel.
- `src/features/favorites/hooks/useIsFavorite.ts` + `.test.tsx` — `useIsFavorite(id: number | undefined): boolean`.
- `src/features/favorites/hooks/useToggleFavorite.ts` + `.test.tsx` — `useToggleFavorite(): (repo: Repo) => void`.
- `src/features/favorites/hooks/useFavoritesList.ts` + `.test.tsx` — `useFavoritesList(): Repo[]`,
  derived from the store's record via `useMemo`, sorted alphabetically by name.
- `src/features/favorites/hooks/useFavoriteButtonStyles.ts` — styles hook for `FavoriteButton`.
- `src/features/favorites/hooks/useFavoritesScreenStyles.ts` — styles hook for `FavoritesScreen`.
- `src/features/favorites/hooks/index.ts` — barrel (internal — `useIsFavorite`/`useToggleFavorite`
  are only consumed by `FavoriteToggle` inside this feature now; nothing outside it needs them
  directly anymore).
- `src/features/favorites/components/FavoriteButton.tsx` + `.test.tsx` — presentational
  (`{ isFavorite: boolean; onPress: () => void; compact?: boolean }`): icon-only when `compact`
  (for overlaying on a `RepoCard`), icon + text label otherwise (for `RepoDetailsScreen`'s content
  flow). Takes state in, reports the press out — doesn't read the store itself.
- `src/features/favorites/components/FavoriteToggle.tsx` + `.test.tsx` — the one place this feature
  reads the store directly: `FavoriteToggle({ repo: Repo; compact?: boolean })` wires
  `useIsFavorite`/`useToggleFavorite` into `FavoriteButton`. This is the feature's public
  composition surface — `app/navigation` renders it wherever `features/repos` needs a favorite
  affordance.
- `src/features/favorites/components/index.ts` — barrel.
- `src/features/favorites/screens/FavoritesScreen.tsx` + `.test.tsx` — reads `useFavoritesList()`,
  renders a `FlashList<Repo>` of `RepoCard`s (same card used on Explore, with prefetch-on-press-in
  via `usePrefetchRepoDetails` from `@features/repos`, matching Explore's behavior per §6.1), empty
  state when there are no favorites, navigates to `RepoDetails` on press. Takes an optional
  `renderFavoriteToggle?: (repo: Repo) => React.ReactNode` prop, threaded into each `RepoCard`. No
  loading/error states: this screen reads only local Zustand/MMKV state (synchronous, no network),
  so those states don't apply here.
- `src/features/favorites/screens/index.ts` — barrel.

**Change:**

- `src/features/favorites/index.ts` — currently `export {}`; export `FavoritesScreen` and
  `FavoriteToggle` (the feature's full public surface — `FavoriteButton` and the raw hooks stay
  internal now that `FavoriteToggle` wraps them).
- `src/features/repos/components/RepoCard.tsx` + its test — new optional prop
  `renderFavoriteToggle?: (repo: Repo) => React.ReactNode`. Restructured: an outer wrapper `View`
  (carries the margin that used to live on the card's own `Pressable`) now holds the card's
  `Pressable` and, as a **sibling**, an absolutely-positioned corner slot for the toggle — not
  nested inside the card's `Pressable`, so the two touch targets don't fight each other (same
  pattern as the clear buttons on `OrgSearchInput`/`NameFilterInput` from milestone 5).
- `src/features/repos/hooks/useRepoCardStyles.ts` — split `container`'s margin into a new
  `wrapper` style (`position: 'relative'`); added `favoriteToggle` (`position: 'absolute'`, top
  right).
- `src/features/repos/screens/ExploreScreen.tsx` + its test — new optional
  `ExploreScreenProps.renderFavoriteToggle`, threaded into `RepoCard`.
- `src/features/repos/screens/RepoDetailsScreen.tsx` + its test — new optional
  `RepoDetailsScreenProps.renderFavoriteToggle?: (repoDetails: RepoDetails) => React.ReactNode`,
  called with `repoDetails` and rendered as the last content element (matching §6.3's literal
  content order, which lists "favorite toggle" after the created/updated dates). No more
  `@features/favorites` import at all — see **Revised during review**.
- `src/features/repos/index.ts` / `screens/index.ts` — export the two new `*ScreenProps` types, and
  export `usePrefetchRepoDetails` (now needed by `FavoritesScreen` too).
- `src/app/navigation/MainTabs.tsx` — replace `FavoritesPlaceholder` with `FavoritesScreen` wrapped
  in `ScreenErrorBoundary` (same pattern as `ExploreScreen`); both `ExploreScreenWithBoundary` and
  `FavoritesScreenWithBoundary` pass a shared `renderCardFavoriteToggle` (renders `<FavoriteToggle
repo={repo} compact />`) as `renderFavoriteToggle`. This is the one file that imports both
  `@features/repos` and `@features/favorites`.
- `src/app/navigation/RootStack.tsx` — `RepoDetailsScreenWithBoundary` passes
  `renderDetailsFavoriteToggle` (renders `<FavoriteToggle repo={repoDetails} />`, non-compact) as
  `renderFavoriteToggle`.
- `src/app/navigation/MainTabs.test.tsx` — the "switches to the Favorites placeholder" test now
  mocks `@features/favorites` (stub `FavoritesScreen`, like the existing `@features/repos` stub for
  Explore) and asserts the stub renders, instead of the "Coming in a later milestone." copy.
- `jest.setup.js` — **no mock added.** `react-native-mmkv` 3.3.3 already detects `JEST_WORKER_ID`
  and swaps in its own in-memory mock (`createMMKV.mock.ts`) — an earlier draft of this step added a
  hand-written duplicate here; removed during review as redundant (and less faithful: it didn't
  implement `getBoolean`/`getNumber`/`contains`/`clearAll`).
- `jest.config.js` — added `immer` to `transformIgnorePatterns`'s allowlist (see Files' dependency
  note above).
- `package.json` — add `zustand`, `react-native-mmkv`, `immer`.

## Public APIs

- `shared/storage`: `mmkv: MMKV`; `zustandMmkvStorage: StateStorage`.
- `features/favorites`: `FavoritesScreen({ renderFavoriteToggle? }): JSX.Element`;
  `FavoriteToggle({ repo: Repo; compact?: boolean }): JSX.Element`.
- `features/repos` (additions this step): `RepoCard`'s `renderFavoriteToggle?: (repo: Repo) => ReactNode`
  prop; `ExploreScreenProps.renderFavoriteToggle`; `RepoDetailsScreenProps.renderFavoriteToggle?: (repoDetails: RepoDetails) => ReactNode`;
  `usePrefetchRepoDetails` now exported from the feature barrel.

## Test list

**`zustandMmkvStorage.test.ts`:** `getItem`/`setItem`/`removeItem` round-trip, `null` for an unset
key.

**`favoritesStore.test.ts`** (reset `useFavoritesStore.setState(...)` and `mmkv.delete('favorites-storage')`
in `beforeEach`):

- `toggleFavorite` adds a repo not yet favorited; removes one that already is; keeps two different
  repos independently.
- strips fields that aren't part of `Repo` (e.g. a `RepoDetails`) before storing.
- persists to MMKV under `version: 1`, with the action excluded from the serialized blob.
- rehydrates favorites already on disk via `useFavoritesStore.persist.rehydrate()`.

**`useIsFavorite.test.tsx` / `useToggleFavorite.test.tsx` / `useFavoritesList.test.tsx`:** add /
remove / independent-ids coverage per hook; `useFavoritesList` additionally covers the empty case,
sort order, and re-rendering on both add and remove.

**`FavoriteButton.test.tsx`:** labeled "Add to favorites" / "Remove from favorites" by `isFavorite`;
calls `onPress`.

**`FavoriteToggle.test.tsx`:** reflects the store's current state for the given repo; toggles the
store when pressed.

**`RepoCard.test.tsx`** (additions): renders nothing extra when `renderFavoriteToggle` is omitted;
renders the slot's output, called with the repo, when provided; pressing the slot's own pressable
does not trigger the card's `onPress` (sibling pressables, not nested).

**`ExploreScreen.test.tsx` / `FavoritesScreen.test.tsx`** (additions): `renderFavoriteToggle` passed
through to each card, called with that repo. `FavoritesScreen` additionally covers: empty message,
one card per favorite, navigating to `RepoDetails` on press, prefetch-on-press-in.

**`RepoDetailsScreen.test.tsx`** (changed from the original plan — see **Revised during review**):
the screen only calls whatever `renderFavoriteToggle` it's given, with the loaded `repoDetails` —
covered by: calls it with `repoDetails` and renders its output once loaded; does not call it while
there's no `repoDetails` yet (skeleton/error); renders normally when the prop is omitted. (No store
interaction here anymore — that's `FavoriteToggle`'s job, covered in `features/favorites`.)

**`MainTabs.test.tsx`** (change): "switches to Favorites" now asserts the (mocked) `FavoritesScreen`
stub renders, not the "Coming in a later milestone." copy.

## Out of scope

- The React Query cache persister (`persistQueryClient`) that also lives in `shared/storage` per
  §3.2 — that's milestone 8 ("Offline").
- `DeviceNetwork` native module — milestone 7.

## Risks / open questions

- **Opening a favorited repo's Details while offline still shows a skeleton, then a network error.**
  §6.1 says the Favorites tab "works offline" and §11 says favorites "always work offline" — true
  for the Favorites _list_ (pure local Zustand/MMKV read), but `RepoDetailsScreen`'s
  `placeholderData` (`findCachedRepo` in `useRepoDetails.ts`) only searches cached React Query
  org-list results, never the favorites snapshot. A cold start offline, opening a favorite, still
  hits the network and fails. Fixing this properly needs `useRepoDetails` to also accept favorites
  data as a placeholder source, which is the same cross-feature-awareness problem this step's
  `renderFavoriteToggle` slot was built to avoid — so it's deferred rather than patched around here.
  Full offline support (the persisted React Query cache) is milestone 8's explicit job; worth
  revisiting then.
- **`migrate` isn't implemented yet.** DESIGN §8 says persisted state is "versioned (`version` +
  `migrate`)". `version: 1` is in place now; `migrate` only has meaning once there's a prior version
  to migrate _from_, so it's added when the shape actually changes, not speculatively now.
- Favorites list order (alphabetical by name) isn't specified in DESIGN — a plain, deterministic
  choice; `Object.values()` on an id-keyed record would otherwise sort by numeric id, which doesn't
  track insertion order anyway.
- The `renderFavoriteToggle` slot pattern (repeated across `RepoCard`, `ExploreScreen`,
  `FavoritesScreen`, `RepoDetailsScreen`) is more wiring than a direct import would be — it's the
  cost of keeping `features/repos` unaware of `features/favorites`. If a third feature needs the
  same kind of per-repo affordance later, worth a shared "slot" convention rather than one-off props
  each time.

## Deviations from DESIGN.md

None. `zustand` and `react-native-mmkv` are already named in DESIGN's stack table (§2) and
architecture (§3.2); this step is their first real usage, not a new addition requiring a doc update.
