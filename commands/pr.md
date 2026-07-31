---
description: Generate a PR title and Markdown description from the commits on the current branch (optionally in a given project by number/name)
---

Generate a Pull Request title and description from all commits on the CURRENT branch that
are not yet on dev.

Input: $ARGUMENTS may optionally be a project selector — a number 1–5 or a project folder
name (see the map). If present, work in that project; if absent, work in the current project.
Example with number: 2
Example with name: SPDMS_Artifact_General
Example without: (no arguments)

1. Resolve the target project:
   a. If $ARGUMENTS is a number or a project name, read the map at `.claude/commands/projects.md`
      (relative to the current project root) and resolve it to a project folder <name>. If it is
      not in the map, STOP and show the map.
   b. Else use the current project (run `pwd` to confirm).
2. If a selector resolved to a <name>, the target is the sibling folder of the current project:
   `cd "$(dirname "$(pwd)")/<name>"` (quote paths with spaces). If that folder does not exist,
   STOP and report.
3. Determine the current branch: `git branch --show-current`.
4. Collect all commits on this branch that are not on dev:
   `git log dev..HEAD --pretty=format:"%h %s%n%b"`.
   Also inspect the overall change with `git diff dev...HEAD --stat` for context.
   If there are no commits ahead of dev, STOP and report that there is nothing to open a PR for.
5. From the commits, infer:
   - the dominant <type>: one of feat, fix (hotfix), refactor, chore, docs;
   - the <module> / area touched (a noun: Agreements, Search, Counterparty, versioning, …),
     derived from the changed files/folders and commit scopes.

OUTPUT — return everything in Markdown, in two clearly separated parts:

### Title

A single line, no trailing period, in the form:

`<type>(<module>): <short summary>`

- Use the project's wording for type where it differs: write `feature(...)` for a feature,
  `hotfix(...)` for a bug fix, `refactor(...)`, `chore(...)`, `docs(...)`.
- For a version bump use `chore(versioning): bump <package> to <version>`.
- Examples:
  - `feature(Agreements): implement bulk approval flow`
  - `hotfix(Search): fix results not clearing on tab switch`
  - `refactor(Counterparty): restructure footer into a dedicated component`
  - `chore(versioning): bump @spdms/general to 1.6.37`

### Description

Markdown body. Choose the shape by type:

- If the type is **hotfix/fix**, the description is REQUIRED and MUST have these sections:

  ```
  ## Problem
  <short summary of the bug / what was wrong>

  ## Fix
  <what was changed and how it resolves the problem>
  ```

- If the type is **feature**, **refactor**, or **chore**, a summary is OPTIONAL.
  - Include a short `## Summary` only if it adds value; otherwise omit it.
  - Always include a `## Changes` section: a concise bullet list of the notable changes,
    derived from the commits (group related commits; do not just paste the raw log).
  - For `chore(versioning)`, a one-line `## Changes` stating the package and version is enough.

Rules:

- Base everything strictly on the actual commits and diff — do not invent changes.
- Keep it concise and factual; bullets over prose for the change list.
- Output ONLY the Markdown (the `### Title` block and the `### Description` block). Do not
  run `gh`, do not create the PR, do not push — this command only drafts the text.
