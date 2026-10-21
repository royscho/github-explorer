# Step 10 — Docs

## Goal

Implement the milestone 10 key output from `docs/DESIGN.md` §16
("`README.md`, `DECISIONS.md`, `AI_USAGE.md`"): the three
reviewer-facing documents a Tech Lead home-assignment submission is
actually read through, as opposed to `docs/DESIGN.md` (the living
source of truth this whole build followed) and `docs/ai-log.md` (the
per-milestone raw log). Per §16, `docs/ai-log.md` is explicitly "the
source for `AI_USAGE.md`" — that file gets condensed, not duplicated.
This step is **docs-only**: no `src/` code changes, no new dependency,
no behavior change.

- **`README.md`** (expand the existing 28-line stub) — what the app
  does, how to set it up and run it (iOS/Android), how to run the
  checks, folder structure at a glance, and pointers to the other two
  docs plus `docs/DESIGN.md`.
- **`DECISIONS.md`** (new, repo root, alongside `README.md`/`CLAUDE.md`
  — DESIGN §16's "Related docs" row lists it unqualified, unlike
  `docs/steps/*`) — a short, reviewer-facing ADR-style summary of the
  decisions that actually mattered: the ones made up front in
  `docs/DESIGN.md` (why React Query/Zustand/MMKV, why a TurboModule, why
  one pushed details route not a modal, why FlashList, why native
  `fetch`) **and** the real deviations/judgment calls made during
  implementation and captured in each step doc's "Deviations from
  DESIGN.md" section and `docs/ai-log.md` (ISO-string dates instead of
  `Date` instances, the offline dehydration-filter fix, async vs sync
  persister, the per-card vs per-details favorite-toggle scope
  correction, the org-search explicit-trigger-only change, the
  per-language color-map exception to "no hard-coded colors"). This is
  the one place a reviewer can read _why_ the code looks the way it
  does without reading nine step docs.
- **`AI_USAGE.md`** (new, repo root) — a transparent, condensed account
  of how AI was used across all 10 milestones: the workflow
  (`/gen-step`, Sonnet implementer + Opus reviewer, gates), rough
  scale (tests/review-finding counts per milestone, pulled from
  `docs/ai-log.md`), and — most importantly for a hiring reviewer — a
  pulled-together "where AI was useful" vs. "where AI was risky /
  needed a human" synthesis across milestones (e.g. the two
  structurally-untestable bugs AI's own test suite couldn't catch:
  MMKV native-linkage in #06, React Query's offline-pause state machine
  in #08; the real correctness bug in #04's `watchers`/`subscribers_count`;
  the repeated RNTL async-helper gotcha across #01/#03/#07).

Additionally, by user request during plan review: record **planned i18n
via `i18next` including RTL support** as future work (see
"Future work — i18n / RTL" below).

## Files

- `README.md` — rewritten/expanded in place.
- `DECISIONS.md` **(new)**.
- `AI_USAGE.md` **(new)**.
- `docs/DESIGN.md` §18 — expand the bare "i18n" future-work bullet into
  the concrete i18next + RTL entry described below. §1's non-goals line
  already cross-references §18, so it needs no change. No other DESIGN.md
  content change expected (milestone 10 already names this step's three
  outputs); only touched further if writing the above surfaces a genuine
  inaccuracy.

## Future work — i18n / RTL

DESIGN.md §18 currently lists a bare "i18n" among future work. Replacing
it with a specific, actionable entry, since the mechanism is now decided:

- **`i18next` + `react-i18next`** as the localization layer (industry
  standard, framework-agnostic core, supports the interpolation and
  pluralization the existing hand-written formatters would move onto).
- **RTL support** via React Native's `I18nManager`, which flips layout
  direction natively once a right-to-left locale is active.
- The **concrete migration cost today is small and bounded** — verified
  by grep while writing this plan, worth recording because it's the kind
  of thing that silently grows: the codebase has no `I18nManager` usage
  and no logical style properties yet, and exactly **6 physical
  direction-dependent properties**, all in three style hooks:
  `useOrgSearchInputStyles.ts` (`paddingRight`, `right` — clear button),
  `useNameFilterInputStyles.ts` (`paddingRight`, `right` — clear
  button), and `useRepoCardStyles.ts` (`marginRight`, `right` — favorite
  toggle). An RTL pass converts those to their logical equivalents
  (`paddingEnd` / `marginEnd` / `end`), which RN flips automatically.
  Every other directional style in the app is already
  direction-neutral (`textAlign: 'center'`, `gap`, symmetric padding).
- Also noted as part of that future pass: user-facing strings are
  currently inline literals in components, and the two hand-written
  formatters (`formatRelativeTime`, `formatCompactNumber` — §9, written
  by hand because Hermes' `Intl` support is partial) are English-only
  and would need locale-aware replacements, which is the point at which
  date-fns (DESIGN §9's named fallback) likely earns its place.

This is recorded in `docs/DESIGN.md` §18 and summarized in
`README.md`/`DECISIONS.md`'s future-work pointers. **No i18n code,
dependency or string extraction ships in this step** — it stays future
work.

## Public APIs

None — no code changes, nothing exported.

## Test list

None. This step produces no `src/` changes, so there is nothing new for
Jest/RNTL to cover. Per CLAUDE.md, `npm run lint`, `npm run typecheck`
and `npm test` still run before committing, to confirm this step didn't
accidentally touch or break anything — they're expected to pass
unchanged (same counts as after milestone 9: lint clean, typecheck
clean, 330 tests).

## Out of scope

- No screenshots/GIFs in `README.md` — none exist in the repo today and
  capturing them isn't part of this milestone's key output.
- No `CONTRIBUTING.md`, `LICENSE`, or `CHANGELOG.md` — not named in
  DESIGN.md's milestone 10 row.
- No restructuring of `docs/DESIGN.md` itself beyond the §18 i18n/RTL
  entry above and a factual fix if one is found while cross-checking it.
- **No i18n implementation** — no `i18next`/`react-i18next` dependency,
  no string extraction, no `I18nManager` call, no physical→logical style
  property conversion. This step only _records_ that plan; §18 is
  future work by definition.
- No code review agent dispatch for pure Markdown with no code diff to
  check against DESIGN.md/CLAUDE.md's _code_ rules — step 6 is replaced
  by the user reading the three docs directly (noted as a deviation
  below).

## Risks / open questions

- `AI_USAGE.md` condenses a 48 KB log into something a reviewer will
  actually read; the risk is flattening real nuance (e.g. which findings
  were rejected and why) into something too generic. Mitigating by
  keeping per-milestone specifics (bug names, not just counts) for the
  handful of cases that are genuinely instructive, and pointing to
  `docs/ai-log.md` for the rest.
- `DECISIONS.md` risks becoming a restatement of `docs/DESIGN.md`'s own
  "Why" columns. Mitigating by scoping it to decisions a reviewer would
  ask "why did you do it that way" about, including the ones that only
  emerged mid-build (not visible in DESIGN.md's current, already-updated
  text) — framed as "what changed and why," not "what DESIGN.md says."
- README's Android run instructions have never been manually verified
  end-to-end in this project (every manual check in `docs/ai-log.md` was
  iOS-simulator-only) — will phrase the Android section as the standard
  RN CLI command without claiming it was tested here.

## Deviations from DESIGN.md

None in scope — DESIGN.md §16 already names exactly these three outputs
for milestone 10. DESIGN.md §18's "i18n" bullet is **expanded, not
changed in intent** (i18n was already future work; this step names the
library and adds RTL), per CLAUDE.md's rule to update the doc in the same
PR. One workflow deviation from `/gen-step`'s own steps,
called out here rather than silently skipped: **step 6 (code-reviewer
agent dispatch) is skipped** for this step. The `code-reviewer` agent
reviews a diff against `docs/DESIGN.md`/`CLAUDE.md`'s _code_ rules
(architecture, tests, lint); there is no code diff here to check against
those rules. The user reviews the three documents directly instead.
Step 7 (AI log entry) and step 8 (commit/PR) proceed as normal.
