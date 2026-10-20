# Step 05 — Search & filter

## Goal

Implement DESIGN §7 ("Search & filter"): the organization input runs its query only on an explicit
action (pressing _Search_ or submitting via the keyboard), never while typing, and shows an inline
validation message instead of searching when the submission is shorter than 2 characters; a
client-side name filter (~250 ms debounce + `useMemo`) narrows the already-loaded repo list with no
extra API calls while typing. Also touches §6.1 ("name filter" is part of the Explore tab's
description) and §6.2 (a new empty state for "filter matched nothing", distinct from "org has no
repos").

Scope is exactly the milestone 5 row in `docs/DESIGN.md` §16: _"Debounced org input, client-side
name filter."_ See **Deviations from DESIGN.md** below — the org-input half of that row changed
mid-step.

## Files

**Create:**

- `src/shared/hooks/useDebounce.ts` + `.test.ts` — generic `useDebounce<T>(value: T, delayMs: number): T`.
  Shared (not feature-local); used by the name filter.
- `src/features/repos/components/NameFilterInput.tsx` + `.test.tsx` — presentational controlled
  text input, no submit button (filtering is live/debounced, not submit-driven).
- `src/features/repos/hooks/useNameFilterInputStyles.ts` — styles hook, same pattern as
  `useOrgSearchInputStyles`.

**Change:**

- `src/shared/components/Text.tsx` + `src/shared/hooks/useTextStyles.ts` — `Text`'s `color` prop
  gains a `'danger'` option (→ `theme.colors.danger`), alongside the existing `'primary'` /
  `'secondary'`, for the new org-input validation message below. (Simplified the component's style
  lookup from a ternary to `styles[color]` while adding the option.)
- `src/features/repos/hooks/useExploreScreenStyles.ts` — add `orgInputErrorMessage` style.
- `src/features/repos/screens/ExploreScreen.tsx`:
  - `handleSubmit` (fired by `OrgSearchInput`'s Search button or keyboard submit) sets a local
    `orgTooShort` flag and returns, without touching `org`, when the trimmed submission is shorter
    than `MIN_ORG_LENGTH` (2); otherwise behaves as before (`refetch()` if resubmitting the same
    org, else `setOrg(trimmed)`). `orgTooShort` renders an inline "Enter at least 2 characters"
    `Text` (`color="danger"`) below the input, and clears as soon as the user edits the input
    again (`handleOrgInputChange` wraps `setOrgInput` to also clear it). No debounce or effect
    drives `org` from typing — `orgInput` and `org` are decoupled until an explicit submit.
  - Add `nameFilter` state, debounced 250 ms. Compute
    `filteredRepos = useMemo(() => filterReposByName(repos, debouncedNameFilter), [repos, debouncedNameFilter])`
    and use `filteredRepos` everywhere `repos` currently feeds the list.
  - Reset `nameFilter` whenever `org` changes (a filter typed against one org shouldn't silently
    carry over to the next).
  - Render `NameFilterInput` whenever `repos.length > 0` (independent of `status`, so it stays
    usable through a page/refresh error that keeps already-loaded repos visible).
  - "No repositories match" renders via `FlashList`'s `ListEmptyComponent`, not by swapping the
    whole list for an `EmptyView` — so pull-to-refresh and the pagination footer stay live even
    when the current filter matches nothing.
- `src/features/repos/screens/ExploreScreen.utils.ts` (+ its existing `.test.ts`) — add
  `filterReposByName(repos: Repo[], query: string): Repo[]`, case-insensitive substring match
  against `repo.name`; a blank/whitespace-only query returns `repos` unchanged.
- `src/features/repos/components/index.ts` — export `NameFilterInput`.
- `src/features/repos/hooks/index.ts` — export `useNameFilterInputStyles`.
- `src/shared/hooks/index.ts` — export `useDebounce`.
- `docs/DESIGN.md` §7 — updated org-input bullet (see Deviations).
- `src/features/repos/screens/ExploreScreen.test.tsx` — add cases (list below). The name-filter
  cases that need determinism around the 250 ms debounce scope `jest.useFakeTimers()` /
  `jest.useRealTimers()` to themselves so they don't affect the rest of the file, which otherwise
  uses `userEvent`'s real timers.

## Public APIs

- `shared/hooks`: `useDebounce<T>(value: T, delayMs: number): T`.
- `shared/components`: `Text`'s `color` prop is now `'primary' | 'secondary' | 'danger'`.
- `features/repos/screens/ExploreScreen.utils`: `filterReposByName(repos: Repo[], query: string): Repo[]`.
- `features/repos/components`: `NameFilterInput({ value: string; onChangeText: (value: string) => void })`.
- `features/repos/hooks`: `useNameFilterInputStyles()` — styles hook, same pattern as `useOrgSearchInputStyles`.

## Test list

**`useDebounce.test.ts`** (fake timers):

- returns the initial value immediately on mount.
- does not update before `delayMs` has elapsed.
- updates to the latest value once `delayMs` elapses.
- collapses rapid changes: only the final value is applied if the value changes again before the
  delay elapses (no intermediate flash).
- clears its pending timer on unmount, so a pending debounce never fires afterward.

**`NameFilterInput.test.tsx`**:

- has an accessible label ("Filter repositories by name").
- calls `onChangeText` with every typed character.

**`ExploreScreen.utils.test.ts`** (additions):

- `filterReposByName` — case-insensitive substring match on `name`.
- empty/whitespace-only query returns all repos unchanged.
- no matches returns `[]`.

**`ExploreScreen.test.tsx`** (additions):

- never searches while typing, however long it waits, without an explicit submit.
- does not search, and shows "Enter at least 2 characters", when Search is pressed or the keyboard
  submit fires below the minimum length; the message isn't shown before any submit is attempted,
  and clears as soon as the user edits the input again.
- searches on keyboard submit at exactly the minimum length (2 characters), with no validation
  message.
- shows the name filter input once repos have loaded; hides it before any search, when the org has
  no repos, and keeps it visible through a page/refresh error.
- clears the name filter once a new org is submitted.
- filters the visible list by name after the 250 ms debounce.
- shows the "No repositories match" empty state when the filter matches nothing, and it doesn't
  show while the filter is still debouncing.

## Out of scope

- The §7 fallback to GitHub's Search API at ~50,000-repo scale — that's documented contingency,
  not this milestone's output.
- Favorites, native module, offline work (later milestones).

## Risks / open questions

- Mixing fake timers (name-filter tests) with `userEvent`'s real-timer usage (existing tests) in
  the same file — each fake-timer test explicitly `jest.useFakeTimers()`, with a file-level
  `afterEach(() => jest.useRealTimers())` so it never leaks into other tests.
- Name filter matches `repo.name` only (not `fullName` or `description`) — matches DESIGN's literal
  "name filter" wording.
- Name filter input visibility (`repos.length > 0`) isn't spelled out verbatim in DESIGN beyond
  "filters the already loaded repos" — documenting this as the scope decision rather than a
  deviation, since showing an inert filter box with nothing loaded yet would be confusing UX.
- **Known trade-off, not fixed this step:** when a filter narrows the rendered list below the
  viewport height, `FlashList` can fire `onEndReached` on layout alone (independent of user
  scrolling), so a narrow filter can end up auto-paginating through an entire org while idle. This
  isn't new to this milestone (an unfiltered first page shorter than the viewport has the same
  property) and guarding it properly means distinguishing layout-triggered from scroll-triggered
  `onEndReached`, which is out of scope here. Worth revisiting if it shows up as real quota
  pressure.

## Deviations from DESIGN.md

- **§7's org-input behavior changed mid-step, by explicit user direction, through two rounds, from
  the originally written design.** DESIGN previously read: "the query runs only after the user
  stops typing (debounced ~500 ms) or presses Search." The implementation initially matched that
  (a `useDebounce`-driven effect auto-searched 500 ms after typing stopped, in addition to the
  Search button).
  1. The user asked for debounced auto-search to be removed entirely: the org query should fire
     **only** on an explicit Search-button press or keyboard submit, never while typing. This
     removed the `useDebounce`/effect pair driving `org` from `orgInput` — the two are now
     decoupled until an explicit submit.
  2. The user then asked for a too-short submission to require 2 characters (not 1) and to show a
     visible validation message rather than silently no-op.
     `docs/DESIGN.md` §7 is updated in this same PR to: "the query runs only on an explicit action:
     pressing Search or submitting via the keyboard. Nothing fires while typing. A submission shorter
     than 2 characters shows an inline 'Enter at least 2 characters' message instead of searching."
- The name-filter half of §7 (debounced ~250 ms client-side filter) is unchanged from the original
  plan.

## Follow-ups (discovered during implementation / code review)

- An earlier iteration's org-search debounce effect depended on both `debouncedOrgInput` and `org`,
  which made it re-run right after `handleSubmit`'s immediate `setOrg` and snap `org` back to the
  still-stale debounced value. This entire mechanism (and the bug with it) was removed once the
  org-search behavior changed to explicit-trigger-only (see Deviations) — noted here only as a
  lesson for any future "debounce a value, but let an explicit action bypass the wait" pattern in
  this codebase: the debounce effect must react only to the debounced value itself, never to state
  an explicit action also writes.
- `showNameFilter` must be `repos.length > 0`, not `status === 'success' && repos.length > 0` —
  gating on `status` hid (and orphaned) the filter during a page/refresh error, even though
  `filteredRepos` kept applying it to the still-visible list. Fixed; covered by a test.
- The name filter resets whenever `org` changes (a new submitted search), so a filter typed against
  one org doesn't silently carry over and hide repos in the next org's results. Not in the original
  plan; added during review.
- **Added after the initial commit, by user request:** a clear ("×") button on both
  `OrgSearchInput` and `NameFilterInput`, shown only while the field has text, clearing it on
  press. Implemented as an absolutely-positioned `Pressable` (`Ionicons` `close-circle`) inside a
  wrapper `View` around the `TextInput`, rather than RN's `clearButtonMode` prop, since that prop
  is iOS-only and this app targets both platforms. `accessibilityRole="button"` +
  `accessibilityLabel` ("Clear organization name" / "Clear filter") per `CLAUDE.md`'s
  accessibility rule. Pressing `OrgSearchInput`'s clear button goes through the same
  `onChangeText` the screen already wires to `handleOrgInputChange`, so it also clears the
  too-short validation message.
