# Shiplight Internal Agent Skills

Private Shiplight agent assets for internal development workflows.

This repository intentionally contains internal-only skills and prompts. Public
Shiplight agent skills remain in `ShiplightAI/agent-skills`.

## Included Assets

| Asset | Purpose |
| --- | --- |
| `auto-pr` | Create a PR against the repo's base branch (arg › CLAUDE.md › repo default), run pre-review, wait for Claude bot review, address blockers, and merge. |
| `code-review-run` | Run a standalone, medium-effort `/code-review` (in-session or headless), optionally save a ranked round-N report, and reconcile findings across multi-round reviews. |
| `quality` | Construct, assess, and improve a repository's quality project graph and four-score quality index. |
| `shell-agent` | Experimental `??` helper for launching provider-native agents from bash/zsh. |

## Install

From a target project repo, install for Codex:

```bash
npx skills add ShiplightAI/internal-tools/agent-skills -a codex -y
```

Install for another `skills`-supported agent by changing the `-a` value:

```bash
npx skills add ShiplightAI/internal-tools/agent-skills -a claude-code -y
npx skills add ShiplightAI/internal-tools/agent-skills -a gemini -y
```

Install for all supported agents detected by `skills`:

```bash
npx skills add ShiplightAI/internal-tools/agent-skills --all
```

Useful `skills add` flags include `-a/--agent`, `-s/--skill`, `-g/--global`,
`--copy`, `--all`, and `-y/--yes`.

The repository is private, so developers need GitHub access that the `skills`
CLI can use when cloning `ShiplightAI/internal-tools`.

## Install Individual Skills

```bash
npx skills add ShiplightAI/internal-tools/agent-skills --skill auto-pr -a codex -y
```

## Update

Re-run the same install command from the target project repo.

## Experimental Shell Agent

Install the `??` integration:

```bash
shell-agent/install.sh
```

Then open a new shell, or source it immediately:

```bash
source "$HOME/.shell-agent/shell-agent.sh"
```

Then ask the agent:

```bash
?? summarize the changes in this repo
```

`??` launches the selected backend CLI in its read-only/planning mode so the
provider-native agent can inspect the repo and answer directly.

You can also let the command-not-found fallback catch natural-language input:

```bash
find the largest files in this repo
```

Note: automatic command-not-found fallback depends on shell support. It works in
zsh and modern Bash builds that call `command_not_found_handle`, but macOS
`/bin/bash` 3.2 does not reliably call that hook. In that shell, use `??`.

The helper uses `gemini` by default when available, then OpenAI `codex`, then
`claude`. Gemini uses `gemini-3.1-flash-lite` by default, Codex uses
`gpt-5.4-mini`, and Claude uses `haiku`. Override with:

```bash
export SHELL_AGENT_BACKEND=codex    # auto, codex, claude, or gemini
export SHELL_AGENT_MODEL=gpt-5.4-mini
```

For Gemini, authenticate the CLI with `GOOGLE_API_KEY`.
Gemini agent mode uses `--approval-mode yolo --sandbox` by default so it can
run inspection commands non-interactively.

Agent responses show the backend, model, mode, backend latency, and total
latency.

Session context is written to `~/.shell-agent/transcript.jsonl`. Disable the
automatic command-not-found fallback while keeping the `??` helper with:

```bash
export SHELL_AGENT_FALLBACK=0
```
