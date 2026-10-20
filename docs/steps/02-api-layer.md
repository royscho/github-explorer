# Step 02 — API layer

## Goal

Build the dependency-free API layer that every later milestone (repo list, details, search, favorites) reads
through: a typed `fetch` wrapper with timeout/abort/typed-error mapping, `Link`-header pagination parsing,
GitHub DTOs with mappers into domain models, and a query-key factory. No UI, no React Query hooks, no
navigation — those start in milestone 3.

Scope is exactly the milestone 2 row in `docs/DESIGN.md` §16: _"`httpClient`, typed errors, rate limit, `Link`
parsing, DTOs, mappers, query keys"_. It implements:

- §5.1 (HTTP client — native `fetch`) — base URL, GitHub headers, timeout combined with the caller's
  `AbortSignal`, JSON parsing, status → typed error mapping, `X-RateLimit-*` reading.
- §5.2 (Endpoints) — org repos (paged) and repo details.
- §5.3 (Errors) — `NetworkError`, `NotFoundError`, `RateLimitError`, `ApiError`; aborted requests are not
  wrapped.
- §5.4 (Response mapping) — `dto.ts` / `mappers.ts`, camelCase domain models, explicit `null`s.
- §5.5 (Query keys) — one factory for all repo queries.
- §3.2 folder structure for `shared/api`, `shared/utils`, `features/repos/api`.

## Files

**Create:**

- `src/shared/api/errors.ts` — `NetworkError`, `NotFoundError`, `RateLimitError`, `ApiError`, `GitHubApiError`
  union, `isGitHubApiError` guard.
- `src/shared/api/errors.test.ts`
- `src/shared/api/rateLimit.ts` — parses `X-RateLimit-Remaining` / `X-RateLimit-Reset`.
- `src/shared/api/rateLimit.test.ts`
- `src/shared/api/httpClient.ts` — `httpGet<T>()`.
- `src/shared/api/httpClient.test.ts` (mocks global `fetch`)
- `src/shared/api/index.ts` — barrel re-exporting the above (so other features/shared code does
  `import { httpGet, NotFoundError } from '@shared/api'`, never deep imports).
- `src/shared/utils/linkHeader.ts` — `parseLinkHeader()`.
- `src/shared/utils/linkHeader.test.ts`
- `src/shared/utils/index.ts` — barrel.
- `src/features/repos/types.ts` — domain models: `Owner`, `License`, `Repo`, `RepoDetails`.
- `src/features/repos/api/dto.ts` — raw GitHub JSON shapes: `RepoOwnerDto`, `RepoLicenseDto`, `RepoDto`.
- `src/features/repos/api/mappers.ts` — `mapRepo(dto): Repo`, `mapRepoDetails(dto): RepoDetails`.
- `src/features/repos/api/mappers.test.ts`
- `src/features/repos/api/endpoints.ts` — `fetchOrgRepos()`, `fetchRepoDetails()`.
- `src/features/repos/api/endpoints.test.ts` (mocks `@shared/api`'s `httpGet`)
- `src/features/repos/api/queryKeys.ts` — `repoKeys` factory.
- `src/features/repos/api/queryKeys.test.ts`

**Change:**

- `src/features/repos/index.ts` — export the public domain types (`Repo`, `RepoDetails`, `Owner`, `License`)
  so other features (favorites, in milestone 6) can import them through the barrel instead of reaching into
  `features/repos/types`. Nothing else is exported yet — no hooks exist until milestone 3.
- `docs/DESIGN.md` — only if a deviation below forces it.

## Public APIs

- `shared/api/errors.ts` exports the four error classes (`NetworkError`, `NotFoundError`, `RateLimitError`
  with a `resetAt: Date`, `ApiError` with a `status: number`), the `GitHubApiError` union, and the
  `isGitHubApiError` type guard.
- `shared/api/rateLimit.ts` exports `parseRateLimitHeaders(headers): { remaining; resetAt } | null`.
- `shared/api/httpClient.ts` exports `httpGet<T>(path, { signal?, searchParams? }): Promise<{ data: T; headers }>`.
- `shared/utils/linkHeader.ts` exports `parseLinkHeader(header): Partial<Record<'next'|'prev'|'first'|'last', string>>`.
- `features/repos/types.ts` exports the domain models `Owner`, `License`, `Repo` (id, name, fullName, owner,
  description, htmlUrl, language, stars, forks, openIssues, watchers, createdAt, updatedAt) and `RepoDetails`
  (`Repo` + `defaultBranch` + `license`).
- `features/repos/api/mappers.ts` exports `mapRepo(dto): Repo` and `mapRepoDetails(dto): RepoDetails`.
- `features/repos/api/endpoints.ts` exports `fetchOrgRepos(org, page, signal?): Promise<{ repos: Repo[]; hasNextPage: boolean }>`
  and `fetchRepoDetails(owner, repo, signal?): Promise<RepoDetails>`.
- `features/repos/api/queryKeys.ts` exports the `repoKeys` factory (`all`, `orgList(org)`, `detail(owner, repo)`).

Notes on design choices not fully spelled out in DESIGN.md:

- **Pagination contract**: `fetchOrgRepos` returns `hasNextPage: boolean` (derived from whether the `Link`
  header has a `next` rel) rather than a GitHub-provided next URL or page number. Milestone 3's
  `useOrgRepos` can then drive `useInfiniteQuery` with a simple incrementing page-number `pageParam`
  (`getNextPageParam = (last, pages) => last.hasNextPage ? pages.length + 1 : undefined`). This avoids
  parsing/storing GitHub's opaque next-page URL and keeps `OrgReposPage` trivially testable.
  `parseLinkHeader` itself stays generic (returns URLs by rel) since `shared/utils` has no opinion about how
  callers use it.
- **Timeout vs. caller abort**: `httpGet` creates its own internal `AbortController`, wires a timeout to it,
  and also listens for the caller's `signal` (if given) to abort the same controller — rather than relying on
  `AbortSignal.any`, whose Hermes/RN 0.88 support isn't confirmed. On catch, an `AbortError` is rethrown
  **unmodified** if the caller's own signal was the cause (§5.3: "Aborted requests are not shown as errors" —
  React Query's cancellation relies on seeing a real `AbortError`); if the _internal_ timeout fired, it's
  thrown as a `NetworkError` instead, since a timeout is a connectivity failure from the user's perspective,
  not a cancellation.
- **Rate limit parsing is only used on the error path** (to decide whether a 403/429 is a `RateLimitError`).
  `HttpResponse` does not carry `RateLimitInfo` on success — nothing in scope through milestone 2 consumes a
  live remaining-quota figure, and DESIGN's bonus rate-limit-countdown UX (§18) is explicitly future work. If
  a later milestone needs it, `parseRateLimitHeaders(response.headers)` is already exported and reusable.
- **`httpGet` is generic over any GitHub path**, not org-repos-specific — endpoint-specific URL building
  (base path, `per_page=30&sort=updated`, owner/repo interpolation) lives in `features/repos/api/endpoints.ts`
  per §3.1 ("API DTOs never leave `api/`"); `shared/api` knows nothing about GitHub's resource shapes.

## Test list

- `errors.test.ts` — each class: `instanceof Error`, correct `.name`, message; `RateLimitError.resetAt` is the
  `Date` passed in; `ApiError.status` is the status passed in; `isGitHubApiError` returns `true` for all four
  and `false` for a plain `Error` / non-error value.
- `rateLimit.test.ts` — parses present `X-RateLimit-Remaining` + `X-RateLimit-Reset` (unix seconds) into
  `{ remaining, resetAt }`; returns `null` when either header is missing; returns `null` on a non-numeric
  header value (defensive, no throw).
- `linkHeader.test.ts` — parses a multi-rel header (`<...>; rel="next", <...>; rel="last"`) into
  `{ next, last }`; returns `{}` for `null` input and for a header with no recognized `rel`; ignores unknown
  `rel` values.
- `httpClient.test.ts` (mocks global `fetch`):
  - success → resolves `{ data, headers }` with parsed JSON body.
  - request includes GitHub `Accept` + API-version headers and merges `searchParams` into the URL.
  - 404 → rejects with `NotFoundError`.
  - 403 with `X-RateLimit-Remaining: 0` → rejects with `RateLimitError` whose `resetAt` matches the header.
  - 429 with `X-RateLimit-Remaining: 0` → same as above.
  - 403 with remaining > 0 (abuse rate limit, not quota) → rejects with generic `ApiError`, not
    `RateLimitError`.
  - other 4xx/5xx (e.g. 500) → rejects with `ApiError` carrying the status.
  - `fetch` rejects with a generic error (DNS/offline) → rejects with `NetworkError`.
  - internal timeout fires → rejects with `NetworkError` (fake timers).
  - caller-provided `signal` is already aborted / aborts mid-flight → rejects with the original `AbortError`,
    **not** wrapped.
- `mappers.test.ts` — `mapRepo`: full DTO → camelCase `Repo`, numeric date strings → `Date`; DTO with
  `description: null` / `language: null` → passthrough `null`s (empty-path case). `mapRepoDetails`: adds
  `defaultBranch`/`license`; DTO with `license: null` → `license: null`.
- `endpoints.test.ts` (mocks `httpGet` from `@shared/api`):
  - `fetchOrgRepos` calls `httpGet` with `/orgs/{org}/repos` and `per_page=30&page={n}&sort=updated`; maps
    each item with `mapRepo`; `hasNextPage: true` when the response `Link` header has `rel="next"`,
    `false` when it doesn't (empty-path case: last page).
  - `fetchOrgRepos` with an empty `[]` body → `{ repos: [], hasNextPage: false }` (empty-org case).
  - `fetchRepoDetails` calls `httpGet` with `/repos/{owner}/{repo}` and maps the single DTO with
    `mapRepoDetails`.
  - errors from `httpGet` propagate unchanged (no extra wrapping in `endpoints.ts`).
- `queryKeys.test.ts` — `repoKeys.all` is a stable tuple; `orgList('facebook')` / `detail('facebook','react')`
  include `repoKeys.all` as a prefix and the given args; same inputs → deep-equal keys (React Query key
  stability).

No component/hook/screen states (loading/empty list on screen, retry button, etc.) this step — that's
milestone 3. "Empty" here means empty/`null` API data shapes, covered above.

## Out of scope

- `useOrgRepos` / `useRepoDetails` React Query hooks and any `QueryClient` setup (milestone 3).
- `shared/logger` — not listed as a milestone-2 output; first real consumer is the error-boundary / screen
  error handling in milestone 3, where it'll be added alongside `ErrorView`.
- ETag conditional requests, rate-limit countdown UX, MSW (all §18 future work).
- ESLint feature-boundary enforcement (§18 future work) — relying on code review for the import-direction
  rule this step.

## Risks / open questions

- **`AbortSignal.any` availability**: not relied upon (see "Timeout vs. caller abort" above); implemented by
  hand instead. If RN 0.88/Hermes turns out to support it fine, this is still a safe, equally-testable choice.
- **Hermes `fetch` Headers behavior**: assuming `Headers.get()` is case-insensitive and available on the RN
  polyfill (standard Fetch behavior) for both `Link` and `X-RateLimit-*` lookups; will confirm via the test
  suite's mocked `Headers` and flag here if RN's polyfill diverges.
- **GitHub `Link` header format**: real-world header is `<https://api.github.com/...&page=2>; rel="next", <...>; rel="last"`; tests use realistic fixtures copied from GitHub's documented format.

## Deviations from DESIGN.md

None anticipated.
