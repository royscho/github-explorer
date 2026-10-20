# AI log

One entry per milestone, written by `/gen-step` (step 7). Source for `AI_USAGE.md`.

## 00 — Design (2026-10-20)

- Model(s): Claude Opus 5.5 (Claude Code, plan mode)
- AI generated: `docs/DESIGN.md`, `CLAUDE.md`, `/gen-step` skill, `code-reviewer` agent, PR template.
- Decided by me: Zustand + React Query + MMKV, TurboModule, feature-based folders, `makeStyles`/`useStyles`, one details route (push, not modal), FlashList, scope of extras, one PR per step, Sonnet for implementation and Opus for review.
- Validation: design checked against every requirement in the assignment.

## 01 — Scaffold + tooling + CI (2026-10-20)

- Model(s): implementer Claude Sonnet 5 (Claude Code), reviewer code-reviewer (opus)
- AI generated: step plan (`docs/steps/01-scaffold-tooling-ci.md`), the RN CLI 0.88.0 scaffold (merged from `rnc-cli init` into the repo root), TS strict/ESLint/Prettier/Husky/lint-staged wiring, path aliases (`tsconfig.json` paths + `babel-plugin-module-resolver` + Jest `moduleNameMapper`), the `src/app`/`src/features/*`/`src/shared` folder skeleton, `App.tsx` placeholder + `App.test.tsx`, `shared/constants.ts` + its alias-resolution test, `.github/workflows/ci.yml`, merged `.gitignore`, and README setup/run/check instructions.
- Changed / rejected by me: approved the step plan as drafted; no changes beyond what came out of code review.
- Reviewer findings: fixed 2 should-fix + 6 nits — swapped deprecated `react-test-renderer` for `@testing-library/react-native` 14.x (DESIGN's declared test stack) and rewrote `App.test.tsx` to assert the rendered text via RNTL instead of only checking render doesn't throw; added ESLint `ignorePatterns` for `coverage/`/`vendor/`/`ios/`/`android/`; had `App.tsx`/`index.js` go through the `@shared`/`@app` aliases instead of relative imports; widened `lint-staged` globs; added `.nvmrc` + CI `node-version-file`; added CI `permissions`/`concurrency`; renamed the npm package from the reverse-DNS bundle id to `github-explorer`. 0 rejected.
- Validation: lint / typecheck / tests (2 tests, 100% coverage on the files that exist) all pass; manual check: `pod install` + `npx react-native run-ios` built and launched the app on an iPhone 17 simulator, screenshot confirmed "GitHub Explorer" renders. Android emulator not verified (no local Android SDK confirmed) — not required for this step's automated checks.
- Where AI was useful / risky: useful for merging the generated template into the existing repo correctly (gitignore, folder layout) and for catching the React 19 `react-test-renderer` deprecation during review, which I would likely have missed at scaffold time. Risky spot: the first-pass `App.test.tsx` only checked that rendering didn't throw — a weak test that review caught; also needed a manual fix for RNTL 14's `render()` being `async` (its `screen` singleton throws a somewhat opaque error if you query before awaiting it).
