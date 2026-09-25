#!/usr/bin/env bash
# Generates release notes by running a headless agent over a commit range,
# through the same model fallback chain shape as scripts/run-triage-agent.sh in
# ci-triage: each model in CLAUDE_MODELS is tried in order, stopping at the
# first that produces a non-empty NOTES_FILE. A model the CI token cannot
# access fails fast and the next is tried, so a missing entitlement degrades
# instead of dead-ending.
#
# Like that script, this one NEVER fails the job (exit 0 always). Release notes
# are not a gate — a caller that gets no notes is expected to fall back to
# GitHub's own `gh release create --generate-notes` rather than block a release
# on a transient model outage. Success is therefore gated on the artifact being
# non-empty, not on an exit code, which also covers service-unavailable and
# unanticipated errors.
#
# Commit messages are author-controlled and are inlined into the prompt, so this
# is a prompt-injection surface. The agent therefore runs with no capability to
# act on an injected instruction:
#
#   1. `--tools ""` disables the built-in tool set. Verified empirically:
#      without it, `claude --print` reads files unprompted (there is no
#      permission gate in headless mode); with it, the model can only emit
#      tool-call *syntax as text* — no built-in tool executes. Asking the model
#      not to use tools in the prompt, as this action previously did, is not a
#      control; the model complies or it doesn't.
#   2. `--tools ""` covers only the built-in set, so the configurable surfaces
#      are closed separately: `--setting-sources ""` loads no user, project or
#      local settings (hooks, permission grants, enabled plugins), and
#      `--strict-mcp-config` with no `--mcp-config` leaves zero MCP servers.
#      No `--plugin-dir` or `--plugin-url` is passed either.
#   3. The agent runs from an empty scratch directory, not the caller's
#      checkout. Callers may hold credentials on disk there — `actions/checkout`
#      persists a repo token into .git/config by default, and a release job may
#      have cloud credentials written by an earlier auth step.
#   4. Each attempt is bounded by a timeout, so a stalled request cannot hold
#      the chain — and the caller's generated-notes fallback — hostage until the
#      whole release job times out.
#   5. Output is captured from stdout; the agent never writes NOTES_FILE itself.
#
# There is deliberately no Codex leg. `codex exec` has no equivalent of
# `--tools ""`: `--sandbox read-only` blocks writes and network but still
# executes model-generated shell commands, which can read the inherited
# environment and any absolute path. An injected commit message could therefore
# have it print a credential into the notes, which this script captures and the
# caller publishes. The empty cwd does not mitigate that, and no in-process flag
# does; it would need a container with no host credentials or filesystem. That
# is disproportionate for a non-gating notes generator that already falls back
# to `--generate-notes`, so the second vendor was dropped rather than sandboxed.
#
# Residual, accepted risks:
#   - Enterprise managed-settings policy is not one of the three sources
#     `--setting-sources` controls. A self-hosted runner under a policy that
#     installs hooks is outside control 2; prefer GitHub-hosted runners.
#   - A de-tooled model handed an injection will fabricate plausible-looking
#     output rather than refuse, so expect junk in the notes rather than a leak.
#     The notes are still untrusted text: an injection can put words on the
#     release page, so review them before a release that anyone acts on.
set -uo pipefail

PROMPT_FILE="${PROMPT_FILE:?PROMPT_FILE is required}"
NOTES_FILE="${NOTES_FILE:?NOTES_FILE is required}"
AGENT_LOG="${AGENT_LOG:-/tmp/release-notes-agent.log}"

# Fallback chain (best first), overridable via env. Mirrors ci-triage's rationale:
# pin explicitly, because a runner otherwise inherits a model the CI token may
# not be entitled to.
CLAUDE_MODELS="${CLAUDE_MODELS:-claude-sonnet-5 claude-sonnet-4-6 claude-opus-4-8}"

# Per-attempt ceiling. The chain must stay bounded well inside the caller's job
# timeout: a hung model has to cost one attempt, not the release.
ATTEMPT_TIMEOUT="${ATTEMPT_TIMEOUT:-300}"
TIMEOUT_BIN=""
for candidate in timeout gtimeout; do
  if command -v "$candidate" >/dev/null 2>&1; then
    TIMEOUT_BIN="$candidate"
    break
  fi
done
if [ -z "$TIMEOUT_BIN" ]; then
  echo "::warning::no timeout(1) on PATH — attempts run unbounded"
fi

# The agent runs here rather than in the caller's checkout — see the header.
AGENT_CWD="$(mktemp -d)"
trap 'rm -rf "$AGENT_CWD"' EXIT

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
  local model="$1"
  if ! command -v claude >/dev/null 2>&1; then
    echo "claude CLI not found on PATH" >&2; return 127
  fi
  if [ -z "${CLAUDE_CODE_OAUTH_TOKEN:-}${ANTHROPIC_API_KEY:-}" ]; then
    echo "no Claude credentials (CLAUDE_CODE_OAUTH_TOKEN / ANTHROPIC_API_KEY)" >&2; return 78
  fi
  local out="/tmp/release-notes-claude.$$"
  # Every flag here is a control described in the header, not a preference. The
  # prompt carries everything the model needs inline, so it has nothing to
  # fetch. Do not drop any of them.
  local -a cmd=(
    claude --print
      --tools ""
      --setting-sources ""
      --strict-mcp-config
      --model "$model"
  )
  if [ -n "$TIMEOUT_BIN" ]; then
    cmd=("$TIMEOUT_BIN" -k 10 "$ATTEMPT_TIMEOUT" "${cmd[@]}")
  fi
  (cd "$AGENT_CWD" && "${cmd[@]}") < "$PROMPT_FILE" > "$out" 2>>"$AGENT_LOG"
  local rc=$?
  if [ "$rc" -eq 124 ] || [ "$rc" -eq 137 ]; then
    echo "claude ($model) exceeded ${ATTEMPT_TIMEOUT}s and was killed" >&2
  fi
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

echo "::warning::No model produced release notes — the caller should fall back to generated notes"
echo "--- agent log ---"
tail -40 "$AGENT_LOG" || true
exit 0
