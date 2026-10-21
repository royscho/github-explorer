# GitHub Explorer — Design Document

> React Native Tech Lead home assignment. A React Native CLI app (no Expo) that explores public GitHub organizations through the public GitHub REST API.

|                  |                                                                 |
| ---------------- | --------------------------------------------------------------- |
| **Status**       | Draft — approved for implementation                             |
| **Scope**        | ~5–6 hours of implementation                                    |
| **Related docs** | `DECISIONS.md`, `AI_USAGE.md`, `docs/steps/*`, `docs/ai-log.md` |

---

## 1. Overview & goals

The user types a GitHub organization (`facebook`, `vercel`, …), browses its repositories in an infinite list, filters them by name, opens a details screen, and marks favorites that survive restarts. No authentication; network, API and rate-limit errors are handled gracefully; the last successful data keeps showing while offline.

**Goals** — production-quality architecture that scales with features and team size; clear separation of **server state**, **client state** and **persistence**; a real **TurboModule** (Kotlin + Swift) the app actually depends on; tests shipped with every step and enforced in CI; transparent, documented use of AI.

**Non-goals** — auth, private repos, write operations; pixel-perfect design, i18n, E2E tests (see [§18](#18-future-work)).

---

## 2. Tech stack

| Concern      | Choice                                                    | Why (short)                                                 |
| ------------ | --------------------------------------------------------- | ----------------------------------------------------------- |
| Framework    | React Native CLI (latest stable), **New Architecture on** | Required (no Expo); New Arch enables TurboModules + Codegen |
| Language     | TypeScript, `strict: true`                                | Safety, self-documenting APIs                               |
| HTTP         | Native `fetch` + small wrapper                            | Built-in, supports `AbortSignal`, zero dependencies         |
| Server state | TanStack React Query                                      | Caching, pagination, retries, cancellation, offline         |
| Client state | Zustand                                                   | Tiny, no boilerplate, selector-based re-renders             |
| Persistence  | react-native-mmkv                                         | Synchronous, very fast key-value storage                    |
| Navigation   | React Navigation v7 (native-stack + bottom-tabs)          | De-facto standard, native transitions, typed routes         |
| Lists        | @shopify/flash-list v2                                    | Cell recycling for long infinite lists                      |
| Testing      | Jest + React Native Testing Library                       | Unit, hook and component tests                              |
| Quality      | ESLint (`@react-native`) + Prettier + Husky/lint-staged   | Consistent code, checks before commit                       |
| CI           | GitHub Actions                                            | lint + typecheck + test on every PR                         |

---

## 3. Architecture

### 3.1 Principles

- **Feature-based** structure; inside a feature, code is split by role: `api / hooks / components / screens / store`.
- **One-way dependencies:** `screens → hooks → api / store → shared`. Never the other way.
- Features import from `shared/` and from other features **only through their `index.ts`**, never their internals.
- **Screens** compose hooks and components — no fetch logic. **Components** are presentational: data in via props, events out via callbacks.
- **API DTOs never leave `api/`** — mappers convert them to domain models.
- Tests live next to the code (`Foo.tsx` + `Foo.test.tsx`).

### 3.2 Folder structure

- `src/app/` — `App.tsx`, providers (QueryClient, persister, SafeArea, Theme), `navigation/` (RootStack, MainTabs, typed params, linking) and `hooks/` (app-level hooks, e.g. navigation chrome styling).
- `src/features/repos/` — `api/` (endpoints, DTOs, mappers, query keys), `hooks/` (`useOrgRepos`, `useRepoDetails`, `useRepoFilter`), `components/` (RepoCard, RepoStats, OrgSearchInput, RepoFilterInput, RepoCardSkeleton), `screens/` (Explore, RepoDetails), `types.ts`, `index.ts`.
- `src/features/favorites/` — Zustand+MMKV store, `useIsFavorite` / `useToggleFavorite`, FavoriteButton, FavoritesScreen.
- `src/features/device/` — `native/` (typed TurboModule wrapper), network store, `useNetworkStatus` / `useDeviceInfo`, OfflineBanner, DeviceInfoSection.
- `src/features/settings/` — settings store (theme mode), SettingsScreen.
- `src/shared/` — `api/` (httpClient, typed errors, rate limit), `storage/` (MMKV instance, Zustand adapter, Query persister), `components/` (Screen, Text, Icon, Card, ErrorView, EmptyView, LoadingView, ListFooterLoader, ErrorBoundary), `hooks/`, `utils/` (date, number and `Link`-header helpers), `theme/` (tokens, provider, `makeStyles`), `logger/`.
- `specs/NativeDeviceNetwork.ts` — Codegen spec; Kotlin implementation under `android/…/devicenetwork/`, Swift (+ ObjC++ glue) under `ios/DeviceNetwork/`.

Path aliases `@app/*`, `@features/*`, `@shared/*` via `tsconfig.json` + `babel-plugin-module-resolver`.

### 3.3 Data flow

Screens and components read server data through hooks (React Query) and client data through Zustand selectors. React Query fetches via `httpClient` → GitHub API; Zustand persists to MMKV, which also holds the persisted query cache. The `DeviceNetwork` TurboModule pushes network events into the Zustand network store.

---

## 4. State management

Three tools, one job each:

- **React Query — server state.** Everything from GitHub (repo lists, details): caching, pagination (`useInfiniteQuery`), background refetch, retries, cancellation, online/offline awareness. Server data is never copied into Zustand.
- **Zustand — client state.** State the app owns: favorites, theme mode, online status. Small stores, no providers, selector-based subscriptions so a component re-renders only when its slice changes.
- **MMKV — persistence.** Backend for Zustand's `persist` middleware and the React Query persister. Synchronous reads mean persisted state is there on first render, with no loading flash.

---

## 5. API layer

### 5.1 HTTP client — native `fetch`

Built-in `fetch` instead of axios: it supports `AbortSignal` (React Query passes one to every query function, so cancellation is free) and adds no dependency; axios's main extra, interceptors, isn't needed for a read-only unauthenticated API. `shared/api/httpClient.ts` adds the base URL, GitHub `Accept` and API-version headers, a timeout combined with the caller's signal, JSON parsing, status → **typed error** mapping, and reading of the `X-RateLimit-*` headers.

### 5.2 Endpoints

| Use               | Endpoint                                                  |
| ----------------- | --------------------------------------------------------- |
| Org repos (paged) | `GET /orgs/{org}/repos?per_page=30&page={n}&sort=updated` |
| Repo details      | `GET /repos/{owner}/{repo}`                               |

The next page comes from the `Link` header (`rel="next"`); when there is no `next`, `hasNextPage` is `false`.

### 5.3 Errors

| Error            | When                                    | UX                                       | Retry              |
| ---------------- | --------------------------------------- | ---------------------------------------- | ------------------ |
| `NetworkError`   | fetch throws / timeout                  | "No connection" + Retry                  | yes (backoff)      |
| `NotFoundError`  | 404                                     | "Organization not found"                 | no                 |
| `RateLimitError` | 403/429 with `X-RateLimit-Remaining: 0` | "Rate limit reached, try again at HH:MM" | no automatic retry |
| `ApiError`       | other 4xx/5xx                           | Generic message + Retry                  | 5xx only           |

Aborted requests (`AbortError`) are not shown as errors.

### 5.4 Response mapping

`dto.ts` types the raw GitHub JSON; `mappers.ts` converts it to small domain models (`Repo`, `RepoDetails`) with camelCase fields, `Date`-safe values and explicit `null`s (no license, no description). "`Date`-safe" means ISO-8601 strings (`createdAt: string`, `updatedAt: string`), not `Date` instances: `Repo` is persisted as JSON both in the favorites snapshot (§8) and the cached React Query state (§11), and `JSON.parse` can't turn a string back into a `Date` on its own. Formatters parse the string into a `Date` at render time instead. UI code depends only on domain models, so API changes stay inside `api/`.

### 5.5 Query keys

A `queryKeys.ts` factory keeps keys consistent and easy to invalidate: one root key for all repo queries, one per org list, one per owner/repo detail.

---

## 6. Navigation & screens

### 6.1 Structure (React Navigation v7)

A native-stack root holds **MainTabs** (bottom tabs: _Explore_ — org search, repo list, name filter; _Favorites_ — saved repos, works offline; _Settings_ — theme picker + Device section) plus the **RepoDetails** screen pushed over the tabs.

- **One `RepoDetails` route**, registered once in the root stack, reachable from Explore, Favorites and a deep link.
- It's a **regular pushed screen with back** (header button, iOS swipe-back, Android back), not a modal: drill-down content, not a separate task. The tabs stay mounted underneath, so going back returns to the same list and scroll position.
- Params are IDs only (`{ owner, repo }`) — serializable and deep-linkable (`githubexplorer://repo/:owner/:repo`), fully typed via `RootStackParamList`.
- The screen uses the cached list item as `placeholderData` so the header renders instantly, then fills in watchers, license, default branch, etc. Details are **prefetched on press-in** of a card.

### 6.2 Screen states

Each list/detail screen handles:

| State                | UI                                                           |
| -------------------- | ------------------------------------------------------------ |
| Loading (first load) | Skeleton cards                                               |
| Error                | `ErrorView` with message + **Retry**                         |
| Rate limited         | Message with reset time, no Retry until then                 |
| Empty                | `EmptyView` ("This organization has no public repositories") |
| Refreshing           | Pull-to-refresh (`refetch`)                                  |
| Loading more         | Footer spinner (`fetchNextPage` on end reached)              |
| Offline              | `OfflineBanner` + last successful data                       |

### 6.3 Content

- **List item:** name · description · main language · ⭐ stars · forks · open issues · "updated 3 days ago".
- **Details:** full name · description · stars · forks · watchers · open issues · default branch · license (if any) · repository URL (`Linking.openURL`) · created and updated dates · favorite toggle.

---

## 7. Search & filter

Both inputs are designed to avoid unnecessary API calls:

- **Organization input** — the query runs only on an explicit action: pressing _Search_ or submitting via the keyboard. Nothing fires while typing. A submission shorter than 2 characters shows an inline "Enter at least 2 characters" message instead of searching. Changing the org cancels the in-flight request through `AbortSignal`.
- **Name filter** — filters the **already loaded** repos on the client (`useDebounce` ~250 ms + `useMemo`). **No API calls while typing.** Infinite scroll is paused while a filter is active (a short filtered list would otherwise fit the viewport and trigger `onEndReached` repeatedly) — more pages only load once the filter is cleared.

**At 50,000 repositories** client-side filtering stops being meaningful (only loaded pages are searchable). We'd switch to GitHub's Search API (`GET /search/repositories?q=org:{org}+{term}+in:name`) — debounced, cancelable, paginated, with its own lower rate limit handled the same way.

---

## 8. Favorites

- `favoritesStore` (Zustand + `persist` on MMKV) stores a **snapshot** of each favorite repo (`Record<id, Repo>`), not just IDs, so the Favorites screen works offline and without extra API calls.
- `useIsFavorite(id)` is a selector, so toggling re-renders only that card; `useToggleFavorite()` writes.
- Persisted state is versioned (`version` + `migrate`) so the shape can evolve safely.

---

## 9. Theming & styling

- Light and dark token sets in `shared/theme`: colors, spacing, typography, radii, elevation (card shadow/`elevation` per theme, exposed via the shared `Card` component).
- Theme mode `system | light | dark`, default `system` (`useColorScheme`); the choice is saved in `settingsStore` and survives restart. The same theme drives `NavigationContainer` (headers, tab bar) and `StatusBar`.
- **Styles are declared with `makeStyles(theme => …)` and consumed via `useStyles()`.** `makeStyles` calls `StyleSheet.create` **once per theme** and caches it at module level, so every instance of a component (all list cards) shares one style object and styles rebuild only when the theme changes — cheaper than a `useMemo` per instance, and components stay free of theme plumbing. No inline style objects, no hard-coded colors.
- **No UI kit.** Only what navigation requires (`react-native-screens`, `react-native-safe-area-context`), FlashList and `@react-native-vector-icons/ionicons` (TurboModule-based, built for the New Architecture); components are hand-built in `shared/components`.
- **Dates & numbers:** `Intl.DateTimeFormat` for absolute dates. Hermes supports `Intl` only partly (`RelativeTimeFormat` and compact notation are unreliable), so `formatRelativeTime` ("3 days ago") and `formatCompactNumber` ("12.3k") are small hand-written, unit-tested helpers. No moment (deprecated, heavy); date-fns is the fallback if needs grow.

---

## 10. Native module — `DeviceNetwork` (TurboModule)

The assignment asks for a native module with multiple async methods and at least one event, without prescribing what it does. We chose **network + device state** because the app genuinely needs it: it powers the offline experience and adds context to error reports.

### 10.1 Spec (Codegen)

`specs/NativeDeviceNetwork.ts` declares a `TurboModule` named `DeviceNetwork` exposing `getNetworkState()` (connected flag, connection type, "expensive" flag), `getDeviceInfo()` (model, OS version, app version, build number), `isLowPowerMode()`, `startNetworkMonitoring()` / `stopNetworkMonitoring()`, and the event `onNetworkStatusChanged` carrying a network state.

- **Async:** every method returns a `Promise`; Codegen generates the matching native signatures (Kotlin `Promise`, iOS `resolve`/`reject`). No synchronous methods — nothing blocks the JS thread.
- **Event:** a typed Codegen `EventEmitter`; version support is verified at scaffold time, with `NativeEventEmitter` as fallback.
- **Why a TurboModule, not the legacy bridge:** calls go through JSI instead of serialized bridge messages, the module loads lazily, and Codegen generates typed native interfaces from one TS spec, so JS and native can't drift apart.

### 10.2 Native implementations

| Method                        | Android (Kotlin)                              | iOS (Swift)                                        |
| ----------------------------- | --------------------------------------------- | -------------------------------------------------- |
| `getNetworkState`             | `ConnectivityManager` + `NetworkCapabilities` | `NWPathMonitor` current path                       |
| `getDeviceInfo`               | `Build.*`, `PackageManager`                   | `UIDevice`, `Bundle.main`                          |
| `isLowPowerMode`              | `PowerManager.isPowerSaveMode`                | `ProcessInfo.isLowPowerModeEnabled`                |
| `start/stopNetworkMonitoring` | register/unregister `NetworkCallback`         | start/cancel `NWPathMonitor` on a background queue |
| `onNetworkStatusChanged`      | emitted from `NetworkCallback`                | emitted from `pathUpdateHandler`                   |

Monitoring is idempotent (start twice = one listener), stops when the last JS subscriber is removed, and native callbacks are cleaned up on module invalidation to avoid leaks.

### 10.3 How the app uses it

`features/device/native` wraps the module in typed functions plus a `subscribe` helper (easy to mock in Jest). On app start it calls `startNetworkMonitoring()`; each event updates `networkStore.isOnline` **and** React Query's `onlineManager`. The result: an `OfflineBanner`, queries paused while offline and refetched on reconnect, no wasted retries. `getDeviceInfo()` is attached to logged errors and shown in **Settings → Device** with live network state and low-power mode — a visible demo of the module for reviewers.

---

## 11. Offline strategy (bonus)

Requirement: keep working with the last successful data while offline.

- The React Query cache is persisted to MMKV (`persistQueryClient` with an MMKV-backed persister): successful queries only, a max age (e.g. 24 h) and a cache buster tied to the app version.
- On launch the cache is restored synchronously, so the last viewed list and details render immediately.
- While offline (from `DeviceNetwork` events) queries pause, the list shows cached data plus "You're offline — showing data from 10:42", and pull-to-refresh explains why it can't refresh.
- On reconnect, paused queries resume and stale data refetches automatically. Favorites are snapshots, so they always work offline.

---

## 12. Performance

- **FlashList v2** instead of FlatList: FlatList creates a component per row and unmounts far-off rows, which costs CPU and memory on a long infinite list and can show blank areas during fast scrolling. FlashList **recycles** rows, so memory stays flat however long the list gets; v2 is pure JS on the New Architecture and a near drop-in. For one 30-item page FlatList would do — FlashList matters as infinite scroll grows and in the 50k-repo scenario.
- `RepoCard` is `memo`ized, with stable `renderItem`, `keyExtractor` and callbacks.
- Zustand selectors (`useIsFavorite(id)`): toggling one favorite re-renders one card, not the list.
- Filtering is `useMemo` over debounced input — no work per keystroke.
- Styles shared per theme via `makeStyles`; React Query `staleTime` (e.g. 5 min for lists) avoids refetching on every focus/mount and `gcTime` bounds memory.
- Prefetch on press-in makes details feel instant; `per_page=30` keeps payloads small.

---

## 13. Error handling & resilience

- Typed errors (§5.3) → consistent UX through `ErrorView`.
- **Error boundaries:** one at app level (fatal fallback with "Restart"), one per screen ("Try again" resets boundary and query).
- **Logger abstraction** (`shared/logger`): `logger.error(error, context)` goes to console in dev and is the single place to plug in Sentry later; context includes device info from the native module.

---

## 14. Accessibility

- `accessibilityRole` / `accessibilityLabel` on cards, buttons and the favorite toggle (e.g. "react, 220k stars, add to favorites").
- System font scaling respected; minimum 44 pt touch targets via `hitSlop`.
- Tests query by role/label, which doubles as an accessibility check.

---

## 15. Testing strategy

**Rule: every step ships its tests.** CI blocks merging if lint, typecheck or tests fail.

| Layer                | What                                                            | How                               |
| -------------------- | --------------------------------------------------------------- | --------------------------------- |
| Utils                | `Link` header parsing, formatters, `makeStyles` caching         | Jest unit tests                   |
| API                  | status → error mapping, rate-limit parsing, mappers             | Jest with mocked `fetch`          |
| Stores               | favorites/settings/network stores, persistence                  | Jest with in-memory MMKV mock     |
| Hooks                | `useOrgRepos`, `useRepoDetails`, `useDebounce`, `useRepoFilter` | `renderHook` + test `QueryClient` |
| Components / screens | loading / error / empty / retry / pagination / favorite toggle  | React Native Testing Library      |
| Native module        | JS wrapper & event subscription                                 | Jest mock of the TurboModule      |

Native unit tests (JUnit/XCTest) and E2E (Maestro/Detox) are future work.

---

## 16. Code quality, tooling & workflow

- **TypeScript strict**, no `any` (ESLint rule); **ESLint** (`@react-native` + React Hooks rules) and **Prettier**; **Husky + lint-staged** on staged files.
- **Scripts:** `npm run lint`, `npm run typecheck`, `npm test`. **CI (GitHub Actions):** lint + typecheck + test with coverage on every PR.
- **Conventional commits**, one branch + PR per milestone, using `.github/pull_request_template.md`.

### AI-assisted workflow (in the repo)

- `CLAUDE.md` — project rules for the AI assistant.
- `.claude/skills/gen-step` — `/gen-step <N>` runs one milestone: design → implement → tests → lint/typecheck/test → review → AI log → commit, push & PR, with approval gates after the design and before pushing.
- `.claude/agents/code-reviewer` — read-only reviewer on a **stronger model** (Opus) than the implementer (Sonnet), checking each diff against this document.
- `docs/steps/NN-*.md` and `docs/ai-log.md` (what AI produced, what was changed or rejected, how it was validated) — the source for `AI_USAGE.md`.

### Implementation milestones

| #   | Milestone               | Key output                                                                                           |
| --- | ----------------------- | ---------------------------------------------------------------------------------------------------- |
| 1   | Scaffold + tooling + CI | RN CLI app, TS strict, ESLint/Prettier, Husky, Jest, aliases, CI, folder skeleton                    |
| 2   | API layer               | `httpClient`, typed errors, rate limit, `Link` parsing, DTOs, mappers, query keys                    |
| 3   | Repo list               | Providers, navigation, theme + `makeStyles`, ExploreScreen with all list states, pagination, refresh |
| 4   | Repo details            | RepoDetailsScreen, placeholder data, prefetch, open URL                                              |
| 5   | Search & filter         | Debounced org input, client-side name filter                                                         |
| 6   | Favorites               | Zustand + MMKV store, toggle, Favorites tab                                                          |
| 7   | Native module           | Codegen spec, Kotlin + Swift, events, OfflineBanner, Settings → Device                               |
| 8   | Offline                 | Persisted query cache, offline UX                                                                    |
| 9   | UI polish               | Card elevation, language pill, icon stats, Settings → Device as grouped cards                        |
| 10  | Docs                    | `README.md`, `DECISIONS.md`, `AI_USAGE.md`                                                           |

---

## 17. Monitoring in production (bonus)

- **Crash & error reporting:** Sentry (`@sentry/react-native`) for native crashes, JS errors and unhandled rejections, with source maps uploaded in CI and `DeviceNetwork` info as context.
- **Performance:** app start time, screen load time, slow/frozen frames, API latency per endpoint.
- **API health:** error rate by type (network / 404 / rate limit / 5xx) and rate-limit hits per session — tells us when to add auth or ETag caching.
- **Release health:** crash-free sessions/users per version, staged rollouts with alerting on regressions.
- **Product analytics:** searches, details opened, favorites added, offline sessions — to guide priorities.

---

## 18. Future work

- **ETag conditional requests** — `If-None-Match` with cached ETags; GitHub `304`s don't count against the rate limit.
- **Rate-limit countdown UX** — live "resets in mm:ss" and auto-retry at reset.
- **MSW** for more realistic network tests (headers, pagination, 304).
- **ESLint-enforced feature boundaries** (`eslint-plugin-boundaries`).
- **Recent org searches** as quick chips; **server-side search** for very large orgs (§7).
- **E2E tests** (Maestro/Detox), **native unit tests** (JUnit/XCTest) and native builds in CI.
- **Sentry wiring**, i18n, sort options, optional GitHub sign-in to raise the rate limit.

---

## 19. Risks & trade-offs

| Risk / trade-off                                    | Mitigation                                                                                              |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 60 requests/hour without auth                       | Caching (`staleTime`), persisted cache, no retries on rate limit, clear reset time; ETag as future work |
| Client-side filter only covers loaded pages         | Documented; Search API for large orgs                                                                   |
| FlashList adds a dependency                         | Small, widely used, near drop-in; clear win for long lists                                              |
| Codegen `EventEmitter` requires a recent RN version | Verified at scaffold; fallback to `NativeEventEmitter`                                                  |
| Hand-written formatters                             | Small, fully unit-tested; date-fns if needs grow                                                        |
| No E2E tests in the time box                        | Strong unit/hook/component coverage; E2E listed as future work                                          |
