# Step 9 — UI polish

## Goal

Implement the milestone 9 key output from `docs/DESIGN.md` §16 ("Card elevation,
language pill, icon stats, Settings → Device as grouped cards"), refining the
visual language introduced in §9 (Theming & styling) without changing any
behavior, data flow, or public component props beyond what's listed below:

1. **Card elevation** — `RepoCard` (and its skeleton) move from a flat
   `surface` + 1px `border` box to an elevated surface (shadow on iOS,
   `elevation` on Android), via a new shared `Card` primitive.
2. **Language pill** — the repo language in `RepoCard` renders as a small
   pill (background + rounded corners) instead of bare caption text.
3. **Icon stats** — `RepoStats` (shared by `RepoCard` and
   `RepoDetailsScreen`) swaps the `⭐` emoji and plain "forks"/"issues"
   suffix text for `@react-native-vector-icons/ionicons` glyphs, already a
   project dependency (used in `MainTabs`, `OrgSearchInput`,
   `NameFilterInput`, `FavoriteButton`).
4. **Settings → Device as grouped cards** — `DeviceInfoSection` splits its
   single flat row list into two elevated `Card`s ("Device" and "Network"),
   matching the card language used elsewhere instead of a bare row list.

## Files

- `src/shared/theme/tokens.ts` — add `ElevationTokens` (`shadowColor`,
  `shadowOffset`, `shadowOpacity`, `shadowRadius`, `elevation`) and an
  `elevation: { card: ElevationTokens }` field on `Theme`, with light/dark
  values (dark needs a stronger shadow/elevation to read against a dark
  background).
- `src/shared/theme/index.ts` — export the new `ElevationTokens` type.
- `src/shared/hooks/useCardStyles.ts` **(new)** — style hook backing the new
  `Card` component (`surface` background, `radii.md`, `spacing.md` padding,
  spread `theme.elevation.card`).
- `src/shared/hooks/index.ts` — export `useCardStyles`.
- `src/shared/components/Card.tsx` **(new)** — presentational elevated
  surface wrapper: `{ children, style? }`.
- `src/shared/components/Card.test.tsx` **(new)**.
- `src/shared/components/index.ts` — export `Card`.
- `src/features/repos/components/RepoCard.tsx` — wrap the card body in
  `Card` (dropping the old border/background/radius, now owned by `Card`);
  wrap `repo.language` text in a pill `View`.
- `src/features/repos/hooks/useRepoCardStyles.ts` — remove
  `backgroundColor`/`borderWidth`/`borderColor`/`borderRadius` from
  `container` (now just layout/padding passed to `Card`'s `style`); add
  `languagePill` (`backgroundColor: theme.colors.background`,
  `borderRadius: theme.radii.lg`, padding, `alignSelf: 'flex-start'`).
- `src/features/repos/components/RepoCardSkeleton.tsx` — wrap in `Card` too,
  for visual parity with the real card.
- `src/features/repos/hooks/useRepoCardSkeletonStyles.ts` — same style
  trim as `useRepoCardStyles`.
- `src/features/repos/components/RepoStats.tsx` — render an `Ionicons` icon
  per stat (`star` for stars, `git-branch-outline` for forks,
  `alert-circle-outline` for open issues, `eye-outline` for watchers)
  followed by the formatted number; drop the emoji and the "forks"/"issues"
  suffix words from the visible text (the existing `accessibilityLabel`
  stays worded the same, e.g. `"220k stars"`, so screen readers are
  unaffected).
- `src/features/repos/hooks/useRepoStatsStyles.ts` — add a `stat` (icon +
  text row, `flexDirection: 'row'`, `gap: spacing.xs`, `alignItems:
'center'`) style; keep `container` as the wrapping row.
- `src/features/device/components/DeviceInfoSection.tsx` — group `InfoRow`s
  into two `Card`s: "Device" (Model, OS version, App version, Build, Low
  power mode) and "Network" (Network, Connection, Metered).
- `src/features/device/hooks/useDeviceInfoSectionStyles.ts` — replace the
  flat `container`/`title` with `group` (margin between cards) and
  `groupTitle`; keep `row`.

## Public APIs

- `Card({ children, style? }: { children: React.ReactNode; style?:
StyleProp<ViewStyle> }): React.JSX.Element` — exported from
  `@shared/components`.
- `ElevationTokens` type exported from `@shared/theme`.
- No other exported component/hook signature changes — `RepoCard`,
  `RepoCardSkeleton`, `RepoStats`, `DeviceInfoSection` keep their existing
  props.

## Test list

- **Card**: renders `children`; merges a passed `style` prop after the base
  card style (doesn't replace it).
- **RepoCard** (update existing): language still renders as text (now
  inside a pill) when present, and nothing when `null`; stat counts render
  as bare formatted numbers (`'220k'`, `'45k'`, `'900'`) instead of
  `'⭐ 220k'` / `'45k forks'` / `'900 issues'`; existing
  `buildAccessibilityLabel` test (full card a11y label) unchanged since the
  label text itself doesn't change.
- **RepoCardSkeleton**: existing "renders without a repo prop" test stays
  green unchanged.
- **RepoStats** (update existing): bare numbers render for stars/forks/issues
  (no collision — values differ); the "renders watchers when passed" case
  now asserts via `findByLabelText('220k watchers')` instead of
  `findByText`, since watchers (220000) and stars (220000, from the shared
  default props) would otherwise both render the ambiguous bare text
  `'220k'`; "omits watchers when not passed" switches its negative
  assertion from `queryByText(/watchers/)` to `queryByLabelText(/watchers/)`
  (the word "watchers" no longer appears in visible text, only in the a11y
  label, so the old assertion would pass vacuously); the existing
  "exposes an accessible label per stat" test is unchanged and is now the
  main coverage for per-stat semantics.
- **DeviceInfoSection** (update existing): loading/error tests unchanged;
  the "shows device info…" test still asserts every value by text
  (`'iPhone 17'`, `'27.0'`, …) — unaffected by the grouping change; add an
  assertion that both group titles ("Device", "Network") render.

## Out of scope

- No new native code, no new navigation, no new dependencies (ionicons is
  already installed and used elsewhere).
- No change to `RepoDetailsScreen` layout beyond the automatic `RepoStats`
  icon update it inherits — it has no card-style wrapper today and this
  step doesn't add one (milestone 9 only calls out list cards and Settings).
- No per-language color coding for the language pill (e.g. GitHub's
  per-language dot colors) — that would require a large hardcoded color
  map, which conflicts with "no hard-coded colors"; the pill uses existing
  theme tokens only.

## Risks / open questions

- Shadow rendering differs enough between iOS (`shadow*`) and Android
  (`elevation`) that both must be set on every card; RN ignores whichever
  doesn't apply to the current platform, so no `Platform.select` branching
  is needed.
- Dark-mode shadows are inherently low-contrast against a dark background;
  compensating with a higher `shadowOpacity`/`elevation` in the dark token
  set is a visual judgment call, not a DESIGN.md-specified value.

## Addendum — coloring pass

After the initial implementation and review, the user shared two mockups
("RepoCard — After", "Settings — After") asking for "a little coloring like
in the images." Added on top of the plan above:

- `src/shared/utils/hexToAlpha.ts` (+ test) — a small hex+alpha → `rgba()`
  helper, used to derive tinted backgrounds from a solid theme/data color at
  render time (the same pattern already used ad hoc in `OfflineBanner`'s
  inline style, just factored out since it's now needed in three places).
- `src/features/repos/constants.ts` (+ test) — a bounded ~15-language color
  map (`LANGUAGE_COLORS`/`getLanguageColor`), a deliberate, scoped exception
  to the "no hard-coded colors" rule (confirmed with the user) for a
  data-driven per-language indicator, the same convention GitHub itself
  uses. Unmapped languages keep the original neutral pill.
- `RepoCard`'s language pill now shows a colored dot (mapped color, or
  `theme.colors.textSecondary` when unmapped) and tints its background via
  `hexToAlpha(color, 0.12)`.
- `DeviceInfoSection` gained a `GroupHeader` (icon in a tinted circular
  badge + title) per card — `phone-portrait-outline`/`theme.colors.accent`
  for Device, `wifi-outline`/`theme.colors.success` for Network — and
  `InfoRow` gained an optional `tone?: 'success' | 'neutral'` that renders
  the value as a small dot + tinted pill instead of plain text, used for
  "Status" (success when online) and "Low power mode" (always neutral).
- Review fixes from the first pass are folded in here too: DESIGN.md §3.2 /
  §9 updated to mention `Card` and the `elevation` token; the "Network" row
  label renamed to "Status" (also matches the mockup); the grouping test
  now scopes assertions with `within()` per card instead of just checking
  both headers exist; `RepoStats`' star icon switched from filled `star` to
  `star-outline` to avoid reading as a favorite-toggle state; `STAT_ICON_SIZE`
  extracted; `Card.test.tsx` asserts against `lightTheme` tokens instead of
  a hard-coded `8`.

New/updated tests: `hexToAlpha.test.ts`, `constants.test.ts`,
`RepoCard.test.tsx` (dot color for a known vs. unmapped language),
`DeviceInfoSection.test.tsx` (status pill tone switches with online state,
strengthened grouping test).

## Deviations from DESIGN.md

None in behavior — DESIGN.md already named this milestone's key outputs.
Updated in this PR to reflect what was actually added: §3.2's
`shared/components` list now includes `Card`, and §9's token list now
includes `elevation` (card shadow/`elevation` per theme).
