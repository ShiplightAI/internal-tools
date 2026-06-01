# Shiplight Internal Agent Skills

Private Shiplight agent assets for internal development workflows.

This repository intentionally contains internal-only skills and prompts. Public
Shiplight agent skills remain in `ShiplightAI/agent-skills`.

## Included Assets

| Asset | Purpose |
| --- | --- |
| `auto-pr` | Create a PR against the repo's base branch (arg › CLAUDE.md › repo default), run pre-review, wait for Claude bot review, address blockers, and merge. |
| `code-review-run` | Run a standalone, medium-effort `/code-review` (in-session or headless), optionally save a ranked round-N report, and reconcile findings across multi-round reviews. |
| `speckit-project` | Orchestrate project-level Spec Kit work: PRD, roadmap, project map, feature breakdown, active feature selection, brownfield reconstruction, and feature lifecycle sequencing. |
| `quality-evidence` | Assess and improve quality evidence for a project or feature, map coverage depth, run verification, add worthwhile tests/checks, and write owner-facing confidence reports. |
| `quality-evidence/test-spec-template.md` | Shared template for feature-level testing contracts. |
| `quality-evidence/test-report-template.md` | Shared template for feature-level testing reports. |
| `tests/agent/agent-test-template.md` | Shared template for coding-agent-driven browser/live-env tests. |
| `tests/agent/agent-test-suites.example.json` | Example manifest for grouping agent test cases into runnable suites. |
| `tests/agent/README.md` | Setup and configuration guide for the agent test runner and manifest. |
| `quality-evidence/run-agent-verification.ts` | Configurable runner for executing agent test suites and enforcing the report status contract. |
| `files/shell-agent` | Experimental `??` helper for launching provider-native agents from bash/zsh. |

## Install

From a target project repo, install for Codex:

```bash
npx skills add ShiplightAI/internal-agent-skills -a codex -y
```

Install for another `skills`-supported agent by changing the `-a` value:

```bash
npx skills add ShiplightAI/internal-agent-skills -a claude-code -y
npx skills add ShiplightAI/internal-agent-skills -a gemini -y
```

Install for all supported agents detected by `skills`:

```bash
npx skills add ShiplightAI/internal-agent-skills --all
```

Useful `skills add` flags include `-a/--agent`, `-s/--skill`, `-g/--global`,
`--copy`, `--all`, and `-y/--yes`.

The repository is private, so developers need GitHub access that the `skills`
CLI can use when cloning `ShiplightAI/internal-agent-skills`.

## Install Individual Skills

```bash
npx skills add ShiplightAI/internal-agent-skills --skill auto-pr -a codex -y
npx skills add ShiplightAI/internal-agent-skills --skill speckit-project -a codex -y
npx skills add ShiplightAI/internal-agent-skills --skill quality-evidence -a codex -y
```

## Install Repo-Local Files

Direct `skills add` installs the agent skills. To also copy the shared
`quality-evidence/` and `tests/agent/` starter files into a target repo, run the
installer from that repo:

```bash
gh api -H "Accept: application/vnd.github.raw" repos/ShiplightAI/internal-agent-skills/contents/install.sh | bash -s -- -a codex -y
```

## Speckit Project Prerequisites

The `speckit-project` skill assumes the target repo is already initialized with
GitHub Spec Kit and that the active agent has Shiplight MCP plus Shiplight
skills installed.

- Spec Kit: https://github.com/github/spec-kit/blob/main/README.md
- Shiplight agent skills and MCP: https://github.com/ShiplightAI/agent-skills/blob/main/README.md

Note: `quality-evidence/test-spec-template.md`,
`quality-evidence/test-report-template.md`,
`quality-evidence/run-agent-verification.ts`,
`tests/agent/agent-test-template.md`,
`tests/agent/agent-test-suites.example.json`, and `tests/agent/README.md` are
installed whenever `install.sh` runs, because they are repo-local assets rather
than `skills` skills. Each target repo still owns its real
`tests/agent/agent-test-suites.json`, case files, fixtures, auth/session
bootstrap, CI wiring, engine secrets, MCP config, and environment mutation
policies.

`quality-evidence` replaces the earlier `test-quality` skill name. Existing
projects that already use `test-quality/` evidence artifacts can keep that
directory until they explicitly migrate; the installer preserves that convention
when `test-quality/` already exists and `quality-evidence/` does not.

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
