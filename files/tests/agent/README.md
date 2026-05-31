# Agent Tests

Agent tests are coding-agent-driven browser or live-environment checks used
when a workflow needs flexible inspection before it is stable enough for a
fully deterministic E2E test.

## Installed Files

The shared installer can scaffold these files into a workspace:

- `tests/agent/agent-test-template.md`: case authoring template
- `tests/agent/agent-test-suites.example.json`: manifest example
- `quality-evidence/run-agent-verification.ts`: local runner/orchestrator

Each project owns its real `tests/agent/agent-test-suites.json`, case files,
fixtures, secrets, session bootstrap, CI wiring, and mutation policy.

## Runner Setup

Add a package script in the target repo, adjusted for its package manager:

```json
{
  "scripts": {
    "agent:verify": "tsx quality-evidence/run-agent-verification.ts"
  }
}
```

If the repo already uses the legacy `test-quality/` root and the installer put
the runner there, use `tsx test-quality/run-agent-verification.ts` instead.

Create a real manifest from the example:

```bash
cp tests/agent/agent-test-suites.example.json tests/agent/agent-test-suites.json
```

Then run a suite:

```bash
pnpm agent:verify --target local --suite smoke --project-name "<project name>"
```

Or run one case file directly:

```bash
pnpm agent:verify --target local --case tests/agent/example/browser-smoke.md
```

## Runner Configuration

Defaults:

- Manifest: `tests/agent/agent-test-suites.json`
- Reports: `agent-test-reports`
- Allowed targets: `local,staging,production`
- Engine: `codex`

Useful flags and matching environment variables:

| Flag | Environment variable |
| --- | --- |
| `--target` | `AGENT_VERIFICATION_TARGET` |
| `--engine` | `AGENT_VERIFICATION_ENGINE` |
| `--manifest` | `AGENT_VERIFICATION_MANIFEST_PATH` |
| `--report-dir` | `AGENT_VERIFICATION_REPORT_DIR` |
| `--allowed-targets` | `AGENT_VERIFICATION_ALLOWED_TARGETS` |
| `--project-name` | `AGENT_VERIFICATION_PROJECT_NAME` |
| `--claude-mcp-config` | `AGENT_VERIFICATION_CLAUDE_MCP_CONFIG` |

The runner accepts final statuses `PASS`, `FAIL`, `BLOCKED`, and `ABORTED`.
The final non-empty line of each report must be exactly one of:

```text
Status: PASS
Status: FAIL
Status: BLOCKED
Status: ABORTED
```

Required cases fail the runner unless they return `PASS`. `ABORTED` is reserved
for orchestration interruptions and should be rerun rather than treated as
product evidence.

## Evidence

Browser-driven cases must produce auditable evidence such as an HTML report,
screenshot set, video, trace, or project-standard equivalent. Text-only browser
claims are not sufficient.
