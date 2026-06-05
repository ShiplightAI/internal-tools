# Agent Test Runner

Reference for `run-agent-verification.ts`, the orchestrator that executes agent
test cases and enforces the report status contract. The `create-agent-tests`
skill covers when and how to author cases; this file covers running them.

## Scaffolded Files

When a project adopts agent tests, the `create-agent-tests` skill copies these
starters from its own bundle (`<skill-dir>/assets/`) into the repo:

- `tests/agent/agent-test-template.md`: case authoring template
- `tests/agent/agent-test-suites.example.json`: manifest example
- `tests/agent/run-agent-verification.ts`: local runner/orchestrator

Each project owns its real `tests/agent/agent-test-suites.json`, case files,
fixtures, secrets, session bootstrap, CI wiring, and mutation policy.

## Runner Setup

Add a package script in the target repo, adjusted for its package manager:

```json
{
  "scripts": {
    "agent:verify": "tsx tests/agent/run-agent-verification.ts"
  }
}
```

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
