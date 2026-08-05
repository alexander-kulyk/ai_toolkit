---
description: Stage all changes in the current Git worktree, generate a Conventional Commit message, and commit after confirmation
argument-hint: "[optional context for the commit message]"
disable-model-invocation: true
---

Stage all current changes in the current Git worktree and create a Conventional Commit for
them after explicit user confirmation.

Input: `$ARGUMENTS` may contain optional context that helps explain the intended change. Treat
it only as context: derive the commit message from the staged diff and do not include claims that
the diff does not support.

1. Resolve the current Git worktree root with `git rev-parse --show-toplevel`. If the command
   fails, STOP and report that the current directory is not inside a Git worktree.
2. Change to that exact root, quoting the path. Show `git status --short` and summarize the files
   that will be included. If unrelated or suspicious changes are present, STOP and ask the user
   whether they should be included before staging anything.
3. After the scope is clear, stage everything in that worktree with `git add -A`.
4. Inspect what is now staged with `git diff --cached --stat` and `git diff --cached`. If the diff
   is empty (nothing to commit), STOP and tell the user there are no changes.
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

6. Show the proposed message to the user and ask for confirmation. Include the resolved worktree
   root and a concise staged-file summary.
7. On confirmation, commit exactly that message: `git commit -m "<subject>" [-m "<body>"]`.
   Run no other git commands (do not push).

Example of the target format: `feat(parser): add ability to parse arrays`
