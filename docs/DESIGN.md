# GitHub Explorer — Design Document

> React Native Tech Lead home assignment. A React Native CLI app (no Expo) that explores public GitHub organizations through the public GitHub REST API.

| | |
|---|---|
| **Status** | Draft — approved for implementation |
| **Scope** | ~5–6 hours of implementation |
| **Related docs** | `DECISIONS.md`, `AI_USAGE.md`, `docs/steps/*`, `docs/ai-log.md` |

---

## 1. Overview & goals

The user types a GitHub organization (e.g. `facebook`, `microsoft`, `vercel`), browses its repositories in an infinite list, filters them by name, opens a details screen, and marks favorites that survive app restarts. The app works without authentication, handles network/API/rate-limit errors gracefully, and keeps showing the last successful data while offline.

**Goals**
- Production-quality architecture that scales with features and team size.
- Clear separation of **server state**, **client state** and **persistence**.
- A real **TurboModule** (Kotlin + Swift) that the app actually depends on.
- Tests shipped with every step; lint, type-check and tests enforced in CI.
- Transparent, documented use of AI.

**Non-goals**
- Authentication / private repositories / write operations.
- Pixel-perfect design, i18n, E2E tests (see [Future work](#17-future-work)).

---

## 2. Tech stack

| Concern | Choice | Why (short) |
|---|---|---|
| Framework | React Native CLI (latest stable), **New Architecture on** | Required (no Expo); New Arch enables TurboModules + Codegen |
| Language | TypeScript, `strict: true` | Safety, self-documenting APIs |
| HTTP | Native `fetch` + small wrapper | Built-in, supports `AbortSignal`, zero dependencies |
| Server state | TanStack React Query | Caching, pagination, retries, cancellation, offline |
| Client state | Zustand | Tiny, no boilerplate, selector-based re-renders |
| Persistence | react-native-mmkv | Synchronous, very fast key-value storage |
| Navigation | React Navigation v7 (native-stack + bottom-tabs) | De-facto standard, native transitions, typed routes |
| Lists | @shopify/flash-list v2 | Cell recycling for long infinite lists |
| Testing | Jest + React Native Testing Library | Unit, hook and component tests |
| Quality | ESLint (`@react-native` config) + Prettier + Husky/lint-staged | Consistent code, checks before commit |
| CI | GitHub Actions | lint + typecheck + test on every PR |

---

## 3. Architecture

### 3.1 Principles
- **Feature-based** structure. Inside each feature, code is split by role: `api / hooks / components / screens / store`.
- **One-way dependencies:** `screens → hooks → api / store → shared`. Never the other way.
- Features import from `shared/` and from other features **only through their `index.ts`** (public API), never their internals.
- **Screens** compose hooks and components — no fetch logic.
- **Components** are presentational — data in via props, events out via callbacks.
- **API DTOs never leave `api/`** — mappers convert them to domain models.
- Tests live next to the code: `Foo.tsx` + `Foo.test.tsx`.

### 3.2 Folder structure

```
src/
  app/                    App.tsx, providers (QueryClient, persister, SafeArea, Theme)
    navigation/           RootStack, MainTabs, typed route params, linking config
  features/
    repos/
      api/                reposApi.ts (endpoints), dto.ts, mappers.ts, queryKeys.ts
      hooks/              useOrgRepos (infinite), useRepoDetails, useRepoFilter
      components/         RepoCard, RepoStats, OrgSearchInput, RepoFilterInput, RepoCardSkeleton
      screens/            ExploreScreen, RepoDetailsScreen
      types.ts            Repo, RepoDetails (domain models)
      index.ts            public API of the feature
    favorites/
      store/              favoritesStore (Zustand + MMKV persist)
      hooks/              useIsFavorite, useToggleFavorite
      components/         FavoriteButton
      screens/            FavoritesScreen
    device/
      native/             typed JS wrapper around the TurboModule
      store/              networkStore (online flag)
      hooks/              useNetworkStatus, useDeviceInfo
      components/         OfflineBanner, DeviceInfoSection
    settings/
      store/              settingsStore (theme mode, Zustand + MMKV persist)
      screens/            SettingsScreen (theme picker + DeviceInfoSection)
  shared/
    api/                  httpClient.ts (fetch wrapper), errors.ts (typed errors), rateLimit.ts
    storage/              mmkv instance, Zustand storage adapter, React Query persister
    components/           Screen, Text, Icon, ErrorView, EmptyView, LoadingView, ListFooterLoader, ErrorBoundary
    hooks/                useDebounce
    utils/                formatDate, formatRelativeTime, formatCompactNumber, parseLinkHeader
    theme/                tokens (colors, spacing, typography), ThemeProvider, useTheme, makeStyles
    logger/               logger abstraction (console in dev, ready for Sentry)
specs/
  NativeDeviceNetwork.ts  Codegen spec for the TurboModule
android/app/src/main/java/.../devicenetwork/   Kotlin implementation
ios/DeviceNetwork/                             Swift implementation (+ ObjC++ glue)
```

Path aliases `@app/*`, `@features/*`, `@shared/*` via `tsconfig.json` + `babel-plugin-module-resolver`.

### 3.3 Data flow

```
 ┌──────────── UI ─────────────┐
 │ Screens  →  Components      │
 └─────┬────────────────┬──────┘
       │ hooks          │ selectors
 ┌─────▼──────┐   ┌─────▼──────┐   ┌─────────────────────┐
 │ React Query│   │  Zustand   │◄──│ DeviceNetwork       │
 │ (server)   │   │  (client)  │   │ TurboModule (events)│
 └─────┬──────┘   └─────┬──────┘   └─────────────────────┘
       │ fetch          │ persist
 ┌─────▼──────┐   ┌─────▼──────────────────────┐
 │ httpClient │   │ MMKV (favorites, settings, │
 │ GitHub API │   │ persisted query cache)     │
 └────────────┘   └────────────────────────────┘
```

---

## 4. State management

Three tools, each with one job:

- **React Query — server state.** Everything that comes from GitHub (repo lists, repo details). It handles caching, pagination (`useInfiniteQuery`), background refetch, retries, request cancellation and online/offline awareness. We don't copy server data into Zustand.
- **Zustand — client state.** State the app owns: favorites, theme mode, online status. Small stores, no providers or boilerplate, and components subscribe with selectors so they re-render only when their slice changes.
- **MMKV — persistence.** Fast synchronous storage used as the backend for Zustand's `persist` middleware and for the React Query cache persister. Synchronous reads mean persisted state is available on the first render, with no loading flash.

---

## 5. API layer

### 5.1 HTTP client — native `fetch`
We use the built-in `fetch` instead of axios. It supports `AbortSignal`, which React Query passes to every query function, so cancellation works without extra code, and it adds no dependency. Axios's main extra (interceptors) isn't needed for a read-only, unauthenticated API.

`shared/api/httpClient.ts` adds:
- base URL `https://api.github.com`
- headers `Accept: application/vnd.github+json`, `X-GitHub-Api-Version: 2022-11-28`
- timeout (combined with the caller's `AbortSignal`)
- JSON parsing and status → **typed error** mapping
- reading rate-limit headers (`X-RateLimit-Remaining`, `X-RateLimit-Reset`)

### 5.2 Endpoints

| Use | Endpoint |
|---|---|
| Org repos (paged) | `GET /orgs/{org}/repos?per_page=30&page={n}&sort=updated` |
| Repo details | `GET /repos/{owner}/{repo}` |

The next page is read from the `Link` response header (`rel="next"`) via `parseLinkHeader`; when there is no `next`, `hasNextPage` is `false`.

### 5.3 Errors

| Error | When | UX | Retry |
|---|---|---|---|
| `NetworkError` | fetch throws / timeout | "No connection" + Retry | yes (backoff) |
| `NotFoundError` | 404 | "Organization not found" | no |
| `RateLimitError` | 403/429 with `X-RateLimit-Remaining: 0` | "Rate limit reached, try again at HH:MM" | no automatic retry |
| `ApiError` | other 4xx/5xx | Generic message + Retry | 5xx only |

Aborted requests (`AbortError`) are not shown as errors.

### 5.4 Response mapping
`dto.ts` types the raw GitHub JSON; `mappers.ts` converts it to small domain models (`Repo`, `RepoDetails`) with camelCase fields, `Date`-safe values and explicit `null`s (e.g. no license, no description). UI code depends only on domain models, so API changes stay inside `api/`.

### 5.5 Query keys
A query key factory keeps keys consistent and easy to invalidate:
```ts
repoKeys.all            // ['repos']
repoKeys.list(org)      // ['repos', 'list', org]
repoKeys.detail(o, r)   // ['repos', 'detail', o, r]
```

---

## 6. Navigation & screens

### 6.1 Structure (React Navigation v7)
```
RootStack (native-stack)
 ├─ MainTabs (bottom-tabs)
 │   ├─ Explore     — org search + repo list + name filter
 │   ├─ Favorites   — saved repos (works offline)
 │   └─ Settings    — theme picker + Device section (native module data)
 └─ RepoDetails     — pushed over the tabs
```

- **One `RepoDetails` route**, registered once in the root stack, reachable from Explore, Favorites and a deep link.
- It is a **regular pushed screen with back** (header back button, iOS swipe-back, Android back), not a modal: it's drill-down content, not a separate task.
- It opens over the tab bar; the tabs stay mounted underneath, so going back returns to the same list and scroll position.
- Params are IDs only: `navigate('RepoDetails', { owner, repo })` — serializable and deep-linkable (`githubexplorer://repo/:owner/:repo`).
- `RepoDetailsScreen` uses the list item already in the React Query cache as `placeholderData`, so the header renders instantly, then fills in watchers, license, default branch, etc. Details are **prefetched on press-in** of a card.
- Route params are fully typed (`RootStackParamList`).

### 6.2 Screen states
Each list/detail screen handles:

| State | UI |
|---|---|
| Loading (first load) | Skeleton cards |
| Error | `ErrorView` with message + **Retry** |
| Rate limited | Message with reset time, no Retry until then |
| Empty | `EmptyView` ("This organization has no public repositories") |
| Refreshing | Pull-to-refresh (`refetch`) |
| Loading more | Footer spinner (`fetchNextPage` on end reached) |
| Offline | `OfflineBanner` + last successful data |

### 6.3 Repository item (list)
name · description · main language · ⭐ stars · forks · open issues · "updated 3 days ago".

### 6.4 Repository details
full name · description · stars · forks · watchers · open issues · default branch · license (if any) · repository URL (opens with `Linking.openURL`) · created date · updated date · favorite toggle.

---

## 7. Search & filter

Two inputs, both designed to avoid unnecessary API calls:

- **Organization input** — the org query runs only after the user stops typing (debounced, ~500 ms) or presses *Search*. Changing the org cancels the in-flight request (React Query aborts it through `AbortSignal`).
- **Name filter** — filters the **already loaded** repos on the client: `useDebounce` (~250 ms) + `useMemo`. **No API calls while typing.**

**At 50,000 repositories** client-side filtering stops being meaningful (only loaded pages are searchable). We would switch the filter to GitHub's Search API — `GET /search/repositories?q=org:{org}+{term}+in:name` — debounced, cancelable and paginated, with its own (lower) rate limit handled the same way.

---

## 8. Favorites

- `favoritesStore` (Zustand + `persist` on MMKV) stores a **snapshot** of each favorite repo (`Record<id, Repo>`), not just IDs, so the Favorites screen works offline and without extra API calls.
- Hooks: `useIsFavorite(id)` (selector → only that card re-renders) and `useToggleFavorite()`.
- Store state is versioned (`version` + `migrate`) so the persisted shape can evolve safely.

---

## 9. Theming & styling

- Light and dark token sets in `shared/theme`: colors, spacing, typography, radii.
- Theme mode `system | light | dark`, default `system` (`useColorScheme`). The user's choice is saved in `settingsStore` (Zustand + MMKV) and survives restart.
- The same theme drives `NavigationContainer` (headers, tab bar) and `StatusBar`.
- **`makeStyles` → `useStyles()` hook:**

```ts
const useStyles = makeStyles(theme => ({
  card:  { backgroundColor: theme.colors.surface, padding: theme.spacing.md },
  title: { color: theme.colors.text, ...theme.typography.title },
}));

function RepoCard() {
  const styles = useStyles();
  // ...
}
```

`makeStyles` calls `StyleSheet.create` **once per theme** and caches the result at module level, so every instance of a component (e.g. all list cards) shares the same style object, and styles rebuild only when the theme changes. This is cheaper than a `useMemo` per component instance and keeps components free of theme plumbing.

- **UI libraries are minimal — no UI kit.** Only what navigation requires (`react-native-screens`, `react-native-safe-area-context`), FlashList, and a vector-icon package. Components are hand-built in `shared/components`.
- **Dates & numbers:** `Intl.DateTimeFormat` for absolute dates. Hermes only partly supports `Intl` (`RelativeTimeFormat` and compact number notation are unreliable), so `formatRelativeTime` ("3 days ago") and `formatCompactNumber` ("12.3k") are small hand-written, unit-tested helpers. No moment (deprecated, heavy); date-fns is the fallback if needs grow.

---

## 10. Native module — `DeviceNetwork` (TurboModule)

The assignment asks for a native module with multiple async methods and at least one event, without prescribing what it does. We chose **network + device state** because the app genuinely needs it: it powers the offline experience and adds context to error reports.

### 10.1 Spec (Codegen)

```ts
// specs/NativeDeviceNetwork.ts
import type { TurboModule, CodegenTypes } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export type NetworkState = {
  isConnected: boolean;
  type: string;            // 'wifi' | 'cellular' | 'ethernet' | 'none' | 'unknown'
  isExpensive: boolean;
};

export type DeviceInfo = {
  model: string;
  osVersion: string;
  appVersion: string;
  buildNumber: string;
};

export interface Spec extends TurboModule {
  getNetworkState(): Promise<NetworkState>;
  getDeviceInfo(): Promise<DeviceInfo>;
  isLowPowerMode(): Promise<boolean>;
  startNetworkMonitoring(): Promise<void>;
  stopNetworkMonitoring(): Promise<void>;

  readonly onNetworkStatusChanged: CodegenTypes.EventEmitter<NetworkState>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('DeviceNetwork');
```

- **Async:** every method returns a `Promise`; Codegen generates native signatures that receive a promise (`Promise` in Kotlin, `resolve`/`reject` blocks on iOS). No synchronous methods — nothing blocks the JS thread.
- **Event:** typed Codegen `EventEmitter` (the version support is verified at scaffold time; fallback is `NativeEventEmitter` with `addListener`/`removeListeners`).
- **Why a TurboModule (not the legacy bridge):** calls go through JSI instead of serialized bridge messages, the module is loaded lazily, and Codegen generates typed native interfaces from one TS spec, so JS and native can't drift apart.

### 10.2 Native implementations

| Method | Android (Kotlin) | iOS (Swift) |
|---|---|---|
| `getNetworkState` | `ConnectivityManager` + `NetworkCapabilities` | `NWPathMonitor` current path |
| `getDeviceInfo` | `Build.*`, `PackageManager` | `UIDevice`, `Bundle.main` |
| `isLowPowerMode` | `PowerManager.isPowerSaveMode` | `ProcessInfo.isLowPowerModeEnabled` |
| `start/stopNetworkMonitoring` | register/unregister `NetworkCallback` | start/cancel `NWPathMonitor` on a background queue |
| `onNetworkStatusChanged` | emitted from `NetworkCallback` | emitted from `pathUpdateHandler` |

Monitoring is idempotent (start twice = one listener), stops when the last JS subscriber is removed, and native callbacks are cleaned up on module invalidation to avoid leaks.

### 10.3 How the app uses it
- `features/device/native` wraps the module with typed functions and a `subscribe` helper (also easy to mock in Jest).
- On app start: `startNetworkMonitoring()`; each event updates `networkStore.isOnline` **and** React Query's `onlineManager.setOnline(...)`.
- Result: an `OfflineBanner`, queries pause while offline and refetch on reconnect, no wasted retries.
- `getDeviceInfo()` is attached to logged errors (monitoring context) and shown in **Settings → Device**, together with the live network state and low-power mode — a visible demo of the module for reviewers.

---

## 11. Offline strategy (bonus)

Requirement: keep working with the last successful data while offline.

- The React Query cache is persisted to MMKV (`persistQueryClient` with an MMKV-backed persister); only successful queries are persisted, with a max age (e.g. 24 h) and a cache buster tied to the app version.
- On launch the cache is restored synchronously → the last viewed org's list and details render immediately.
- While offline (from `DeviceNetwork` events): queries are paused, the list shows cached data + "You're offline — showing data from 10:42", pull-to-refresh explains it's offline.
- On reconnect: paused queries resume and stale data refetches automatically.
- Favorites are already stored as snapshots, so they always work offline.

---

## 12. Performance

- **FlashList v2** instead of FlatList. FlatList creates a new component for each row and unmounts rows far off-screen; with a long infinite list this costs CPU and memory and can show blank areas during fast scrolling. FlashList **recycles** row components, so memory stays flat no matter how long the list gets. v2 is pure JS on the New Architecture and a near drop-in replacement. For one 30-item page FlatList would be fine — FlashList matters as infinite scroll grows and in the 50k-repo scenario.
- `RepoCard` is `memo`ized; `renderItem`, `keyExtractor` and callbacks are stable (`useCallback`).
- Zustand selectors (`useIsFavorite(id)`) — toggling one favorite re-renders one card, not the list.
- Filtering is `useMemo` over debounced input — no work on every keystroke.
- Styles shared per theme via `makeStyles` (no per-instance style objects).
- React Query `staleTime` (e.g. 5 min for lists) avoids refetching on every focus/mount; `gcTime` bounds memory.
- Prefetch on press-in makes the details screen feel instant.
- Pagination with `per_page=30` keeps payloads small.

---

## 13. Error handling & resilience

- Typed errors (§5.3) → consistent UX through `ErrorView`.
- **Error boundaries:** one at app level (fatal fallback with "Restart"), one per screen ("Try again" resets the boundary and the query).
- **Logger abstraction** (`shared/logger`): `logger.error(error, context)` → console in dev; a single place to plug in Sentry later. Context includes device info from the native module.

---

## 14. Accessibility

- `accessibilityRole` / `accessibilityLabel` on cards, buttons and the favorite toggle (e.g. "react, 220k stars, add to favorites").
- Respect system font scaling; minimum 44 pt touch targets with `hitSlop`.
- Tests query by role/label (`getByRole`), which doubles as an accessibility check.

---

## 15. Testing strategy

**Rule: every step ships its tests.** CI blocks merging if lint, typecheck or tests fail.

| Layer | What | How |
|---|---|---|
| Utils | `parseLinkHeader`, formatters, `makeStyles` caching | Jest unit tests |
| API | `httpClient` status → error mapping, rate-limit parsing, mappers | Jest with mocked `fetch` |
| Stores | favorites/settings/network stores, persistence | Jest with in-memory MMKV mock |
| Hooks | `useOrgRepos`, `useRepoDetails`, `useDebounce`, `useRepoFilter` | `renderHook` + test `QueryClient` |
| Components / screens | loading / error / empty / retry / pagination / favorite toggle | React Native Testing Library |
| Native module | JS wrapper & event subscription | Jest mock of the TurboModule |

Native unit tests (JUnit/XCTest) and E2E (Maestro/Detox) are future work.

---

## 16. Code quality, tooling & workflow

- **TypeScript strict**, no `any` (ESLint rule).
- **ESLint** (`@react-native` config + React Hooks rules) and **Prettier**.
- **Husky + lint-staged**: lint and format staged files before each commit.
- **Scripts:** `npm run lint`, `npm run typecheck` (`tsc --noEmit`), `npm test`.
- **CI (GitHub Actions):** lint + typecheck + test (with coverage) on every PR.
- **Conventional commits**, **one branch + PR per milestone**, using `.github/pull_request_template.md`.

### AI-assisted workflow (in the repo)
- `CLAUDE.md` — project rules for the AI assistant.
- `.claude/skills/gen-step` — `/gen-step <N>` runs one milestone: design → implement → tests → lint/typecheck/test → review → AI log → commit, push & PR, with user approval gates after the design and before pushing.
- `.claude/agents/code-reviewer` — read-only reviewer agent running on a **different, stronger model** (Opus) than the implementer (Sonnet), checking each diff against this document.
- `docs/steps/NN-*.md` (step plans) and `docs/ai-log.md` (what AI produced, what was changed or rejected, how it was validated) — the source for `AI_USAGE.md`.

### Implementation milestones

| # | Milestone | Key output |
|---|---|---|
| 1 | Scaffold + tooling + CI | RN CLI app, TS strict, ESLint/Prettier, Husky, Jest, aliases, CI, folder skeleton |
| 2 | API layer | `httpClient`, typed errors, rate limit, `parseLinkHeader`, DTOs, mappers, query keys |
| 3 | Repo list | Providers, navigation, theme + `makeStyles`, ExploreScreen with all list states, pagination, refresh |
| 4 | Repo details | RepoDetailsScreen, placeholder data, prefetch, open URL |
| 5 | Search & filter | Debounced org input, client-side name filter |
| 6 | Favorites | Zustand + MMKV store, toggle, Favorites tab |
| 7 | Native module | Codegen spec, Kotlin + Swift, events, OfflineBanner, Settings → Device |
| 8 | Offline | Persisted query cache, offline UX |
| 9 | Docs | `README.md`, `DECISIONS.md`, `AI_USAGE.md` |

---

## 17. Monitoring in production (bonus)

- **Crash & error reporting:** Sentry (`@sentry/react-native`) for native crashes, JS errors and unhandled promise rejections, with source maps uploaded in CI and device info from `DeviceNetwork` as context.
- **Performance:** app start time, screen load time, slow/frozen frames, API latency per endpoint.
- **API health:** error rate by type (network / 404 / rate limit / 5xx), rate-limit hits per session — tells us when to add auth or ETag caching.
- **Release health:** crash-free sessions/users per version, staged rollouts with alerting on regressions.
- **Product analytics:** searches, details opened, favorites added, offline sessions — to guide priorities.

---

## 18. Future work

- **ETag conditional requests** — `If-None-Match` with cached ETags; GitHub `304` responses don't count against the rate limit.
- **Rate-limit countdown UX** — live "resets in mm:ss" and auto-retry at reset.
- **MSW** for more realistic network tests (headers, pagination, 304).
- **ESLint-enforced feature boundaries** (`eslint-plugin-boundaries`).
- **Recent org searches** as quick chips.
- **Server-side search** for very large orgs (§7).
- **E2E tests** with Maestro or Detox; **native unit tests** (JUnit/XCTest) and native builds in CI.
- **Sentry wiring**, i18n, sort options, optional GitHub sign-in to raise the rate limit.

---

## 19. Risks & trade-offs

| Risk / trade-off | Mitigation |
|---|---|
| 60 requests/hour without auth | Caching (`staleTime`), persisted cache, no retries on rate limit, clear reset time; ETag as future work |
| Client-side filter only covers loaded pages | Documented; Search API for large orgs |
| FlashList adds a dependency | Small, widely used, near drop-in; clear win for long lists |
| Codegen `EventEmitter` requires a recent RN version | Verified at scaffold; fallback to `NativeEventEmitter` |
| Hand-written formatters | Small, fully unit-tested; date-fns if needs grow |
| No E2E tests in the time box | Strong unit/hook/component coverage; E2E listed as future work |
