---
name: implement-plan
description: Orchestrate a user-supplied implementation plan stage by stage — executor → verifier loop, commit and push each stage on a green light, stop and ask on a critical issue
argument-hint: '"<plan-path>" [from N | stage N | stages N-M]'
disable-model-invocation: true
---

Drive an implementation plan to completion, one stage at a time, using the `executor` and
`verifier` sub-agents.

Input: $ARGUMENTS MUST contain exactly one **plan path**, absolute or relative to the current repo
(e.g. `.claude/plans/2026-07-29-provider-stack-consolidation.md`), followed by at most one
optional **stage selector**:

- no selector — run every not-yet-completed stage in plan order,
- `from 3` — run Stage 3 and every later stage,
- `stage 3` — run only Stage 3,
- `stages 3-5` — run only that inclusive, contiguous range.

Example: `.claude/plans/2026-07-22-flows-refactoring-plan.md from 2`
Quote paths that contain spaces. A selector limits the requested run; it does NOT authorize skipping
unfinished predecessors or dependencies.

**Your role is ORCHESTRATOR only.** You do not write, edit or fix source code, and you do not
verify the work yourself — those are the `executor`'s and `verifier`'s jobs. Your own actions are
limited to: reading the plan, dispatching the two agents, running git commands, and deciding
whether to continue or stop.

---

## Phase A — Preflight (once, before any stage)

1. **Resolve the required plan path.** Parse one plan path and at most one valid selector from
   $ARGUMENTS. Resolve a relative path from the current repo and canonicalize it to an absolute path.
   If the path is absent, ambiguous, not a readable Markdown file, or leaves unrecognized arguments,
   STOP and report the expected invocation syntax. Never guess or select a plan automatically.
2. **Read the whole plan** — not just the stage you start at. Extract:
   - the ordered stage list (plans use `Stage <N>` or `Phase <N>` headings, sometimes sub-stages
     like `1b`), and each stage's exact heading text,
   - per stage: goal, changes, acceptance criteria, **gate** commands, **footguns / Do NOT**,
     depends-on, rollback, and the **target repo** if the stage names one (e.g. `(host)` /
     `(package)`),
   - plan-wide sections: `Footguns / Do NOT`, `Verification Loop`, `Rollback Strategy`,
     `Out of scope`, `Definition of done`.
3. **Fix the execution order.** Default is **strict document order, one stage at a time**. Apply the
   optional selector exactly as defined above, but treat it only as run scope: every predecessor or
   dependency outside the selection must already have a verified resume-marker commit, unless the
   plan explicitly authorizes it to remain unfinished. Deviate
   ONLY when the plan explicitly authorizes it (a `Depends on:` graph, "may run in parallel with…",
   "Stage 5 may run before Stage 2", "stages are independent"). When you deviate, quote the plan
   line that authorizes it in your run summary. If the wording is ambiguous, stay strictly
   sequential.
   - Never run two `executor` agents concurrently against the same working tree: the `verifier`
     grades the **uncommitted diff**, and two stages in flight are indistinguishable in it. If the
     plan demands true parallelism, STOP and ask (options: sequentialize, or split into separate
     git worktrees).
4. **Check each target repo** (the current one, plus any other repo the plan's stages name):
   - `pwd`, `git status --short`, `git branch --show-current`.
   - Working tree must be **clean**. If not, STOP and ask (commit first / stash / abort).
   - Resolve the default branch from `refs/remotes/origin/HEAD`; only if unavailable, fall back to
     checking `dev`, `main`, and `master`. If currently on that branch, STOP and ask whether to create
     a feature branch (`/branch`) or deliberately proceed on the default branch.
   - Note whether an upstream exists: `git rev-parse --abbrev-ref --symbolic-full-name @{u}`.
5. **Detect prior progress in every target repo** (resume support):
   `git log --oneline --fixed-strings --grep="Plan: <plan file basename>"`. Map each exact marker to
   its stage and repo. Validate the selector's predecessors/dependencies now; if any required one is
   unfinished, STOP and report it instead of skipping it. Report completed stages and the first
   selected stage to run.
6. **Show the run summary and ask for ONE go-ahead**: plan path, ordered stage list with target
   repo/branch, each stage's gate commands, the starting stage, and any authorized reordering.
   After this single confirmation you run autonomously — you do NOT ask again between stages.

---

## Phase B — Per-stage loop

For each stage, in the fixed order:

1. **Dispatch the named `executor` sub-agent in the foreground** (never in the background; you need
   its final result before continuing):

   ```
   Working directory: <absolute repo path for this stage>
   Implementation plan (source of truth): <absolute plan path>
   Execute ONLY: <exact stage heading, e.g. "## Phase 3 — Fix the host-side instability sources (host)">

   Read the repo's CLAUDE.md first, then this stage in the plan in full.
   The Working directory above is authoritative. Use absolute paths for every Read/Edit/Write call.
   Every Bash call must set that directory explicitly (`cd "<absolute repo path>" && <command>`);
   never rely on a previous `cd` persisting.
   Follow this stage's steps, gate, footguns and "Do NOT" list exactly. Do NOT apply rules
   from any other stage. Do NOT commit — leave the working tree changed but uncommitted.
   Run this stage's gate commands verbatim and report each command with its real result.
   [On a re-run only:] Fix exactly these verifier blockers, nothing else:
   <verifier blockers, verbatim>
   ```

2. **Read the executor's final report.** If the sub-agent was interrupted, cut off, returned only a
   partial result, reports **Critical issues**, or reports a **failed gate** it could not resolve in
   scope → go to Phase D. Never infer success from a partial report.

3. **Dispatch the named `verifier` sub-agent in the foreground** only after the executor finishes:

   ```
   Working directory: <absolute repo path for this stage>
   Implementation plan (source of truth): <absolute plan path>
   Verify ONLY: <exact stage heading>

   The stage's changes are in the working tree, UNCOMMITTED. Review that diff only.
   The Working directory above is authoritative. Use absolute paths for every Read call and set it
   explicitly in every Bash call (`cd "<absolute repo path>" && <command>`).
   Inspect `git diff HEAD` plus the full contents of every untracked file reported by
   `git status --short --untracked-files=all`; plain `git diff` is not sufficient.
   Grade against this stage's gate criteria, acceptance checklist, footguns and "Do NOT" list —
   not a generic ideal and not another stage. Run this stage's gate commands yourself.
   Executor's report:
   <executor report, verbatim>
   ```

4. **Act on the verdict:**
   - **GREEN LIGHT** → go to Phase C (commit + push), then move to the next stage.
   - **RETURN TO EXECUTOR** → re-dispatch the `executor` with the blockers verbatim (step 1), then
     re-verify (step 3). Count the rounds: **max 3 fix rounds per stage**. If the 3rd fix round
     still does not produce a green light → Phase D.
   - **Critical issues** flagged by either agent → Phase D.

5. Never patch the code yourself to unblock a stuck loop, and never soften a verdict. Three failed
   rounds is a signal for the user, not a reason to improvise.

---

## Phase C — Commit and push (ONLY on a green light)

1. `git status --short --untracked-files=all` in that stage's repo. Confirm every changed path
   matches what the stage was supposed to touch. Inspect the complete diff, including every
   untracked file. **Never stage generated or ignored output** (`build/`, `lib/`, `dist/`, `release/`,
   `solution/`, `temp/`, `coverage/`, `*.scss.ts`, `.yalc/`, `node_modules/`). If unexpected or
   prohibited files appear → Phase D.
2. Stage only the validated paths with `git add -A -- <validated-path>...`; never run bare
   `git add -A`. Then inspect `git diff --cached --name-status`, the complete cached diff, and
   `git diff --cached --stat`. Confirm no prohibited/unexpected path is staged and no intended stage
   change remains unstaged or untracked. Keep `package.json` and `package-lock.json` in sync if the
   stage changed dependencies. Any mismatch → Phase D.
3. Write ONE Conventional Commit message using these rules (types:
   `feat`, `fix`, `chore`, `docs`, `refactor`; lowercase noun scope; imperative lowercase
   description). The body MUST contain this resume marker as its own line — keep the `Plan:`
   prefix exact, it is what Phase A step 5 greps for:

   ```
   Plan: <plan file basename> — Stage <N>: <stage name>
   ```

4. Commit (no confirmation prompt — the verifier's green light is the gate), then push to the
   **current branch**: `git push`, or `git push -u origin HEAD` when there is no upstream.
   - If the push is rejected (non-fast-forward, protected branch, auth) → Phase D. **Never
     force-push**, never rebase or reset without the user's explicit choice.
5. Confirm the pushed commit is on the current branch and the stage repo is clean. Report one line
   — `Stage <N> ✅ <short-sha> — <gate result>, <k> verifier round(s)` — and
   continue to the next stage **without asking**.

---

## Phase D — Critical issue: STOP and ask

Triggers: either agent reports Critical issues; a gate cannot pass without an out-of-scope change;
the plan contradicts the codebase; 3 fix rounds did not reach a green light; unexpected files in
the diff; a rejected push; a finding whose fix would change later stages or the plan's design; a
stage targets a repo/branch that is not prepared.

Stop the loop immediately and present:

- **What happened** — the failing stage, command, or agent finding, with the evidence (command
  output, agent report excerpt, `file:line`).
- **Why it blocks** — the concrete consequence.
- **Impact on the rest of the plan** — which remaining stages this puts at risk, explicitly.
- **Options** — 2–4 concrete, mutually distinct ways forward, each with its trade-off. Include the
  plan's rollback for this stage as the safe default when one exists.
- **Recommendation** — one line.

Then **wait for the user's decision**. Do not act until they choose. Leave the working tree exactly
as it is — do not revert, stash, or clean unless the user picks that option. Already-committed
stages stay committed.

---

## Phase E — Completion

When the selected run finishes:

- If every plan stage now has a verified, pushed resume-marker commit, report full plan completion:

  - a table of stages: stage, gate result, verifier rounds, commit sha,
  - the plan's overall **Definition of done**, item by item, with what verified each item,
  - anything deferred, out of scope, or flagged as a non-blocking follow-up by the verifier,
  - the suggested next step (`/pr`).

- If the user selected only part of the plan and other stages remain unfinished, report
  **selected range completed**, list the completed and remaining stages, and do NOT claim the
  overall Definition of done or suggest `/pr` yet.

---

## What NOT to do

- Do not write, edit, or fix source code yourself — dispatch the `executor`. Your only writes are
  git operations.
- Do not skip the `verifier`, and do not commit on anything other than an explicit green light.
- Do not bundle two stages into one commit, or commit a stage in a repo the plan did not name.
- Do not run stages in parallel or out of order without a plan line that authorizes it, and never
  two executors against one working tree.
- Do not edit the plan file, open a PR, force-push, or run destructive git commands.
- Do not ask for confirmation between stages after the Phase A go-ahead — only Phase D stops you.
- Do not report a gate as passed on the agents' word alone if their report shows it was not run.
