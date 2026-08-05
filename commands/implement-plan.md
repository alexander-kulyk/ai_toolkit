---
name: implement-plan
description: Execute a specification package or standalone implementation plan stage by stage through an executor-verifier loop, creating verified local commits with optional pushing
argument-hint: '"<spec-package-or-plan-path>" [from N | stage N | stages N-M] [--push]'
disable-model-invocation: true
---

Implement a reviewed specification package or standalone implementation plan one
stage at a time using the named `executor` and `verifier` agents.

This command is an orchestrator. It does not research, redesign, implement, or
verify the change itself. It resolves the planning artifacts, fixes the execution
order, dispatches one implementation unit at a time, gates each unit through an
independent verifier, and creates a local commit only after a green light.

## Input

`$ARGUMENTS` must contain exactly one quoted or unquoted source path followed by
at most one stage selector and the optional `--push` flag.

The source path may be:

1. A specification-package directory containing:

   ```text
   report/research-report.md
   plan/implementation-plan.md
   tasks/tasks.md
   ```

2. A standalone readable Markdown implementation-plan file. If that file belongs
   to the standard package structure above, automatically load and require its
   sibling report and task artifacts. Otherwise, run from the plan alone.

Selectors:

- no selector — run every unfinished stage in plan order;
- `from N` — run Stage N and every later stage;
- `stage N` — run only Stage N;
- `stages N-M` — run only that inclusive, contiguous range.

`--push` is independent of the selector and may appear before or after it. Without
`--push`, verified stage commits remain local. With `--push`, push each verified
stage commit to the current branch.

Examples:

```text
/implement-plan specs/add-calendar
/implement-plan specs/add-calendar stage 2
/implement-plan specs/add-calendar/plan/implementation-plan.md from 3
/implement-plan "specs/improve search" stages 2-4 --push
```

A selector limits the requested run; it never authorizes skipping an unfinished
dependency.

If the source path is absent or ambiguous, the selector is malformed, or other
arguments remain, stop and show the accepted syntax. Never guess which plan to
execute.

## Source-of-truth precedence

When a complete specification package is available, use all three artifacts with
this precedence:

1. **Implementation plan** — authoritative for scope, design, stage boundaries,
   dependencies, guardrails, rollback, and overall definition of done.
2. **Task decomposition** — authoritative for the concrete tasks, deliverables,
   task dependencies, task acceptance criteria, and estimates within each stage.
3. **Research report** — supporting context for requirements, evidence, risks,
   edge cases, assumptions, and design rationale.

The prompt's stage selector controls execution scope and overrides only which
eligible stages run. It does not override artifact requirements or dependencies.

If the artifacts contradict one another, contain unresolved placeholders, map a
task to a nonexistent stage, or leave the requested stage without objective
validation, stop before implementation. Report the exact conflict and recommend
updating the specification package. Do not reconcile planning artifacts inside
this command.

For a standalone plan, that plan is the only source of truth and must contain all
information needed for safe execution.

## Phase A — Resolve and validate the work

1. Parse `$ARGUMENTS` into one source path, zero or one selector, and the optional
   `--push` flag. Preserve quoted paths containing spaces.
2. Resolve the source from the current working directory and canonicalize it to
   an absolute path. Reject missing, unreadable, or ambiguous sources.
3. Resolve the artifacts:
   - for a package directory, require the exact three files in the standard
     structure;
   - for a standard-package plan file, derive and require its sibling report and
     task files; and
   - for any other plan file, use it as a standalone plan and do not invent
     sibling paths.
4. Resolve the Git working-tree root containing the plan. The plan and every
   package artifact must be inside the same working tree. This command requires
   Git because stage isolation, verification, resume detection, and atomic stage
   commits depend on it. If no Git working tree contains the plan, stop and
   explain this requirement.
5. Compute a stable, project-relative **plan ID**:
   - for a standard package, use the package directory relative to the working
     tree root; or
   - for a standalone plan, use the plan file path relative to the working-tree
     root.

   Never use only the plan basename: standard packages deliberately reuse
   `implementation-plan.md`.
6. Discover and read the applicable project instructions, contribution rules,
   architecture guidance, skills, and version-control conventions. Do not assume
   any particular instruction filename, documentation path, operating system,
   shell, language, framework, package manager, default branch name, remote, or
   generated-output directory.
7. Read every resolved planning artifact in full. Extract and cross-check:
   - ordered stage identifiers and exact headings;
   - goals, requirements, dependencies, affected areas, and changes;
   - acceptance criteria, validation actions, expected outcomes, risks,
     mitigations, rollback, and `Do not` guardrails;
   - tasks belonging to each stage, including their dependencies, deliverables,
     acceptance criteria, and validation;
   - requirements-to-stage and requirements-to-task traceability;
   - cross-cutting concerns, out-of-scope items, and overall definition of done;
     and
   - high-impact assumptions or unknowns that must be validated before dependent
     work begins.
8. Treat a plan's `Validation` section and a task's validation checks as the gate
   for that execution unit. A stage is not executable unless its combined checks
   are objective and runnable or explicitly define a manual observation with a
   responsible verifier.
9. Validate the dependency graph. Reject missing dependencies, cycles, duplicate
   stage or task identifiers, unmapped required tasks, and selector ranges that
   do not match the plan. Default to strict document order whenever ordering is
   ambiguous.
10. Keep execution inside the resolved working tree. If a stage requires changes
    in another repository or working tree, stop and ask for a separate invocation
    or an explicitly prepared multi-worktree workflow. Never infer sibling
    repository locations.

## Phase B — Repository preflight and resume detection

1. In the resolved working-tree root, inspect:
   - the current branch and whether `HEAD` is detached;
   - complete tracked, staged, untracked, and submodule status;
   - remotes and upstream configuration when `--push` was requested; and
   - the repository's configured default branch when it can be determined from
     local references without guessing names.
2. Require a clean working tree before the first stage. This includes the
   specification package: planning artifacts must be committed before they can
   act as an immutable implementation source of truth. If any change exists,
   stop and list it. Do not stash, discard, stage, or commit pre-existing work.
3. Stop on a detached `HEAD`. If the current branch is known to be the default
   branch, show that fact and request an explicit choice to create/use a feature
   branch or deliberately continue. Do not create or switch branches
   automatically.
4. If `--push` was requested, require a configured remote and confirm the exact
   destination branch. A missing upstream is allowed only if the eventual push
   can safely establish one without overwriting remote history.
5. Detect prior stage completion on the current branch using exact commit-body
   markers:

   ```text
   Plan-ID: <project-relative plan ID>
   Plan-Stage: <stage identifier> — <stage title>
   ```

   Inspect matching commits rather than accepting a subject-line coincidence.
   A marker from another plan, branch, or working tree does not count.
6. Mark stages complete only when their exact marker is reachable from the
   current `HEAD` and no later history clearly reverted that stage. Validate that
   every selected stage's predecessors and declared dependencies are complete or
   included earlier in the current run.
7. Fix the execution order before making changes:
   - run selected unfinished stages sequentially in dependency-safe order;
   - skip an already completed selected stage and report its commit;
   - never execute two agents concurrently against the same working tree; and
   - treat plan-authorized parallelism only as permission to choose a safe serial
     order unless separate working trees were explicitly prepared outside this
     command.
8. Show one preflight summary containing:
   - project root, current branch, and push mode;
   - plan ID and resolved artifact paths;
   - selected stages, completed stages, and execution order;
   - tasks and gate checks for each stage to be run;
   - high-impact assumptions scheduled for validation; and
   - the fact that every green stage creates one local commit.

Ask for one go-ahead. That approval authorizes the listed implementation work,
validation commands, local stage commits, and pushes only when `--push` was
explicitly supplied. Afterward, continue without pausing unless Phase E is
triggered.

## Phase C — Executor and verifier loop

For each selected unfinished stage, in the fixed order:

1. Dispatch the named `executor` agent in the foreground with:

   ```text
   Working tree root: <absolute path>
   Plan ID: <project-relative plan ID>
   Research report: <absolute path or "not provided">
   Implementation plan: <absolute path>
   Task decomposition: <absolute path or "not provided">
   Execute only: <exact stage identifier and heading>
   Included tasks: <task IDs and titles for this stage, or "defined by the plan">

   Discover and follow all applicable project instructions and skills. Read the
   complete current plan stage and every included task before editing. Use the
   implementation plan for scope and design, the task artifact for execution
   detail, and the report only for supporting rationale. Stop on any conflict.

   Work only inside the supplied working tree and only on the current stage.
   Follow its dependencies, acceptance criteria, validation, rollback,
   mitigations, and Do-not guardrails. Do not start another stage and do not edit
   any planning artifact.

   Run the stage and task validation checks exactly as written and report the
   real results. Do not commit. Leave only this stage's implementation changes in
   the working tree for independent verification.

   <On a retry only: fix exactly these verifier blockers, quoted verbatim.>
   ```
2. Read the complete executor report. Treat the run as blocked if it is partial,
   interrupted, claims unrun validation passed, reports an unresolved failure, or
   requests changes outside the current stage.
3. Confirm that the working tree contains changes before verification. If the
   executor reports success with no diff, accept that only when the stage is
   explicitly validation-only and its plan defines that expected outcome.
4. Dispatch the named `verifier` agent in the foreground with:

   ```text
   Working tree root: <absolute path>
   Plan ID: <project-relative plan ID>
   Research report: <absolute path or "not provided">
   Implementation plan: <absolute path>
   Task decomposition: <absolute path or "not provided">
   Verify only: <exact stage identifier and heading>
   Included tasks: <task IDs and titles for this stage, or "defined by the plan">

   The stage changes are uncommitted. Discover and follow the applicable project
   instructions. Inspect the complete tracked and untracked diff, including the
   full contents of new files. Verify only this stage against the plan scope,
   included task deliverables, requirements, acceptance criteria, validation,
   rollback constraints, risks, and Do-not guardrails.

   Run the exact non-destructive validation checks yourself. Do not rely on the
   executor's claims, edit files, commit, or review unrelated future stages.

   Executor report:
   <executor report verbatim>
   ```
5. Act only on the verifier's explicit verdict:
   - **GREEN LIGHT** — continue to Phase D for this stage.
   - **RETURN TO EXECUTOR** — send the blockers verbatim to the executor, then
     re-run the verifier. Allow at most three fix-and-verify rounds after the
     initial verification.
   - **Critical issue or ambiguous verdict** — go to Phase E.
6. The orchestrator never patches code, relaxes a gate, reclassifies a blocker,
   or silently expands stage scope.

## Phase D — Create the verified stage commit

Run this phase only after an explicit verifier green light.

1. Inspect complete tracked, staged, and untracked changes. Confirm every changed
   path belongs to the current stage and was reviewed by the verifier.
2. Exclude files prohibited by project rules, ignored/generated artifacts,
   caches, local environment files, credentials, secrets, and unrelated changes.
   If expected source and lock or metadata files are inconsistent, or any path is
   uncertain, go to Phase E.
3. Stage only the exact validated paths. Never use an unscoped stage-all command.
   Inspect the complete staged diff and staged path list, then confirm no intended
   stage change remains unstaged or untracked.
4. Create one commit following the repository's documented commit convention. If
   none exists, use a concise Conventional Commit subject appropriate to the
   actual change. Include these exact body markers:

   ```text
   Plan-ID: <project-relative plan ID>
   Plan-Stage: <stage identifier> — <stage title>
   ```
   If the stage is explicitly validation-only and correctly produced no diff,
   create an intentional empty marker commit after the verifier's green light so
   resume detection remains deterministic. Never use an empty commit to hide a
   missing implementation diff.
5. If the commit fails or hooks modify files outside the verified diff, go to
   Phase E. Never bypass hooks.
6. When `--push` is absent, keep the commit local. When `--push` is present, push
   normally to the confirmed current branch, establishing its upstream only when
   necessary. Never force-push, rewrite history, or switch destinations.
7. Confirm the stage commit is reachable from `HEAD`, the marker is present, and
   the working tree is clean before starting the next stage. Report:

   ```text
   Stage <ID> complete — <short commit ID> — <gate result> — <verifier rounds>
   ```

## Phase E — Stop on a critical issue

Stop immediately when:

- an artifact conflict or dependency problem invalidates the plan;
- the repository is not safely prepared;
- an executor or verifier reports a critical issue;
- validation cannot pass without out-of-scope work;
- three fix-and-verify rounds do not reach a green light;
- the changed or staged paths contain unexpected, generated, sensitive, or
  unreviewed content;
- a commit, hook, or requested push fails; or
- resolving the problem would alter the plan's design or later stages.

Report:

- what happened, with concrete command or source evidence;
- why it blocks the current stage;
- the impact on later stages;
- two to four distinct options with trade-offs;
- the plan's rollback option when applicable; and
- one recommended option.

Then wait for the user's decision. Preserve the working tree exactly as it is.
Do not revert, reset, clean, stash, commit, or retry with weaker checks unless the
user explicitly selects that action.

## Phase F — Completion

When the selected run finishes, report:

- plan ID, project root, branch, and whether commits were pushed;
- each selected stage, its gate result, verifier rounds, and commit ID;
- completed and remaining stages;
- the overall definition of done with evidence only when every stage is complete;
- deferred, out-of-scope, and non-blocking follow-up items; and
- the appropriate next step from the project's own delivery workflow.

For a partial selector, say **selected scope completed** rather than claiming the
whole plan is done. When commits remain local, state that clearly.

## Boundaries

- Do not implement or verify code in the orchestrator; always use the named
  agents.
- Do not execute a plan that is incomplete, contradictory, or missing objective
  validation.
- Do not edit the report, plan, or task artifacts during implementation.
- Do not skip dependencies, stages, task acceptance criteria, or the verifier.
- Do not run concurrent executors against one working tree.
- Do not commit without a green light or include unreviewed paths.
- Do not push unless `--push` was supplied and authorized in preflight.
- Do not open a pull request, force-push, rewrite history, or run destructive
  version-control commands.
