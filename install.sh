#!/usr/bin/env bash
set -euo pipefail

REPO="ShiplightAI/internal-agent-skills"
RAW_BASE="https://raw.githubusercontent.com/${REPO}/main"

usage() {
  cat <<'EOF'
Install Shiplight internal agent skills and repo-local agent prompts.

Usage:
  ./install.sh [skills add options]

Examples:
  ./install.sh -a codex -y
  ./install.sh -a claude-code -y
  ./install.sh --all
  ./install.sh -g -a codex -y
  ./install.sh --skill auto-pr --skill speckit-verify -a codex -y

All arguments are passed through to:
  npx -y skills add ShiplightAI/internal-agent-skills

The installer also writes:
  .agents/smoke-test-agent.md
EOF
}

for arg in "$@"; do
  case "$arg" in
    -h|--help)
      usage
      exit 0
      ;;
  esac
done

if ! command -v npx >/dev/null 2>&1; then
  echo "error: npx is required to install skills" >&2
  exit 1
fi

npx -y skills add "$REPO" "$@"

mkdir -p .agents
if command -v curl >/dev/null 2>&1; then
  curl -fsSL "${RAW_BASE}/files/.agents/smoke-test-agent.md" -o .agents/smoke-test-agent.md
elif command -v wget >/dev/null 2>&1; then
  wget -qO .agents/smoke-test-agent.md "${RAW_BASE}/files/.agents/smoke-test-agent.md"
else
  echo "error: curl or wget is required to install .agents/smoke-test-agent.md" >&2
  exit 1
fi

echo "Installed Shiplight internal agent assets."
