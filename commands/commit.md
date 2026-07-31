---
description: Stage all changes, generate a Conventional Commit message, and commit (optionally in a given project by number/name)
---

Stage all current changes and create a Conventional Commit for them.

Input: $ARGUMENTS may optionally be a project selector — a number 1–5 or a project folder
name (see the map). If present, commit in that project; if absent, commit in the current project.
Example with number: 2
Example with name: SPDMS_Artifact_General
Example without: (no arguments)

1. Resolve the target project:
   a. If $ARGUMENTS is a number or a project name, read the map at `.claude/commands/projects.md`
      (relative to the current project root) and resolve it to a project folder <name>. If it is
      not in the map, STOP and show the map.
   b. Else use the current project (run `pwd` to confirm where you are).
2. If a selector resolved to a <name>, the target is the sibling folder of the current project:
   `cd "$(dirname "$(pwd)")/<name>"` (quote paths with spaces). If that folder does not exist,
   STOP and report.
3. Stage everything: run `git add -A`.
4. Inspect what is now staged: run `git diff --cached`. If the diff is empty (nothing to
   commit), STOP and tell the user there are no changes.
5. Analyze the diff and write ONE commit message in this exact format:

   <type>(<scope>): <description>

   [optional body]

   Rules:

   - <type> is one of ONLY: feat, fix, chore, docs, refactor.
     - feat — a new feature / capability added
     - fix — a bug fix
     - chore — maintenance; USE for version bumps (package.json/package-solution.json version changes)
     - docs — documentation-only changes (.md, comments, ADRs)
     - refactor — code change that neither fixes a bug nor adds a feature (moves, renames, restructuring)
       Pick the single best-fitting type based on what the diff actually does. If the diff
       mixes concerns (e.g. a feat AND a fix), say so and recommend the dominant type, but
       do not invent a combined type.
   - <scope> is a lowercase noun naming the touched area of the codebase, in parentheses
     (e.g. parser, dms-store, auth). Derive it from the changed files/folders. Omit the
     scope only if no single area fits: `<type>: <description>`.
   - <description> is a short, imperative, lowercase summary, no trailing period,
     ideally <= 72 chars (e.g. "add ability to parse arrays").
   - Add a body (one blank line after the description) ONLY if the change needs context the
     description cannot carry; otherwise omit it. Keep it factual, wrapped at ~100 chars.
   - Do NOT use any type outside the five above. Do NOT fabricate changes not in the diff.

6. Show the proposed message to the user and ask for confirmation. Include which working
   directory will be committed to.
7. On confirmation, commit exactly that message: `git commit -m "<subject>" [-m "<body>"]`.
   Run no other git commands (do not push).

Example of the target format: `feat(parser): add ability to parse arrays`
