# Shiplight Internal Agent Skills

Private Shiplight agent assets for internal development workflows.

This repository intentionally contains internal-only skills and prompts. Public
Shiplight agent skills remain in `ShiplightAI/agent-skills`.

## Included Assets

| Asset | Purpose |
| --- | --- |
| `auto-pr` | Create a PR against `staging`, run pre-review, wait for Claude bot review, address blockers, and merge. |
| `speckit-verify` | Audit implemented Spec Kit features and write `specs/<feature>/verification.md`. |
| `.agents/smoke-test-agent.md` | Generic smoke-test subagent prompt copied into each project repo. |

## Install

From a target project repo:

```bash
curl -fsSL https://raw.githubusercontent.com/ShiplightAI/internal-agent-skills/main/install.sh | bash -s -- -a codex -y
```

Install for another `skills`-supported agent by changing the `-a` value:

```bash
curl -fsSL https://raw.githubusercontent.com/ShiplightAI/internal-agent-skills/main/install.sh | bash -s -- -a claude-code -y
curl -fsSL https://raw.githubusercontent.com/ShiplightAI/internal-agent-skills/main/install.sh | bash -s -- -a gemini -y
```

Install for all supported agents detected by `skills`:

```bash
curl -fsSL https://raw.githubusercontent.com/ShiplightAI/internal-agent-skills/main/install.sh | bash -s -- --all
```

The installer delegates all arguments to:

```bash
npx -y skills add ShiplightAI/internal-agent-skills "$@"
```

That means normal `skills` flags such as `-a`, `--all`, `-g`, `--copy`, and
`--skill` continue to work without this repository maintaining an agent
compatibility list.

## Install Individual Skills

```bash
curl -fsSL https://raw.githubusercontent.com/ShiplightAI/internal-agent-skills/main/install.sh | bash -s -- --skill auto-pr -a codex -y
```

Note: `.agents/smoke-test-agent.md` is installed whenever `install.sh` runs,
because it is a repo-local prompt rather than a `skills` skill.

## Update

Re-run the same install command from the target project repo.
