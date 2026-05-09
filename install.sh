#!/usr/bin/env bash
set -euo pipefail

REPO="ShiplightAI/internal-agent-skills"
SKILLS_SOURCE="git@github.com:${REPO}.git"
RAW_BASE="https://raw.githubusercontent.com/${REPO}/main"
SMOKE_AGENT_PATH="files/.agents/smoke-test-agent.md"

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
  npx -y skills add git@github.com:ShiplightAI/internal-agent-skills.git

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

npx -y skills add "$SKILLS_SOURCE" "$@" < /dev/null

mkdir -p .agents

if command -v gh >/dev/null 2>&1; then
  gh api \
    -H "Accept: application/vnd.github.raw" \
    "repos/${REPO}/contents/${SMOKE_AGENT_PATH}" \
    > .agents/smoke-test-agent.md
elif command -v curl >/dev/null 2>&1 && [[ -n "${GITHUB_TOKEN:-}" ]]; then
  curl -fsSL \
    -H "Authorization: Bearer ${GITHUB_TOKEN}" \
    -H "Accept: application/vnd.github.raw" \
    "${RAW_BASE}/${SMOKE_AGENT_PATH}" \
    -o .agents/smoke-test-agent.md
elif command -v curl >/dev/null 2>&1; then
  curl -fsSL "${RAW_BASE}/${SMOKE_AGENT_PATH}" -o .agents/smoke-test-agent.md
elif command -v wget >/dev/null 2>&1; then
  wget -qO .agents/smoke-test-agent.md "${RAW_BASE}/${SMOKE_AGENT_PATH}"
else
  echo "error: gh, curl, or wget is required to install .agents/smoke-test-agent.md" >&2
  exit 1
fi

echo "Installed Shiplight internal agent assets."
