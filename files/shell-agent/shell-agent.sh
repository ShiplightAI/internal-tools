# shell-agent integration for bash and zsh.
# Source this file from ~/.bashrc or ~/.zshrc.

if [ -n "${BASH_VERSION:-}" ]; then
  __shell_agent_source="${BASH_SOURCE[0]}"
elif [ -n "${ZSH_VERSION:-}" ]; then
  __shell_agent_source="${(%):-%x}"
else
  __shell_agent_source="$0"
fi

__shell_agent_dir="$(cd -- "$(dirname -- "$__shell_agent_source")" >/dev/null 2>&1 && pwd)"
__shell_agent_bin="${SHELL_AGENT_BIN:-$__shell_agent_dir/shell-agent}"
__shell_agent_last_command=""
__shell_agent_last_exit=0

__shell_agent_history_file() {
  local history_file
  history_file="$(mktemp "${TMPDIR:-/tmp}/shell-agent-history.XXXXXX")" || return 1
  if [ -n "${ZSH_VERSION:-}" ]; then
    fc -l -n -50 > "$history_file" 2>/dev/null || true
  else
    history 50 > "$history_file" 2>/dev/null || true
  fi
  printf '%s\n' "$history_file"
}

__shell_agent_invoke() {
  local history_file exit_status
  history_file="$(__shell_agent_history_file)" || return 1
  SHELL_AGENT_LAST_EXIT="$__shell_agent_last_exit" \
  SHELL_AGENT_SHELL="${SHELL:-unknown}" \
    "$__shell_agent_bin" agent --history "$history_file" "$@"
  exit_status=$?
  rm -f "$history_file"
  return "$exit_status"
}

if [ -n "${ZSH_VERSION:-}" ]; then
  function "??" {
    __shell_agent_invoke "$*"
  }

  __shell_agent_preexec() {
    __shell_agent_last_command="$1"
  }

  __shell_agent_precmd() {
    local exit_status="$?"
    __shell_agent_last_exit="$exit_status"
    if [ -n "$__shell_agent_last_command" ]; then
      "$__shell_agent_bin" record \
        --cwd "$PWD" \
        --command "$__shell_agent_last_command" \
        --exit "$exit_status" >/dev/null 2>&1 || true
      __shell_agent_last_command=""
    fi
  }

  autoload -Uz add-zsh-hook 2>/dev/null || true
  if typeset -f add-zsh-hook >/dev/null 2>&1; then
    add-zsh-hook preexec __shell_agent_preexec
    add-zsh-hook precmd __shell_agent_precmd
  fi

  if typeset -f command_not_found_handler >/dev/null 2>&1; then
    eval "$(typeset -f command_not_found_handler | sed '1s/command_not_found_handler/__shell_agent_previous_command_not_found_handler/')"
  fi

  command_not_found_handler() {
    if [ "${SHELL_AGENT_FALLBACK:-1}" = "1" ]; then
      __shell_agent_invoke "$*"
    elif typeset -f __shell_agent_previous_command_not_found_handler >/dev/null 2>&1; then
      __shell_agent_previous_command_not_found_handler "$@"
    else
      printf 'zsh: command not found: %s\n' "$1" >&2
      return 127
    fi
  }
elif [ -n "${BASH_VERSION:-}" ]; then
  ??() {
    __shell_agent_invoke "$*"
  }

  __shell_agent_record_prompt() {
    local status="$?"
    __shell_agent_last_exit="$status"
    local command_text
    command_text="$(HISTTIMEFORMAT= history 1 2>/dev/null | sed 's/^ *[0-9]\+ *//')"
    if [ -n "$command_text" ] && [ "$command_text" != "$__shell_agent_last_command" ]; then
      "$__shell_agent_bin" record \
        --cwd "$PWD" \
        --command "$command_text" \
        --exit "$status" >/dev/null 2>&1 || true
      __shell_agent_last_command="$command_text"
    fi
    return "$status"
  }

  if [ -n "${PROMPT_COMMAND:-}" ]; then
    PROMPT_COMMAND="__shell_agent_record_prompt; $PROMPT_COMMAND"
  else
    PROMPT_COMMAND="__shell_agent_record_prompt"
  fi

  if declare -F command_not_found_handle >/dev/null 2>&1; then
    eval "$(declare -f command_not_found_handle | sed '1s/command_not_found_handle/__shell_agent_previous_command_not_found_handle/')"
  fi

  command_not_found_handle() {
    if [ "${SHELL_AGENT_FALLBACK:-1}" = "1" ]; then
      __shell_agent_invoke "$*"
    elif declare -F __shell_agent_previous_command_not_found_handle >/dev/null 2>&1; then
      __shell_agent_previous_command_not_found_handle "$@"
    else
      printf '%s: command not found\n' "$1" >&2
      return 127
    fi
  }

  if [ "${SHELL_AGENT_FALLBACK:-1}" = "1" ] && [ "${BASH_VERSINFO[0]:-0}" -lt 4 ]; then
    printf 'shell-agent: warning: this Bash %s does not reliably call command_not_found_handle; use ?? or zsh for fallback.\n' "$BASH_VERSION" >&2
  fi
fi
