# GitHub Explorer — project rules

React Native CLI app (no Expo) exploring public GitHub orgs. **`docs/DESIGN.md` is the source of truth** — read the relevant sections before changing code. If something must deviate from it, say so and update the doc in the same PR.

## Stack
TypeScript (strict) · React Navigation v7 · TanStack React Query (server state) · Zustand (client state) · react-native-mmkv (persistence) · FlashList v2 · native `fetch` · Jest + React Native Testing Library · ESLint + Prettier.

Do not add dependencies that aren't in `docs/DESIGN.md` without asking. No Expo, no UI kits, no moment/axios, no third-party library replacing the `DeviceNetwork` native module.

## Architecture rules
- Feature-based: `src/features/<feature>/{api,hooks,components,screens,store}` + `src/shared/` + `src/app/`.
- Dependencies flow `screens → hooks → api/store → shared`. Import another feature only through its `index.ts`.
- Screens: no fetch logic. Components: presentational (props in, callbacks out).
- GitHub DTOs stay inside `api/`; map to domain models in `mappers.ts`.
- Server data lives in React Query only — never copy it into Zustand.
- Query keys come from the `queryKeys.ts` factory.
- Styles: `const useStyles = makeStyles(theme => ({...}))` + `const styles = useStyles()`. No inline style objects, no hard-coded colors.
- Zustand: subscribe with selectors; persisted stores use the MMKV adapter and a `version`.
- Use path aliases (`@app/*`, `@features/*`, `@shared/*`), no deep relative imports.
- No `any`; prefer explicit return types on exported functions.
- Errors go through typed errors in `shared/api/errors.ts` and `shared/logger`.
- Accessibility: role + label on every pressable.

## Tests
**Every step ships its tests.** Tests sit next to the code (`Foo.tsx` + `Foo.test.tsx`). Cover success, loading, error and empty paths. Never skip, delete or weaken a test, or disable a lint rule, to make checks pass.

## Commands
```
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm test            # Jest
```
All three must pass before any commit.

## Workflow
- Implement milestones with `/gen-step <N>` (see `.claude/skills/gen-step/SKILL.md`).
- One branch `feat/NN-<name>` and one PR per milestone; conventional commits (`feat(repos): …`).
- Review with the `code-reviewer` agent before committing.
- Log AI usage for each step in `docs/ai-log.md`.
- Never push or open a PR without the user's approval.
