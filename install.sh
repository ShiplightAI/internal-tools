#!/usr/bin/env bash
set -euo pipefail

REPO="ShiplightAI/internal-agent-skills"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -d "${SCRIPT_DIR}/skills" ]]; then
  SKILLS_SOURCE="${SCRIPT_DIR}"
else
  SKILLS_SOURCE="git@github.com:${REPO}.git"
fi
RAW_BASE="https://raw.githubusercontent.com/${REPO}/main"
TEST_SPEC_TEMPLATE_PATH="files/specs/test-spec-template.md"
TEST_REPORT_TEMPLATE_PATH="files/specs/test-report-template.md"
AGENT_TEST_TEMPLATE_PATH="files/tests/agent/agent-test-template.md"

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
  ./install.sh --skill auto-pr --skill test-quality -a codex -y

All arguments are passed through to:
  npx -y skills add git@github.com:ShiplightAI/internal-agent-skills.git

The installer also writes:
  specs/test-spec-template.md
  specs/test-report-template.md
  tests/agent/agent-test-template.md
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

fetch_asset() {
  local source_path="$1"
  local destination_path="$2"
  local local_path="${SCRIPT_DIR}/${source_path}"

  mkdir -p "$(dirname "$destination_path")"

  if [[ -f "$local_path" ]]; then
    cp "$local_path" "$destination_path"
  elif command -v gh >/dev/null 2>&1; then
    gh api \
      -H "Accept: application/vnd.github.raw" \
      "repos/${REPO}/contents/${source_path}" \
      > "$destination_path"
  elif command -v curl >/dev/null 2>&1 && [[ -n "${GITHUB_TOKEN:-}" ]]; then
    curl -fsSL \
      -H "Authorization: Bearer ${GITHUB_TOKEN}" \
      -H "Accept: application/vnd.github.raw" \
      "${RAW_BASE}/${source_path}" \
      -o "$destination_path"
  elif command -v curl >/dev/null 2>&1; then
    curl -fsSL "${RAW_BASE}/${source_path}" -o "$destination_path"
  elif command -v wget >/dev/null 2>&1; then
    wget -qO "$destination_path" "${RAW_BASE}/${source_path}"
  else
    echo "error: gh, curl, or wget is required to install ${destination_path}" >&2
    exit 1
  fi
}

fetch_asset "$TEST_SPEC_TEMPLATE_PATH" "specs/test-spec-template.md"
fetch_asset "$TEST_REPORT_TEMPLATE_PATH" "specs/test-report-template.md"
fetch_asset "$AGENT_TEST_TEMPLATE_PATH" "tests/agent/agent-test-template.md"

echo "Installed Shiplight internal agent assets."
