# Shiplight Development Tools

Agent skills and GitHub Actions for code review, pull requests, and release notes.
Companion Shiplight agent skills live in `ShiplightAI/agent-skills`.

The `quality` and `speckit-project` skills have moved to `ShiplightAI/quality`.
Install them from there, naming the one you want:

```bash
npx skills add ShiplightAI/quality/agent-skills --skill quality -a claude-code -y
npx skills add ShiplightAI/quality/agent-skills --skill speckit-project -a claude-code -y
```

## Included Assets

| Asset | Purpose |
| --- | --- |
| `auto-pr` | Create a PR against the repo's base branch (arg › CLAUDE.md › repo default), wait for Claude bot review, address blockers, and merge. |
| `code-review-run` | Run a standalone, medium-effort `/code-review` (in-session or headless), optionally save a ranked round-N report, and reconcile findings across multi-round reviews. |
| `reflect` | Propose durable lessons for agent instructions after completed work. |
| `claude-review` | Submit severity-based PR reviews using the Claude GitHub App. |
| `release-notes` | Generate release notes with a bounded model fallback chain. |

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

## Install Individual Skills

```bash
npx skills add ShiplightAI/internal-tools/agent-skills --skill auto-pr -a codex -y
```

## Update

Re-run the same install command from the target project repo.

## Requirements and trust

Skill installation uses Node.js/npm and the `skills` CLI. Individual skills also
need Git, the GitHub CLI authenticated for the target repository, and the agent
CLI or plugins named in their instructions. Some workflows are Claude-specific;
installing a skill for another agent does not supply those capabilities.

Read a skill before invoking it. `auto-pr` can rebase, push, and merge branches;
`code-review-run` documents an unattended mode that bypasses permission prompts.
Use these only with repositories and instructions you trust. Configure human
review and required checks for repositories where these tools can merge changes.

The GitHub Actions use Claude credentials and send review content or commit
messages to the model provider. See [workflow setup](github-workflows/README.md)
for permissions, fork handling, and pinning action versions.

## Development and support

See [CONTRIBUTING.md](CONTRIBUTING.md) for checks and contribution guidance.
Support is best effort through GitHub issues. Report security problems privately
as described in [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE).
