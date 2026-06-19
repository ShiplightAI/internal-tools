# Quality Evidence Vocabularies

The complete status vocabularies used across quality-evidence artifacts. Each
vocabulary belongs to **one** artifact; do not mix them across artifacts. The
runtime-analysis vocabularies are owned by the tooling and are never authored
into hand-written artifacts.

Quick map of which vocabulary belongs where:

| Vocabulary | Artifact | Authored by |
| --- | --- | --- |
| Evidence depth | `quality-map.yaml` evidence rows | this skill |
| Result status | `test-report.md` command/test outcomes | this skill |
| Coverage status | `test-report.md` coverage matrix | this skill |
| Overall confidence | `test-report.md` summary | this skill |
| Observed state / stage status | runtime analysis output | `quality-tools` (never hand-authored) |

`source_type` (`SOURCE` / `IMPLEMENTATION` / `INFERRED`) and
`structure_provenance` (`spec` / `user_authored` / `agent_generated` /
`inferred_brownfield` / `unspecified`) are defined in the SKILL itself, since they
are discussed in context with their authoring rules.

## Evidence depth — `quality-map.yaml` evidence rows

Depth labels explain confidence, not just whether a row exists:

- `DIRECT`: evidence directly proves the behavior or invariant.
- `INDIRECT`: evidence exercises the behavior through a broader workflow.
- `STATIC`: typecheck, lint, schema, static analysis, or compile evidence only.
- `MANUAL`: human or agent-observed evidence.
- `IMPLICIT`: relied on by implementation structure but not directly tested.
- `MISSING`: no meaningful evidence found.
- `BLOCKED`: environment, access, dependency, fixture, or tool limitation.

Use `MISSING` or `BLOCKED` only when they describe the current proof
*definition*, not a runtime result.

## Result status — `test-report.md` command and test outcomes

`PASS`, `FAIL`, `PARTIAL`, `BLOCKED`, `SKIPPED`, `NOT RUN`, `DEFERRED`,
`ABORTED`, or `UNKNOWN`.

Treat `ABORTED` as an orchestration interruption to rerun, not as product
evidence.

## Coverage status — `test-report.md` coverage matrix

`COVERED`, `PARTIAL`, `IMPLICIT`, `NOT COVERED`, `NOT MEASURED`, `MANUAL`,
`BLOCKED`, or `DEFERRED`.

## Overall confidence — `test-report.md` summary

- `HIGH`: critical testing whats have direct or strong indirect evidence and
  relevant checks passed.
- `MEDIUM`: main behavior is evidenced, but important edges, integrations, or
  operational risks remain weak.
- `LOW`: evidence is mostly inferred, manual, blocked, missing, stale, or
  failing.
- `UNKNOWN`: the target could not be evaluated enough to judge.

## Runtime analysis — owned by tooling, never authored

Runtime analysis output owns its own lowercase vocabularies. Do not copy them
into authored artifacts:

- Observed states: `pass`, `fail`, `error`, `skipped`, `unobserved`.
- Stage statuses: `valid`, `partial`, `invalid`.

A stage status of `partial` is **not** the report status `PARTIAL`.
