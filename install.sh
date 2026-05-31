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
AGENT_TEST_RUNNER_PATH="files/tests/agent/run-agent-verification.ts"
AGENT_TEST_SUITES_EXAMPLE_PATH="files/tests/agent/agent-test-suites.example.json"
AGENT_TEST_README_PATH="files/tests/agent/README.md"
QUALITY_EVIDENCE_ROOT="${QUALITY_EVIDENCE_ROOT:-quality-evidence}"

if [[ -d "test-quality" && ! -d "quality-evidence" && "${QUALITY_EVIDENCE_ROOT}" == "quality-evidence" ]]; then
  QUALITY_EVIDENCE_ROOT="test-quality"
fi

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
  ./install.sh --skill auto-pr --skill quality-evidence -a codex -y

All arguments are passed through to:
  npx -y skills add git@github.com:ShiplightAI/internal-agent-skills.git

The installer also writes:
  quality-evidence/test-spec-template.md
  quality-evidence/test-report-template.md
  quality-evidence/run-agent-verification.ts
  tests/agent/agent-test-template.md
  tests/agent/agent-test-suites.example.json
  tests/agent/README.md

The quality-evidence skill replaces the earlier test-quality skill name. Repos
that already use test-quality/ artifacts can keep them until they intentionally
migrate. Set QUALITY_EVIDENCE_ROOT to override the installed asset directory.
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

fetch_asset "$TEST_SPEC_TEMPLATE_PATH" "${QUALITY_EVIDENCE_ROOT}/test-spec-template.md"
fetch_asset "$TEST_REPORT_TEMPLATE_PATH" "${QUALITY_EVIDENCE_ROOT}/test-report-template.md"
fetch_asset "$AGENT_TEST_RUNNER_PATH" "${QUALITY_EVIDENCE_ROOT}/run-agent-verification.ts"
fetch_asset "$AGENT_TEST_TEMPLATE_PATH" "tests/agent/agent-test-template.md"
fetch_asset "$AGENT_TEST_SUITES_EXAMPLE_PATH" "tests/agent/agent-test-suites.example.json"
fetch_asset "$AGENT_TEST_README_PATH" "tests/agent/README.md"

echo "Installed Shiplight internal agent assets."
