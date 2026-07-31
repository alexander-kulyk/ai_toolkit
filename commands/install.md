---
description: Install latest version of known packages with --legacy-peer-deps (optionally into a given project by number/name)
---

Install the latest version of one or more known packages.

Input: $ARGUMENTS may optionally start with a project selector — a number 1–5 or a project
folder name (see the map) — followed by package aliases.
Example with number: 2 lib general
Example with name: SPDMS_Artifact_General lib general
Example without: lib general

Package alias map:

- lib | library | components -> @smartpoint/library-components
- general -> @spdms/general
- tasks -> @smartpoint/spi-tasks

Steps:

1. Resolve the target project (then the rest of $ARGUMENTS is the package aliases):
   a. If the first whitespace-separated token is a number or a project name, read the map at
      `.claude/commands/projects.md` (relative to the current project root) to resolve it to a
      project folder <name>, and drop that token from the arguments. If it is not in the map,
      STOP and show the map.
   b. Else use the current project root (run `pwd` to confirm where you are).
2. If a selector resolved to a <name>, the target is the sibling folder of the current project:
   `cd "$(dirname "$(pwd)")/<name>"`. If that folder does not exist, STOP and report.
3. Resolve each remaining token to a package name via the map. If any token does not match,
   STOP and list the valid aliases.
4. Run: npm install <pkg1>@latest [<pkg2>@latest ...] --legacy-peer-deps
5. Print the working directory used, the installed packages, and their resolved versions.
   Run no other commands.
