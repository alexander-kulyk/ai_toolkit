#!/usr/bin/env bash
set -euo pipefail

SCOPE="global"
AGENT="both"
PROJECT_ROOT=""
FORCE="false"

usage() {
  cat <<'EOF'
Usage:
  ./scripts/install.sh [--global|--project] [--claude|--codex|--both] [--force] [project-root]

Examples:
  ./scripts/install.sh --global --both
  ./scripts/install.sh --project --both /absolute/path/to/repo
  ./scripts/install.sh --global --claude
  ./scripts/install.sh --global --both --force

By default, installation refuses to replace an existing skill. Use --force only
when you intentionally want to replace both installed files and local changes.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --global) SCOPE="global"; shift ;;
    --project) SCOPE="project"; shift ;;
    --claude) AGENT="claude"; shift ;;
    --codex) AGENT="codex"; shift ;;
    --both) AGENT="both"; shift ;;
    --force) FORCE="true"; shift ;;
    -h|--help) usage; exit 0 ;;
    *)
      if [[ -z "$PROJECT_ROOT" ]]; then PROJECT_ROOT="$1"; shift; else echo "Unexpected argument: $1" >&2; usage; exit 2; fi
      ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SKILL_NAME="$(basename "$SKILL_ROOT")"

if [[ "$SKILL_NAME" != "nodejs-backend-engineer" ]]; then
  echo "Warning: source directory is '$SKILL_NAME'; Agent Skills spec expects nodejs-backend-engineer." >&2
fi

if [[ "$SCOPE" == "project" ]]; then
  if [[ -z "$PROJECT_ROOT" ]]; then PROJECT_ROOT="$(pwd)"; fi
  PROJECT_ROOT="$(cd "$PROJECT_ROOT" && pwd)"
fi

install_copy() {
  local destination="$1"
  mkdir -p "$(dirname "$destination")"
  if [[ -e "$destination" || -L "$destination" ]]; then
    rm -rf -- "$destination"
  fi
  cp -R "$SKILL_ROOT" "$destination"
  echo "Installed: $destination"
}

preflight_destination() {
  local destination="$1"
  if [[ ( -e "$destination" || -L "$destination" ) && "$FORCE" != "true" ]]; then
    echo "Refusing to replace existing skill: $destination" >&2
    echo "Re-run with --force only if overwriting local changes is intentional." >&2
    return 3
  fi
}

if [[ "$SCOPE" == "global" ]]; then
  CLAUDE_DEST="$HOME/.claude/skills/nodejs-backend-engineer"
  CODEX_DEST="$HOME/.agents/skills/nodejs-backend-engineer"
else
  CLAUDE_DEST="$PROJECT_ROOT/.claude/skills/nodejs-backend-engineer"
  CODEX_DEST="$PROJECT_ROOT/.agents/skills/nodejs-backend-engineer"
fi

case "$AGENT" in
  claude)
    preflight_destination "$CLAUDE_DEST"
    install_copy "$CLAUDE_DEST"
    ;;
  codex)
    preflight_destination "$CODEX_DEST"
    install_copy "$CODEX_DEST"
    ;;
  both)
    preflight_destination "$CLAUDE_DEST"
    preflight_destination "$CODEX_DEST"
    install_copy "$CLAUDE_DEST"
    install_copy "$CODEX_DEST"
    ;;
  *) echo "Unknown agent: $AGENT" >&2; exit 2 ;;
esac

echo "Done. Restart the agent only if it does not detect the new skill automatically."
