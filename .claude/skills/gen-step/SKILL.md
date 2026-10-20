---
name: gen-step
description: Implement one milestone of docs/DESIGN.md end-to-end — design, implement, add tests, lint/typecheck/test, code review, AI log, then commit, push and open a PR. Use when the user says "/gen-step <N>" or asks to implement milestone N.
argument-hint: <milestone number>
disable-model-invocation: true
---

# gen-step — run milestone $ARGUMENTS

Run **one** milestone from the "Implementation milestones" table in `docs/DESIGN.md`, in this exact order. Do not skip steps. Stop at every **GATE** and wait for the user.

If `$ARGUMENTS` is empty or doesn't match a milestone, list the milestones and ask which one.

## 0. Prepare
- `git status` must be clean. If not, stop and ask.
- `git switch main && git pull` (skip `pull` if there is no remote yet).
- Read `CLAUDE.md`, the milestone row, and every `docs/DESIGN.md` section it touches.
- Read `docs/steps/` for earlier steps to stay consistent.

## 1. Design the step
Write `docs/steps/NN-<kebab-name>.md` (NN = two-digit milestone number):
- **Goal** — one paragraph, linked to the DESIGN sections.
- **Files** — to create / change.
- **Public APIs** — exported functions, hooks, components, types (signatures).
- **Test list** — every test case you will write.
- **Out of scope** and **risks / open questions**.
- **Deviations from DESIGN.md** (if any) — with reason.

**GATE:** show the plan summary and ask the user to approve or change it. Don't write code before approval.

## 2. Branch
`git switch -c feat/NN-<kebab-name>`

## 3. Implement
- Follow `CLAUDE.md` architecture rules strictly.
- Keep the change limited to the step plan. Note anything you discover for later in the step doc under "Follow-ups".
- If you must deviate from `docs/DESIGN.md`, update the doc in this branch and say why.

## 4. Add tests
- Write every test from the test list, next to the code.
- Cover success, loading, error and empty paths; for hooks use a fresh `QueryClient` per test (retries off).
- Prefer RNTL queries by role/label.

## 5. Check
Run, in order:
```
npm run lint
npm run typecheck
npm test
```
Fix and re-run until **all three pass**. Never skip/delete/weaken a test, add `// @ts-ignore`, `any`, or disable a lint rule just to pass. If something truly can't pass, stop and tell the user.

## 6. Review
- Dispatch the `code-reviewer` agent with: the milestone number, the step doc path, and the instruction to review `git diff main...HEAD` (include untracked files — stage them first with `git add -A` if needed).
- For each finding: fix it, or reject it with a one-line reason. Don't blindly accept — verify each claim.
- Re-run step 5 after fixes.

## 7. AI log
Append to `docs/ai-log.md` (create it with a `# AI log` heading if missing):
```
## NN — <milestone name> (YYYY-MM-DD)
- Model(s): implementer <model>, reviewer code-reviewer (opus)
- AI generated: …
- Changed / rejected by me: …
- Reviewer findings: fixed N, rejected N (why)
- Validation: lint / typecheck / tests (N tests), manual checks: …
- Where AI was useful / risky: …
```
Ask the user for anything only they know (e.g. what they changed by hand).

## 8. Commit, push & PR
- Stage everything for this step and commit with a conventional message, e.g. `feat(repos): add infinite repo list`. End the message with the attribution lines required by the session.
- Show the user: commit message, `git diff --stat main...HEAD`, check results, review summary.
- **GATE:** ask the user to approve the push.
- After approval:
  ```
  git push -u origin feat/NN-<kebab-name>
  gh pr create --base main --title "<commit title>" --body-file <filled template>
  ```
  Fill `.github/pull_request_template.md` (write the filled body to a temp file in the scratchpad).
- Give the user the PR URL. The user reviews and merges; the next step starts from an updated `main`.
