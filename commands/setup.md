---
description: Set up this project for local development from scratch by running the spdms-local-setup skill (macOS or Windows, agent-neutral)
---

Configure this project for local development from scratch, following the shared setup skill end to end.
This command is a thin entry point — the skill is the single source of truth; do not improvise your own steps.

Input: $ARGUMENTS may optionally name the target OS (e.g. `macOS Apple Silicon`, `Windows`) or a narrower
sub-goal (e.g. `just the yalc link`, `only Azure Artifacts auth`). Honor it if present; otherwise detect the OS.

Steps:

1. Read the skill COMPLETELY before acting: `.ai/skills/spdms-local-setup/SKILL.md`, plus the platform guide and
   reference files it links (`references/MACOS.md` or `references/WINDOWS.md`, `references/AZURE_AUTH.md`,
   `references/RUN_AND_VERIFY.md`, `references/TROUBLESHOOTING.md`). It is authoritative for this workflow.
   - If `.ai/` is not present in this repo, it is provided by the shared Agent Toolkit submodule: run
     `git submodule update --init` first, or run this command from the repo where the skill physically lives.
2. Detect the environment: OS, CPU architecture (Apple Silicon vs Intel), shell, repo root, Git state, and existing
   tools. Do not assume a clean machine.
3. Run the read-only preflight script for the platform:
   - macOS: `bash .ai/skills/spdms-local-setup/scripts/preflight-macos.sh`
   - Windows PowerShell: `& .\.ai\skills\spdms-local-setup\scripts\preflight-windows.ps1`
4. Follow the skill's numbered workflow: install only missing prerequisites, clone the sibling repositories,
   restore dependencies with `npm install --legacy-peer-deps`, set up the yalc link for `@spdms/general`
   (`npm run local-publish` in the library, `npx yalc add @spdms/general` in the host), trust the SPFx dev cert
   (`npx gulp trust-dev-cert`), start the host (`npm run serve` or `npm run yalc-start`), and verify
   `https://localhost:4321/temp/manifests.js` returns HTTP 200 and is trusted by the browser.
5. Honor the skill's NON-NEGOTIABLE security boundary at all times: never create, request, receive, encode, print,
   or write a developer PAT or npm credential. Explain the manual Azure Artifacts auth step, then PAUSE until the
   developer confirms completion; validate only with a package-metadata request and mask credential-bearing output.
6. Report progress per step and STOP at any failing gate. Consult `references/TROUBLESHOOTING.md` before any
   destructive cleanup (never delete `node_modules`, lockfiles, caches, or yalc state as a first response). Do NOT
   claim setup is complete until the build, manifest, and browser-trust checks all pass.
