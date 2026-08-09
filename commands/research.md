---
name: research
description: Research supplied change requirements and save one evidence-based research.md in an OpenSpec change
argument-hint: '"<feature or change requirements>"'
disable-model-invocation: true
---

Run the `researcher` agent for the requirements supplied in `$ARGUMENTS`.

This command initializes or reuses an OpenSpec change and delegates evidence
gathering. It does not produce a proposal, specification, design, implementation
plan, task decomposition, or product code.

## Input

`$ARGUMENTS` must contain a non-empty description of the feature, change,
refactor, migration, or bug fix to research. Preserve it verbatim when
delegating.

Example:

```text
/research "Add a calendar with event creation, editing, and deletion"
```

If `$ARGUMENTS` is empty or contains only whitespace, stop and show:

```text
Usage: /research "<feature or change requirements>"
```

Do not infer a feature automatically from unrelated repository content.

## Workflow

1. Resolve the project root:
   - inside a Git working tree, use its top-level directory;
   - otherwise, use the current working directory; and
   - canonicalize the result to an absolute path.
2. Verify the project has an OpenSpec root by locating `openspec/config.yaml`.
   If it does not, stop and explain that this command stores research inside an
   OpenSpec change.
3. Derive a concise lowercase kebab-case change name from the primary requested
   outcome, preferably an action and object such as `add-calendar` or
   `fix-session-timeout`.
   - Reuse an existing change only when its metadata and artifacts clearly refer
     to the same requested outcome.
   - If the candidate name belongs to different work, choose a more specific
     name rather than overwriting it.
4. Resolve the change scaffold:
   - If `openspec/changes/<change-name>/.openspec.yaml` exists, preserve it and
     all existing artifacts.
   - Otherwise run `openspec new change "<change-name>"` from the project root.
   - If the OpenSpec CLI is unavailable or scaffold creation fails, stop. Do not
     hand-create OpenSpec metadata or dispatch the researcher into an invalid
     change.
5. Dispatch the named `researcher` agent once, in the foreground, with this
   task:

   ```text
   Project root: <absolute project root>
   OpenSpec change name: <change-name>
   Research output: <absolute project root>/openspec/changes/<change-name>/research.md

   Requirements (preserve verbatim):
   <all of $ARGUMENTS>

   Run your complete evidence-research workflow and follow your agent definition
   exactly. Investigate the project's applicable instructions, documentation,
   active OpenSpec changes, architecture, source, tests, conventions, and any
   relevant authoritative external contracts.

   Write or update only the supplied research.md. Preserve the OpenSpec metadata
   and every other existing artifact. Do not create a proposal, specification,
   design, implementation plan, task decomposition, effort estimate, or product
   change.
   ```
6. Wait for the agent's final result. Do not perform its research or edit the
   artifact in the command orchestrator.
7. Treat an interrupted, partial, or failed run as incomplete. Report the
   failure and do not claim that research was completed.
8. Validate the completed result:
   - the reported path exactly matches the selected change's `research.md`;
   - the file exists, is readable, is non-empty Markdown, and begins with
     `# Research:`;
   - it contains an evidence inventory, labeled findings, risks and edge cases,
     unknowns/assumptions/decisions, research coverage, and an OpenSpec handoff;
   - project-specific verified claims cite source locations;
   - it does not contain implementation stages, task IDs, delivery estimates,
     or claim that implementation was performed; and
   - no files other than the change scaffold and `research.md` were written by
     this command and agent.
9. If validation fails, report each failed check. Do not repair or invent the
   research in the orchestrator.
10. If validation succeeds, return:
    - the selected change name;
    - a clickable path to `research.md`;
    - confidence and the recommended direction;
    - blocking unknowns or decisions; and
    - the next action: use OpenSpec proposal generation for the same change and
      require it to read `research.md` first.

## Boundaries

- Run only the `researcher` agent; do not substitute another agent.
- Do not ask for confirmation before dispatch.
- Do not generate or modify OpenSpec planning artifacts after scaffolding.
- Do not implement, test the future implementation, commit, push, or open a pull
  request.
- Do not claim success unless the single research artifact passes validation.
