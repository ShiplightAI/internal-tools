#!/usr/bin/env bash
set -euo pipefail

INSTALL_DIR="${SHELL_AGENT_INSTALL_DIR:-$HOME/.shell-agent}"
SOURCE_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
RC_FILE=""
UPDATE_RC=1

usage() {
  cat <<'EOF'
Install the shell-agent ?? integration.

Usage:
  ./install.sh [--rc FILE] [--no-rc]

Environment:
  SHELL_AGENT_INSTALL_DIR=~/.shell-agent

The installer copies:
  shell-agent
  shell-agent.sh

and adds this idempotent block to the detected shell rc file:
  # export SHELL_AGENT_BACKEND=gemini
  # export SHELL_AGENT_MODEL=gemini-3.1-flash-lite
  source "$HOME/.shell-agent/shell-agent.sh"
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --rc)
      [[ $# -ge 2 ]] || { echo "error: --rc requires a file" >&2; exit 1; }
      RC_FILE="$2"
      shift 2
      ;;
    --no-rc)
      UPDATE_RC=0
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "error: unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ ! -f "$SOURCE_DIR/shell-agent" || ! -f "$SOURCE_DIR/shell-agent.sh" ]]; then
  echo "error: install.sh must be run from the files/shell-agent directory" >&2
  exit 1
fi

mkdir -p "$INSTALL_DIR"
cp "$SOURCE_DIR/shell-agent" "$INSTALL_DIR/shell-agent"
cp "$SOURCE_DIR/shell-agent.sh" "$INSTALL_DIR/shell-agent.sh"
chmod +x "$INSTALL_DIR/shell-agent"
SOURCE_LINE="source \"$INSTALL_DIR/shell-agent.sh\""

detect_rc_file() {
  if [[ -n "$RC_FILE" ]]; then
    printf '%s\n' "$RC_FILE"
    return
  fi

  case "${SHELL:-}" in
    */zsh) printf '%s\n' "$HOME/.zshrc" ;;
    */bash)
      if [[ "$(uname -s 2>/dev/null || true)" == "Darwin" ]]; then
        printf '%s\n' "$HOME/.bash_profile"
      else
        printf '%s\n' "$HOME/.bashrc"
      fi
      ;;
    *) printf '%s\n' "$HOME/.profile" ;;
  esac
}

if [[ "$UPDATE_RC" == "1" ]]; then
  rc_file="$(detect_rc_file)"
  mkdir -p "$(dirname -- "$rc_file")"
  touch "$rc_file"

  if ! grep -Fq "$SOURCE_LINE" "$rc_file"; then
    {
      printf '\n# >>> shell-agent >>>\n'
      printf '# Optional settings:\n'
      printf '# export SHELL_AGENT_BACKEND=gemini          # auto|gemini|codex|claude\n'
      printf '# export SHELL_AGENT_MODEL=gemini-3.1-flash-lite\n'
      printf '# export SHELL_AGENT_FALLBACK=0              # disable command-not-found fallback\n'
      printf '# export SHELL_AGENT_GEMINI_SANDBOX=1        # Gemini agent mode sandbox\n'
      printf '%s\n' "$SOURCE_LINE"
      printf '# <<< shell-agent <<<\n'
    } >> "$rc_file"
    echo "Updated $rc_file"
  else
    echo "$rc_file already sources shell-agent."
  fi
fi

echo "Installed shell-agent to $INSTALL_DIR"
echo "Open a new shell, or run:"
echo "  $SOURCE_LINE"
