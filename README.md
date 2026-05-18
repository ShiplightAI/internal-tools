# Shiplight Internal Agent Skills

Private Shiplight agent assets for internal development workflows.

This repository intentionally contains internal-only skills and prompts. Public
Shiplight agent skills remain in `ShiplightAI/agent-skills`.

## Included Assets

| Asset | Purpose |
| --- | --- |
| `auto-pr` | Create a PR against the repo's base branch (arg › CLAUDE.md › repo default), run pre-review, wait for Claude bot review, address blockers, and merge. |
| `speckit-test` | Define/update a Spec Kit feature's testing contract, improve worthwhile test coverage, run checks, and write `specs/<feature>/test-report.md`. |
| `specs/test-spec-template.md` | Shared template for feature-level testing contracts. |
| `specs/test-report-template.md` | Shared template for feature-level testing reports. |
| `tests/agent/agent-test-template.md` | Shared template for coding-agent-driven browser/live-env tests. |
| `files/shell-agent` | Experimental `??` helper for launching provider-native agents from bash/zsh. |

## Install

From a target project repo:

```bash
gh api -H "Accept: application/vnd.github.raw" repos/ShiplightAI/internal-agent-skills/contents/install.sh | bash -s -- -a codex -y
```

Install for another `skills`-supported agent by changing the `-a` value:

```bash
gh api -H "Accept: application/vnd.github.raw" repos/ShiplightAI/internal-agent-skills/contents/install.sh | bash -s -- -a claude-code -y
gh api -H "Accept: application/vnd.github.raw" repos/ShiplightAI/internal-agent-skills/contents/install.sh | bash -s -- -a gemini -y
```

Install for all supported agents detected by `skills`:

```bash
gh api -H "Accept: application/vnd.github.raw" repos/ShiplightAI/internal-agent-skills/contents/install.sh | bash -s -- --all
```

The installer delegates all arguments to:

```bash
npx -y skills add git@github.com:ShiplightAI/internal-agent-skills.git "$@"
```

That means normal `skills` flags such as `-a`, `--all`, `-g`, `--copy`, and
`--skill` continue to work without this repository maintaining an agent
compatibility list.

The repository is private, so developers need `gh` authenticated for the
one-line installer and GitHub SSH access for the `skills` clone step.

## Install Individual Skills

```bash
gh api -H "Accept: application/vnd.github.raw" repos/ShiplightAI/internal-agent-skills/contents/install.sh | bash -s -- --skill auto-pr -a codex -y
gh api -H "Accept: application/vnd.github.raw" repos/ShiplightAI/internal-agent-skills/contents/install.sh | bash -s -- --skill speckit-test -a codex -y
```

Note: `specs/test-spec-template.md`, `specs/test-report-template.md`, and
`tests/agent/agent-test-template.md` are installed whenever `install.sh` runs,
because they are repo-local assets rather than `skills` skills.

## Update

Re-run the same install command from the target project repo.

## Experimental Shell Agent

Install the `??` integration:

```bash
files/shell-agent/install.sh
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
