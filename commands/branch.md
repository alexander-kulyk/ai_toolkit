---
description: Create and publish a branch from dev (optionally in a given project by number/name)
---

Create a git branch from dev for a task.

Input: $ARGUMENTS may optionally start with a project selector — a number 1–5 or a project
folder name (see the map) — followed by the task line.
Example with number: 2 hotfix 43522 Signing type field not filled
Example with name: SPDMS_Artifact_General hotfix 43522 Signing type field not filled
Example without: hotfix 43522 Signing type field not filled

Steps:

1. Resolve the target project, then the rest of $ARGUMENTS is the task line:
   a. If the first whitespace-separated token is a number or a project name, read the map at
      `.claude/commands/projects.md` (relative to the current project root) to resolve it to a
      project folder <name>, and drop that token from the arguments. If it is not in the map,
      STOP and show the map.
   b. Else use the current project (run `pwd` to confirm).
2. If a selector resolved to a <name>, the target is the sibling folder of the current project:
   `cd "$(dirname "$(pwd)")/<name>"` (quote paths with spaces). If that folder does not exist,
   STOP and report.
3. Parse the task line into <type> (first word), <number> (the digits), <title> (the rest).
4. branch = <type>/<number>-<slug>, slug = title lowercased, every non-alphanumeric
   run -> single hyphen, trimmed.
5. git checkout dev; git pull --ff-only origin dev; git checkout -b <branch>;
   git push -u origin <branch>; print the working directory and the branch name.
   If checkout/pull fails (uncommitted changes), STOP and report — do not force. Run no other git commands.
