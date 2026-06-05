# Shiplight Internal Agent Skills

Private Shiplight agent assets for internal development workflows.

This repository intentionally contains internal-only skills and prompts. Public
Shiplight agent skills remain in `ShiplightAI/agent-skills`.

> **Design philosophy & global architecture:** see [`ARCHITECTURE.md`](./ARCHITECTURE.md)
> for how Spec Kit, `speckit-project`, `quality-evidence`, the test producers, and
> Quality Center compose — and the principles behind the boundaries.

## Included Assets

| Asset | Purpose |
| --- | --- |
| `auto-pr` | Create a PR against the repo's base branch (arg › CLAUDE.md › repo default), run pre-review, wait for Claude bot review, address blockers, and merge. |
| `code-review-run` | Run a standalone, medium-effort `/code-review` (in-session or headless), optionally save a ranked round-N report, and reconcile findings across multi-round reviews. |
| `speckit-project` | Orchestrate project-level Spec Kit work: PRD, roadmap, project map, feature breakdown, active feature selection, brownfield reconstruction, and feature lifecycle sequencing. |
| `quality-evidence` | Assess and improve quality evidence for a project or feature, map coverage depth, run verification, add worthwhile tests/checks, and write user-facing confidence reports. |
| `create-agent-tests` | Author, scaffold, and run coding-agent-driven Markdown test cases against a live environment, with an auditable PASS/FAIL/BLOCKED report. Sibling to `create-tests` (YAML E2E). |
| `shell-agent` | Experimental `??` helper for launching provider-native agents from bash/zsh. |

Skills bundle their own starter assets and copy them into a target repo on
demand, so there is nothing extra to install:

- `quality-evidence/assets/`: quality-map template and schema, plus
  test-spec/report templates.
- `create-agent-tests/assets/`: the `run-agent-verification.ts` runner, the
  agent-test case template, and an example suites manifest, with runner setup
  documented in `create-agent-tests/references/runner.md`. These are copied into
  `tests/agent/` when a project adopts agent tests.

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
npx skills add ShiplightAI/internal-agent-skills --skill create-agent-tests -a codex -y
```

## Speckit Project Prerequisites

The `speckit-project` skill assumes the target repo is already initialized with
GitHub Spec Kit and that the active agent has Shiplight MCP plus Shiplight
skills installed.

- Spec Kit: https://github.com/github/spec-kit/blob/main/README.md
- Shiplight agent skills and MCP: https://github.com/ShiplightAI/agent-skills/blob/main/README.md

Note: the `create-agent-tests` starter assets (the `run-agent-verification.ts`
runner, the agent-test case template, and the example suites manifest) ship
inside that skill's bundle under `skills/create-agent-tests/assets/`. The skill
copies them into a target repo's `tests/agent/` only when a project adopts agent
tests; there is no separate install step. Each target repo still owns its real
`tests/agent/agent-test-suites.json`, case files, fixtures, auth/session
bootstrap, CI wiring, engine secrets, MCP config, and environment mutation
policies.

`quality-evidence` replaces the earlier `test-quality` skill name. Existing
projects that already use `test-quality/` evidence artifacts can keep that
directory until they explicitly migrate; the skill preserves that convention when
`test-quality/` already exists and `quality-evidence/` does not.

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
