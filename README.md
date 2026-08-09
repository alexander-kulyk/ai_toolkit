# Agent Toolkit

Central repository of reusable skills, agents, and commands shared across engineering projects.

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
| [`data-driven-rendering`](skills/data-driven-rendering/SKILL.md) | Collapse N same-shape UI variants (modals, tabs, columns, status maps) into one render driven by a config table. |
| [`feature-sliced-design`](skills/feature-sliced-design/SKILL.md) | Enforce the project's Feature-Sliced Design layers, import direction, slice isolation, and public APIs. |
| [`react-anti-patterns`](skills/react-anti-patterns/SKILL.md) | Catalogue of React anti-patterns to detect and fix — derived state via `useEffect`, prop drilling, god components. |
| [`react-best-practices`](skills/react-best-practices/SKILL.md) | React coding standards for components, hooks, and utilities — typing, JSX, naming, colocation, `reselect` selectors, thunk factory. |
| [`state-management`](skills/state-management/SKILL.md) | Choose and place React state while avoiding excessive lifting and prop drilling. |
| [`strategy-registries`](skills/strategy-registries/SKILL.md) | Design or review behavior selection through strategy, provider, policy, command, and adapter registries. |

### Agents — `agents/`

Sub-agent definitions (role, tools, workflow).

| Agent | Purpose |
| ----- | ------- |
| [`researcher`](agents/researcher.md) | Investigates a proposed change and writes one evidence-based `research.md` for OpenSpec without planning, task decomposition, or implementation. |
| [`executor`](agents/executor.md) | Source-driven implementation executor — runs one OpenSpec or plan Stage per invocation, executes its gate, and does not commit. |
| [`verifier`](agents/verifier.md) | Read-only Stage verifier — grades uncommitted changes against the supplied specs/design/tasks or plan and gates the commit. |

### Commands — `commands/`

Reusable commands executed by AI agents (slash commands where supported).

| Command | Purpose |
| ------- | ------- |
| [`commit`](commands/commit.md) | Stage all changes, generate a Conventional Commit message, and commit. |
| [`implement-plan`](commands/implement-plan.md) | Execute an OpenSpec change, specification package, or standalone plan through a Stage-by-Stage executor/verifier workflow. |
| [`research`](commands/research.md) | Initialize or reuse an OpenSpec change, run `researcher`, and save one evidence-based `research.md`. |

## How each agent loads this

This repository is consumed as a Git submodule at `.ai_toolkit/` in each project. Assets here are
agent-neutral; each agent discovers them from its own conventional entry point, which points
**into** `.ai_toolkit/`:

- **Claude Code** — root and package-scoped `CLAUDE.md`; skills/commands surfaced under
  `.claude/` with one symlink per asset.
- **OpenAI Codex** — root and package-scoped `AGENTS.md`; skills surfaced under
  `.agents/skills/` with one symlink per skill.
- **GitHub Copilot** — `.github/copilot-instructions.md`.

Keep each project's root entry file focused on durable project conventions and a pointer to this
toolkit. Do not re-list the asset inventory there because it would drift; this index is the one
place the catalogue lives.

## Usage

Consume as a Git submodule:

```bash
git submodule add <repository-url> .ai_toolkit
# or, when cloning a project that already references it:
git clone --recurse-submodules <project-url>
```

## Contributing

1. Create a feature branch.
2. Follow the repository structure (`skills/`, `agents/`, `commands/`).
3. **Update the Index above in the same PR** when you add, rename, or remove an asset.
4. Submit a Pull Request and request review from the engineering team.

## Versioning

Projects reference a specific Git commit of this repository through Git submodules, allowing independent upgrades.

## License

Internal engineering repository.
