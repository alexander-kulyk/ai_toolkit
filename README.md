# Agent Toolkit

Central repository of reusable assets for AI coding agents — skills, agents, commands, and prompts shared across engineering projects.

## Purpose

A single source of truth for reusable AI agent assets shared across engineering projects.

Supported agents include:

- GitHub Copilot
- Claude Code
- OpenAI Codex
- Future AI coding agents

## Index

> **This index is the map of the toolkit — keep it in sync in the same PR that adds, renames, or removes an asset.**
> Agents that auto-scan (Claude Code, Codex) still read each asset's own frontmatter `description`; this table is the human-facing catalogue and cross-agent overview.

### Skills — `skills/`

Reusable engineering skills; each is a folder with a `SKILL.md` (plus optional `references/`, `scripts/`).

| Skill | Purpose |
| ----- | ------- |
| [`react-anti-patterns`](skills/react-anti-patterns/SKILL.md) | Catalogue of React anti-patterns to detect and fix — derived state via `useEffect`, prop drilling, god components. |
| [`react-best-practices`](skills/react-best-practices/SKILL.md) | React coding standards for components, hooks, and utilities — typing, JSX, naming, colocation, `reselect` selectors, thunk factory. |
| [`data-driven-rendering`](skills/data-driven-rendering/SKILL.md) | Collapse N same-shape UI variants (modals, tabs, columns, status maps) into one render driven by a config table. |
| [`spdms-local-setup`](skills/spdms-local-setup/SKILL.md) | Configure, verify, or repair the SPDMS frontend local-development environment on Windows or macOS (agent-neutral). |

### Agents — `agents/`

Sub-agent definitions (role, tools, workflow).

| Agent | Purpose |
| ----- | ------- |
| [`research-planner`](agents/research-planner.md) | Two-phase, human-gated: produces a Research Report, then (on approval) a staged implementation plan. Never edits source. |
| [`executor`](agents/executor.md) | Plan-driven implementation executor — runs one stage per run, verifies at the plan's gate, does not commit. |
| [`verifier`](agents/verifier.md) | Read-only stage verifier — grades the uncommitted stage changes against the plan's gate and gates the commit. |

### Commands — `commands/`

Reusable commands executed by AI agents (slash commands where supported).

| Command | Purpose |
| ------- | ------- |
| [`branch`](commands/branch.md) | Create and publish a branch from `dev` (optional project selector). |
| [`commit`](commands/commit.md) | Stage all changes, generate a Conventional Commit message, and commit. |
| [`install`](commands/install.md) | Install the latest version of known packages with `--legacy-peer-deps`. |
| [`pr`](commands/pr.md) | Generate a PR title and Markdown description from the current branch's commits. |
| [`projects`](commands/projects.md) | Show the numbered project map shared by `branch` / `commit` / `install` / `pr`. |
| [`setup`](commands/setup.md) | Configure the project locally from scratch by running the `spdms-local-setup` skill. |

### Prompts — `prompts/`

Copy-paste prompt templates — for agents without a slash-command mechanism, or for pasting a request directly.

| Prompt | Purpose |
| ------ | ------- |
| [`spdms-local-setup`](prompts/spdms-local-setup.md) | Ready-to-paste prompt that drives the `spdms-local-setup` skill. |

## How each agent loads this

This repository is consumed as a Git submodule at `.ai/` in each project. Assets here are agent-neutral; each agent
discovers them from its own conventional entry point, which points **into** `.ai/`:

- **Claude Code** — root `CLAUDE.md`; skills/commands surfaced under `.claude/`.
- **OpenAI Codex** — root `AGENTS.md`; skills under `.codex/`.
- **GitHub Copilot** — `.github/copilot-instructions.md`.

Keep each project's root entry file a **thin pointer** to this toolkit — do not re-list the inventory there (it would
drift). This index is the one place the catalogue lives.

## Usage

Consume as a Git submodule:

```bash
git submodule add <repository-url> .ai
# or, when cloning a project that already references it:
git clone --recurse-submodules <project-url>
```

## Contributing

1. Create a feature branch.
2. Follow the repository structure (`skills/`, `agents/`, `commands/`, `prompts/`).
3. **Update the Index above in the same PR** when you add, rename, or remove an asset.
4. Submit a Pull Request and request review from the engineering team.

## Versioning

Projects reference a specific Git commit of this repository through Git submodules, allowing independent upgrades.

## License

Internal engineering repository.
