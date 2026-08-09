---
name: implement-plan
description: Execute an OpenSpec change, specification package, or standalone implementation plan through a staged executor-verifier loop
argument-hint: '"<openspec-change-or-plan-path>" [from N | stage N | stages N-M] [--push]'
disable-model-invocation: true
---

Implement a reviewed OpenSpec change, specification package, or standalone
implementation plan one stage at a time using the named `executor` and
`verifier` agents.

This command is an orchestrator. It does not research, redesign, implement, or
verify the change itself. It resolves the planning artifacts, fixes the execution
order, dispatches one implementation unit at a time, gates each unit through an
independent verifier, and creates a local commit only after a green light.

## Input

`$ARGUMENTS` must contain exactly one quoted or unquoted source path followed by
at most one stage selector and the optional `--push` flag.

The source path may be:

1. An OpenSpec change directory containing `.openspec.yaml`, `proposal.md`,
   `tasks.md`, and the specs/design artifacts required by its schema.

2. A legacy specification-package directory containing:

   ```text
   report/research-report.md
   plan/implementation-plan.md
   tasks/tasks.md
   ```

3. A standalone readable Markdown implementation-plan file. If that file belongs
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
/implement-plan openspec/changes/add-calendar
/implement-plan openspec/changes/add-calendar stage 2
```

A selector limits the requested run; it never authorizes skipping an unfinished
dependency.

If the source path is absent or ambiguous, the selector is malformed, or other
arguments remain, stop and show the accepted syntax. Never guess which plan to
execute.

## Source-of-truth roles and precedence

For an OpenSpec change, use all completed artifacts together with these roles:

1. **Delta specs** — authoritative for observable behavior, inputs, outputs,
   errors, compatibility, and scenarios.
2. **Design** — authoritative for technical decisions, architecture, migrations,
   and trade-offs. It may be absent only when the schema deliberately skipped it.
3. **Tasks** — authoritative for Stage boundaries, execution order, included
   work, dependencies, `Validation`, `Done when`, `Do not`, and `Rollback`.
4. **Proposal** — authoritative for motivation, capability scope, impact, and
   explicit non-goals not superseded by later artifacts.
5. **Research** — supporting evidence and rationale only. It must not override a
   decision explicitly resolved by proposal, specs, or design.

For a legacy specification package, use all three artifacts with this precedence:

1. **Implementation plan** — authoritative for scope, design, stage boundaries,
   dependencies, guardrails, rollback, and overall definition of done.
2. **Task decomposition** — authoritative for the concrete tasks, deliverables,
   task dependencies, task acceptance criteria, and estimates within each stage.
3. **Research report** — supporting context for requirements, evidence, risks,
   edge cases, assumptions, and design rationale.

The prompt's stage selector controls execution scope and overrides only which
eligible stages run. It does not override artifact requirements or dependencies.

If authoritative artifacts contradict one another, contain unresolved
placeholders or decisions that affect implementation, map a task to a nonexistent
Stage, or leave a requested Stage without objective validation, stop before
implementation. Report the exact conflict and recommend updating the artifacts.
Do not reconcile them inside this command.

For a standalone plan, that plan is the only source of truth and must contain all
information needed for safe execution.

## Phase A — Resolve and validate the work

1. Parse `$ARGUMENTS` into one source path, zero or one selector, and the optional
   `--push` flag. Preserve quoted paths containing spaces.
2. Resolve the source from the current working directory and canonicalize it to
   an absolute path. Reject missing, unreadable, or ambiguous sources.
3. Resolve the artifacts:
   - for an OpenSpec change directory, require `.openspec.yaml`, then run
     `openspec status --change "<change-name>" --json` and resolve artifact paths
     from its result instead of assuming a fixed schema. Require every artifact
     transitively needed by apply to be `done` or deliberately `skipped`. Run
     `openspec validate "<change-name>" --type change --strict --no-interactive`
     and stop on any failure. Require `proposal.md` and `tasks.md`; load every
     delta spec, plus `design.md` and `research.md` when present;
   - for a legacy package directory, require the exact three files in the standard
     structure;
   - for a standard-package plan file, derive and require its sibling report and
     task files; and
   - for any other plan file, use it as a standalone plan and do not invent
     sibling paths.
4. Resolve the Git working-tree root containing the source. Every resolved
   artifact must be inside the same working tree. This command requires Git
   because Stage isolation, verification, resume detection, and atomic Stage
   commits depend on it. If no Git working tree contains the source, stop and
   explain this requirement.
5. Compute a stable, project-relative **plan ID**:
   - for an OpenSpec change or legacy package, use its directory relative to the
     working tree root; or
   - for a standalone plan, use the plan file path relative to the working-tree
     root.

   Never use only the plan basename: standard packages deliberately reuse
   `implementation-plan.md`.
6. Discover and read the applicable project instructions, contribution rules,
   architecture guidance, skills, and version-control conventions. Do not assume
   any particular instruction filename, documentation path, operating system,
   shell, language, framework, package manager, default branch name, remote, or
   generated-output directory.
7. Read every resolved artifact in full. For OpenSpec, apply the source roles
   above rather than pretending `design.md` alone is an implementation plan.
   Extract and cross-check:
   - ordered stage identifiers and exact headings;
   - goals, requirements, dependencies, affected areas, and changes;
   - spec requirements and scenarios, validation actions, `Done when` criteria,
     risks, mitigations, rollback, and `Do not` guardrails;
   - tasks belonging to each stage, including their dependencies, deliverables,
     acceptance criteria, and validation;
   - requirements-to-stage and requirements-to-task traceability;
   - cross-cutting concerns, out-of-scope items, and overall definition of done;
     and
   - high-impact assumptions or unknowns that must be validated before dependent
     work begins.
8. Treat each Stage's `Validation` section and any task-specific checks as its
   gate. A Stage is not executable unless it has both objective `Done when`
   criteria and runnable validation, or explicitly defines a manual observation
   with a responsible verifier. For OpenSpec, every `## N. <name>` section in
   `tasks.md` is a Stage and must satisfy this contract.
9. Validate the dependency graph. Reject missing dependencies, cycles, duplicate
   Stage or task identifiers, tasks outside a Stage, and selector ranges that do
   not match the source. Use explicit `Depends on` edges first and strict document
   order as the default dependency when no edge is declared.
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
2. Require a clean working tree before the first Stage. This includes every
   resolved artifact: planning artifacts must be committed before they can act as
   the implementation source of truth. If any change exists,
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
6. Mark Stages complete only when their exact marker is reachable from the
   current `HEAD` and no later history clearly reverted that stage. Validate that
   every selected stage's predecessors and declared dependencies are complete or
   included earlier in the current run.
   - For OpenSpec, require the matching Stage checkboxes to be checked when a
     marker exists.
   - If checkboxes are checked without a reachable marker, do not assume this
     verifier workflow completed them; stop and report the status mismatch.
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
   Source type: <OpenSpec change | legacy package | standalone plan>
   Plan ID: <project-relative plan ID>
   Research context: <absolute path or "not provided">
   Proposal: <absolute path or "not provided">
   Behavior specs: <absolute paths or "not provided">
   Technical design: <absolute path or "not provided">
   Execution stages and tasks: <absolute path or "not provided">
   Legacy implementation plan: <absolute path or "not provided">
   Execute only: <exact stage identifier and heading>
   Included tasks: <task IDs and titles for this stage, or "defined by the plan">

   Discover and follow all applicable project instructions and skills. Read the
   complete source bundle, current Stage, and every included task before editing.
   Apply the source-of-truth roles supplied by the orchestrator. Stop on any
   conflict; do not resolve or redesign planning artifacts yourself.

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
   Source type: <OpenSpec change | legacy package | standalone plan>
   Plan ID: <project-relative plan ID>
   Research context: <absolute path or "not provided">
   Proposal: <absolute path or "not provided">
   Behavior specs: <absolute paths or "not provided">
   Technical design: <absolute path or "not provided">
   Execution stages and tasks: <absolute path or "not provided">
   Legacy implementation plan: <absolute path or "not provided">
   Verify only: <exact stage identifier and heading>
   Included tasks: <task IDs and titles for this stage, or "defined by the plan">

   The stage changes are uncommitted. Discover and follow the applicable project
   instructions. Inspect the complete tracked and untracked diff, including the
   full contents of new files. Verify only this Stage against the resolved source
   bundle: included task deliverables, spec requirements and scenarios, design
   decisions, Done-when criteria, validation, rollback constraints, risks, and
   Do-not guardrails.

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
2. For an OpenSpec source, after the green light change only the included
   Stage's task markers from `- [ ]` to `- [x]` in `tasks.md`. Do not alter task
   text, headings, gates, or any other artifact content. Inspect this mechanical
   metadata diff and stop if it contains anything else.
3. Exclude files prohibited by project rules, ignored/generated artifacts,
   caches, local environment files, credentials, secrets, and unrelated changes.
   If expected source and lock or metadata files are inconsistent, or any path is
   uncertain, go to Phase E.
4. Stage only the exact validated paths plus the exact OpenSpec checkbox updates.
   Never use an unscoped stage-all command.
   Inspect the complete staged diff and staged path list, then confirm no intended
   stage change remains unstaged or untracked.
5. Create one commit following the repository's documented commit convention. If
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
6. If the commit fails or hooks modify files outside the verified diff, go to
   Phase E. Never bypass hooks.
7. When `--push` is absent, keep the commit local. When `--push` is present, push
   normally to the confirmed current branch, establishing its upstream only when
   necessary. Never force-push, rewrite history, or switch destinations.
8. Confirm the stage commit is reachable from `HEAD`, the marker is present, and
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

When every Stage of an OpenSpec change is complete, recommend running the
project's OpenSpec verification and archive workflow.

For a partial selector, say **selected scope completed** rather than claiming the
whole plan is done. When commits remain local, state that clearly.

## Boundaries

- Do not implement or verify code in the orchestrator; always use the named
  agents.
- Do not execute a plan that is incomplete, contradictory, or missing objective
  validation.
- Do not edit planning artifacts during implementation except the exact OpenSpec
  checkbox updates permitted after a verifier green light.
- Do not skip dependencies, stages, task acceptance criteria, or the verifier.
- Do not run concurrent executors against one working tree.
- Do not commit without a green light or include unreviewed paths.
- Do not push unless `--push` was supplied and authorized in preflight.
- Do not open a pull request, force-push, rewrite history, or run destructive
  version-control commands.
