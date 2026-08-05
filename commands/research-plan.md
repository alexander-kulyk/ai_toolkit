---
name: research-plan
description: Run the research-planner agent on supplied requirements and generate a research report, implementation plan, and task decomposition under specs
argument-hint: '"<feature or change requirements>"'
disable-model-invocation: true
---

Run the `research-planner` agent for the requirements supplied in `$ARGUMENTS`.

This command only orchestrates planning. It must not research the change itself,
write implementation code, or expand the requested scope.

## Input

`$ARGUMENTS` must contain a non-empty description of the feature, change,
refactor, migration, or bug fix to research and plan. Preserve the requirements
verbatim when delegating them.

Example:

```text
/research-plan "Add a calendar with event creation, editing, and deletion"
```

If `$ARGUMENTS` is empty or contains only whitespace, stop and show:

```text
Usage: /research-plan "<feature or change requirements>"
```

Do not infer requirements from the repository or select work automatically.

## Workflow

1. Resolve the project root:
   - When the current directory is inside a Git working tree, use that working
     tree's top-level directory.
   - Otherwise, use the current working directory.
   - Canonicalize the result to an absolute path.
2. Dispatch the named `research-planner` agent once, in the foreground, with the
   following task:

   ```text
   Project root: <absolute project root>

   Requirements (preserve verbatim):
   <all of $ARGUMENTS>

   Run your complete autonomous workflow in order:
   1. research and save the report;
   2. read the saved report and save the implementation plan;
   3. read both saved artifacts and save the decomposed tasks.

   Follow your agent definition exactly. Discover the project's applicable
   instructions, documentation, skills, architecture, source, tests, and
   conventions without assuming project-specific paths or technologies.

   Write only these planning artifacts beneath the project root:
   - specs/<feature-name>/report/research-report.md
   - specs/<feature-name>/plan/implementation-plan.md
   - specs/<feature-name>/tasks/tasks.md

   Do not implement the requested change. Do not pause between phases or ask
   questions. Record unresolved matters as assumptions, unknowns, or open
   decisions and continue with the safest reversible planning default.

   Return the selected feature name, all three absolute artifact paths, the
   recommended approach, the overall effort range and confidence, and any
   high-impact assumptions or unknowns.
   ```
3. Wait for the agent's final result. Do not perform any of its research,
   planning, decomposition, or file writing in the command orchestrator.
4. Treat an interrupted, partial, or failed agent run as incomplete. Report the
   failure and do not claim that specifications were generated.
5. On a completed run, validate the result before reporting success:
   - all three reported artifact paths are inside the same
     `specs/<feature-name>/` directory under the resolved project root;
   - the paths exactly match the required `report`, `plan`, and `tasks`
     structure;
   - every artifact exists, is readable, is a non-empty Markdown file, and has
     the expected top-level title;
   - the report contains requirements, findings, risks, edge cases, unknowns,
     and a recommended approach;
   - the plan contains ordered stages, acceptance criteria, validation,
     rollback, and requirements traceability; and
   - the task file contains task IDs, titles, descriptions, dependencies,
     acceptance criteria, validation, effort estimates, and requirements
     traceability.
6. If validation fails, report each missing or invalid artifact. Do not repair or
   invent its contents in the orchestrator and do not begin implementation.
7. If validation passes, return a concise summary containing:
   - the selected feature name;
   - clickable paths to the report, plan, and tasks;
   - the recommended approach in one sentence;
   - the overall effort range and confidence; and
   - high-impact assumptions or unknowns that implementation should validate
     first.

## Boundaries

- Run only the `research-planner` agent; do not substitute another agent.
- Do not ask for confirmation before dispatch or between phases.
- Do not implement, commit, push, open a pull request, or invoke an
  implementation command.
- Do not alter the generated artifacts after the agent returns.
- Do not claim success unless all three artifacts pass validation.
