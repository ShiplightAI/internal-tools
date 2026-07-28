#!/usr/bin/env bash
# Generates release notes by running a headless agent over a commit range,
# through the same model fallback chain shape as scripts/run-triage-agent.sh in
# ci-triage: each Claude model in CLAUDE_MODELS is tried in order, then each
# Codex model in CODEX_MODELS, stopping at the first that produces a non-empty
# NOTES_FILE. A model the CI token cannot access fails fast and the next is
# tried, so a missing entitlement degrades instead of dead-ending.
#
# Like that script, this one NEVER fails the job (exit 0 always). Release notes
# are not a gate — a caller that gets no notes is expected to fall back to
# GitHub's own `gh release create --generate-notes` rather than block a release
# on a transient model outage. Success is therefore gated on the artifact being
# non-empty, not on an exit code, which also covers service-unavailable and
# unanticipated errors.
#
# The agent's output is captured from stdout rather than written by the agent
# itself, deliberately: the prompt carries the entire commit range inline, so no
# tools are needed, and an agent with no write access cannot be steered into
# acting on instructions embedded in a commit message. This job runs with the
# caller's token, so that distinction matters.
set -uo pipefail

PROMPT_FILE="${PROMPT_FILE:?PROMPT_FILE is required}"
NOTES_FILE="${NOTES_FILE:?NOTES_FILE is required}"
AGENT_LOG="${AGENT_LOG:-/tmp/release-notes-agent.log}"

# Fallback chain (best first), overridable via env. Mirrors ci-triage's rationale:
# pin explicitly, because a runner otherwise inherits a model the CI token may
# not be entitled to.
CLAUDE_MODELS="${CLAUDE_MODELS:-claude-opus-4-8 claude-opus-4-7 claude-sonnet-4-6}"
CODEX_MODELS="${CODEX_MODELS:-gpt-5.5 gpt-5.4}"

: > "$AGENT_LOG"
rm -f "$NOTES_FILE"

notes_ready() { [ -s "$NOTES_FILE" ]; }

# A model can answer "I cannot help" or emit a refusal; that is not usable notes.
# Treat anything under a plausible floor as no output so the next model is tried.
MIN_NOTES_BYTES="${MIN_NOTES_BYTES:-40}"

capture() { # $1 = candidate output file
  local candidate="$1"
  if [ -s "$candidate" ] && [ "$(wc -c < "$candidate")" -ge "$MIN_NOTES_BYTES" ]; then
    mv "$candidate" "$NOTES_FILE"
    return 0
  fi
  rm -f "$candidate"
  return 1
}

run_claude() { # $1 = model id
  if ! command -v claude >/dev/null 2>&1; then
    echo "claude CLI not found on PATH" >&2; return 127
  fi
  if [ -z "${CLAUDE_CODE_OAUTH_TOKEN:-}${ANTHROPIC_API_KEY:-}" ]; then
    echo "no Claude credentials (CLAUDE_CODE_OAUTH_TOKEN / ANTHROPIC_API_KEY)" >&2; return 78
  fi
  local out="/tmp/release-notes-claude.$$"
  claude --print --model "$1" < "$PROMPT_FILE" > "$out" 2>>"$AGENT_LOG"
  local rc=$?
  capture "$out" || return "$(( rc == 0 ? 1 : rc ))"
  return 0
}

run_codex() { # $1 = model id
  if ! command -v codex >/dev/null 2>&1; then
    echo "codex CLI not found on PATH" >&2; return 127
  fi
  if [ -z "${OPENAI_API_KEY:-}" ]; then
    echo "no Codex credentials (OPENAI_API_KEY)" >&2; return 78
  fi
  local out="/tmp/release-notes-codex.$$"
  codex exec -m "$1" --skip-git-repo-check - < "$PROMPT_FILE" > "$out" 2>>"$AGENT_LOG"
  local rc=$?
  capture "$out" || return "$(( rc == 0 ? 1 : rc ))"
  return 0
}

for model in $CLAUDE_MODELS; do
  echo "::group::Release notes — Claude ($model)"
  run_claude "$model" || echo "Claude ($model) produced no usable notes ($?)"
  echo "::endgroup::"
  if notes_ready; then
    echo "Notes produced by Claude ($model): $NOTES_FILE"
    exit 0
  fi
done

for model in $CODEX_MODELS; do
  echo "::group::Release notes — Codex ($model)"
  run_codex "$model" || echo "Codex ($model) produced no usable notes ($?)"
  echo "::endgroup::"
  if notes_ready; then
    echo "Notes produced by Codex ($model): $NOTES_FILE"
    exit 0
  fi
done

echo "::warning::No model produced release notes — the caller should fall back to generated notes"
echo "--- agent log ---"
tail -40 "$AGENT_LOG" || true
exit 0
