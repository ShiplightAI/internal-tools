# Test Report: <Target>

**Test spec**: [test-spec.md](./test-spec.md)
**Quality map**: [quality-map.yaml](./quality-map.yaml)
**Branch / commit**: <branch and commit if available>
**Last updated**: <YYYY-MM-DD>
**Tester**: <agent or person>

This report records what was tested, what evidence exists, what failed or was
blocked, and which residual risks remain after applying the target test spec. It
is the dynamic snapshot: current run outcomes, freshness, and confidence live
here, not in `quality-map.yaml`.

## Summary

- Overall status: `PASS` / `FAIL` / `PARTIAL` / `BLOCKED`
- Overall confidence: `HIGH` / `MEDIUM` / `LOW` / `UNKNOWN`
- Main confidence gained:
- Blocking findings:
- Residual release risk:

## Source Material

- Source material used: <specs, PRDs, tickets, docs, code, user input>
- Source material not found or not available:

## Commands Run

| Command | Result | Notes |
| --- | --- | --- |
| `<command>` | `PASS` / `FAIL` / `BLOCKED` / `SKIPPED` / `NOT RUN` | <summary> |

Include any prerequisite or artifact-producing commands that later checks
relied on.

## Tests Added Or Updated

| Type | Files | Tests |
| --- | ---: | ---: |
| Unit | 0 | 0 |
| Contract | 0 | 0 |
| Integration | 0 | 0 |
| E2E | 0 | 0 |
| Agent | 0 | 0 |
| Script / static | 0 | 0 |
| **Total** | **0** | **0** |

### File List

- `<path>` (<count> tests)

## Coverage Matrix

Derived from `quality-map.yaml` plus the run results observed in this report.
Use coverage statuses consistently: `COVERED`, `PARTIAL`, `IMPLICIT`,
`NOT COVERED`, `NOT MEASURED`, `MANUAL`, `BLOCKED`, or `DEFERRED`.

| Quality check | Risk | Evidence depth | Status | Observed outcome | Residual risk |
| --- | --- | --- | --- | --- | --- |
| <expectation id / title> | <1-5> | <DIRECT/INDIRECT/STATIC/...> | <status> | <PASS/FAIL/BLOCKED/...> | <remaining gap> |

When a numbered Speckit spec backs this target, you may add requirement- and
success-criteria-keyed sub-tables (FR-001, SC-001, ...) below this matrix. They
are optional and supplement, not replace, the quality-check matrix above.

## Agent Test Evidence

- `<agent test path>` — Status: `<PASS/FAIL/BLOCKED/ABORTED>`. Evidence:
  `<report/screenshot/video/trace path or URL>`.

Text-only browser claims are not sufficient; require an auditable artifact for
browser-driven cases. Treat `ABORTED` as an orchestration interruption to rerun,
not as product evidence.

## Manual Verification Log

### <YYYY-MM-DD>

- Environment:
- Scenarios checked:
- Result:
- Anomalies:

## Findings

List blocking failures first.

- [ ] **<severity> <id/title>**: <finding>. Evidence: <path/link>. Follow-up:
  <owner/action>.

## Deferred / Residual Risk

- [ ] **<id/title>**: <what is not proven>. Retest: `<command or procedure>`.
  Pass criterion: <observable signal>.

## Cleanup

- Cleanup performed:
- Resources intentionally left behind:
- Follow-up cleanup required:

## Coverage Summary

- Total testing whats:
- COVERED:
- PARTIAL:
- IMPLICIT:
- NOT COVERED:
- NOT MEASURED:
- MANUAL:
- BLOCKED:
- DEFERRED:

Never include passwords, API keys, cookies, tokens, database URLs, or raw secret
fixture payloads in this report.
