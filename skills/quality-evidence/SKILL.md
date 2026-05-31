---
name: quality-evidence
description: Assess and improve quality evidence for a project or feature by defining what must be proven, mapping risk-weighted executable evidence in quality-map.yaml, adding worthwhile tests or checks, running verification, and writing owner-facing confidence reports. Speckit-aware but not Speckit-dependent.
user_invocable: true
---

# Quality Evidence

Quality evidence workflow for projects, features, modules, PRs, tickets, PRDs,
or user-described changes. Use when the owner wants to understand or raise
confidence in a system through clear "what must be proven", clear "how it is
proven", focused improvements, and an auditable pass/fail report.

This skill is Speckit-aware but not Speckit-dependent. It works best when a
Speckit spec provides the upstream truth; for brownfield projects, it can
reconstruct provisional expectations from docs, code, tests, CI, and runtime
behavior, then mark those expectations as `IMPLEMENTATION` or `INFERRED` until
the user ratifies them.

## Core Model

Separate testing into two layers:

1. **Testing what**: behaviors, properties, risks, and expectations that must
   be verified to trust the project or feature.
2. **Testing how**: evidence used to verify the what: unit, contract,
   integration, E2E, agent tests, manual checks, telemetry, static
   checks, smoke tests, CI, or project-specific mechanisms.

Quality evidence is not test count. Optimize for justified confidence per unit
of cost, stability, latency, diagnostic value, and maintenance.

Represent quality as an evidence graph:

```text
expectation -> task/implementation -> test intent -> executable evidence ->
latest result -> weighted evaluation -> residual risk
```

Each expectation should carry a risk weight before evaluating tests. Evidence
should then be judged by breadth, depth, latest result, reliability, freshness,
and whether it is CI/release gated. Do not weight every test equally.

## Scope Resolution

Resolve the target before writing artifacts or adding tests:

- **Feature scope**: a named feature, PRD item, ticket, route, module, workflow,
  branch diff, or implementation area.
- **Project scope**: the whole repo, app, service, package, or subsystem.

Use explicit user input first. If the user does not provide a source, silently
infer the target from current git changes, repo structure, docs, tests, package
scripts, and CI config. Mark inferred expectations as `INFERRED` in artifacts.

## Target Slug Naming

Use stable target slugs so specs, tasks, quality maps, reports, tests, and UI
routes can be joined reliably.

- Project scope uses the fixed slug `project`.
- Feature, module, PR, and ticket scopes use Speckit-style
  `NNN-kebab-case-name`, for example `026-enterprise-rate-card`.
- If a source folder, branch, issue, or spec already has a numeric prefix, reuse
  that exact slug. Do not drop `NNN-`.
- If a repo has `specs/NNN-feature-name`, the default evidence target for that
  feature is `quality-evidence/NNN-feature-name/`.
- If no numeric source exists, choose the next unused three-digit prefix in the
  repo's feature sequence before creating the target. Record the choice in
  `quality-map.yaml`.
- If legacy unnumbered artifacts exist for a numbered feature, migrate or update
  toward the canonical numbered slug instead of creating a second parallel
  quality target. Preserve old slugs under `target.aliases` when useful.

## Source Discovery

Gather only the source material needed for the target:

- User-provided description, PRD, acceptance criteria, issue, or ticket text.
- Local docs: `README*`, `docs/**`, `specs/**`, `requirements/**`, `prd/**`,
  ADRs, API docs, release notes, and design docs.
- Implementation: relevant source files, schemas, routes, jobs, migrations,
  configuration, and changed files from git when available.
- Existing proof: unit, contract, integration, E2E, agent, manual, telemetry,
  CI, scripts, typecheck, lint, and previous reports.
- Runtime/app behavior when relevant and feasible.

Do not invent requirements. Distinguish `SOURCE` expectations from
`IMPLEMENTATION` expectations and `INFERRED` expectations.

## Artifact Location

Create or update these artifacts:

- Feature target: `quality-evidence/<target-slug>/test-spec.md`
- Feature target: `quality-evidence/<target-slug>/quality-map.yaml`
- Feature target: `quality-evidence/<target-slug>/test-report.md`
- Project target: `quality-evidence/project/test-spec.md`
- Project target: `quality-evidence/project/quality-map.yaml`
- Project target: `quality-evidence/project/test-report.md`

For new projects, use `quality-evidence/`. For existing repos that already use
the legacy `test-quality/` root, continue updating that root unless the user
explicitly asks to migrate. Do not create parallel `quality-evidence/` and
`test-quality/` evidence trees for the same target.

If the repo has another obvious existing convention for quality evidence
artifacts, use that convention only when it clearly fits, but keep the canonical
target slug format above. Do not require `specs/`, `plan.md`, `tasks.md`,
`.specify/`, or Spec Kit templates.

`quality-map.yaml` is the canonical machine-readable artifact. Markdown files
are owner-readable projections and narrative summaries. When creating a new map,
copy and fill `assets/quality-map.template.yaml`. When tooling or validation is
available, validate against `assets/quality-map.schema.json`.

## Quality Map

Maintain `quality-map.yaml` around expectations, not test files. Each
expectation should include:

- Stable expectation id and title.
- Source type: `SOURCE`, `IMPLEMENTATION`, or `INFERRED`.
- Source references to specs, PRDs, issues, code, docs, or user input.
- Category and priority.
- Risk weight from 1 to 5 with rationale.
- Related implementation tasks when available.
- Evidence entries for unit, contract, integration, E2E, agent, manual,
  telemetry, static, smoke, script, or project-specific checks.
- Latest result status, command or artifact path, commit/timestamp when known,
  and whether the evidence is CI/release gated.
- Evaluation fields: coverage status, confidence, breadth, depth, freshness,
  weighted confidence, residual risk, and next best proof.

Use the map for agent handoff, UI visualization, release gates, trend analysis,
and gap prioritization. Preserve the input fields behind any confidence
judgment so scoring formulas can evolve without losing the audit trail.

## Evidence Categories

Keep categories distinct in `quality-map.yaml` and the Markdown report:

| Category | Use for | Evidence |
| --- | --- | --- |
| Automated tests | Unit, contract, integration, E2E, scripts, static checks, CI | Command output and file paths |
| Agent tests | Coding-agent-driven UI, API, DB, full-stack, or live-env verification | Written report plus HTML report, screenshot set, video, trace, logs, state notes, or project-standard artifact |
| Manual checks | Human-observed checks | Human notes, optional report/artifact links |
| Live telemetry | Production/staging SLOs and operational signals | Dashboard/query/link and timestamp |
| Deferred / implicit | Low-value automation, source-level invariant, missing environment, or future sweep item | Reason and retest path |

When a coding agent drives a browser, produce auditable evidence. Text-only
claims are not enough for browser verification.

## Coverage Depth

Use depth labels to explain confidence, not just whether a row exists:

- `DIRECT`: evidence directly proves the behavior or invariant.
- `INDIRECT`: evidence exercises the behavior through a broader workflow.
- `STATIC`: typecheck, lint, schema, static analysis, or compile evidence only.
- `MANUAL`: human or agent-observed evidence.
- `IMPLICIT`: relied on by implementation structure but not directly tested.
- `MISSING`: no meaningful evidence found.
- `BLOCKED`: environment, access, dependency, fixture, or tool limitation.

Use result statuses consistently in reports: `PASS`, `FAIL`, `PARTIAL`,
`BLOCKED`, `SKIPPED`, `NOT RUN`, `DEFERRED`, `ABORTED`, or `UNKNOWN`.

Use coverage statuses consistently in matrices: `COVERED`, `PARTIAL`,
`IMPLICIT`, `NOT COVERED`, `NOT MEASURED`, `MANUAL`, `BLOCKED`, or `DEFERRED`.

Use overall confidence:

- `HIGH`: critical testing whats have direct or strong indirect evidence and
  relevant checks passed.
- `MEDIUM`: main behavior is evidenced, but important edges, integrations, or
  operational risks remain weak.
- `LOW`: evidence is mostly inferred, manual, blocked, missing, stale, or
  failing.
- `UNKNOWN`: the target could not be evaluated enough to judge.

## Workflow

### 1. Resolve Target And Inputs

- Identify project or feature scope.
- Record source material used and source material not found.
- Locate prior `test-spec.md`, `quality-map.yaml`, and `test-report.md` for
  this target if present.
- Read changed implementation and tests when git context exists, using the
  branch merge base when available.

### 2. Define Or Refresh Testing What

Write `quality-evidence/<target>/test-spec.md` as the durable testing contract.
Include:

- Product behaviors and user workflows.
- API, schema, data, routing, permissions, transaction, audit, cleanup,
  idempotency, migration, job, and architecture invariants.
- Security, privacy, billing, compliance, data integrity, reliability,
  performance, and high-blast-radius risks.
- UX, accessibility, browser behavior, historical regressions, third-party
  assumptions, and operational expectations when relevant.
- Source attribution for each important expectation.
- Automated check commands and acceptable evidence options for each test case
  when they are known.

### 3. Inventory Testing How

Find existing evidence and map it to the testing what in `quality-map.yaml`:

- Unit tests and source-adjacent tests.
- Contract/API/schema/action boundary tests.
- Integration tests for DB, transactions, jobs, migrations, and cross-module
  behavior.
- E2E/browser tests.
- Agent-driven UI, API, DB, full-stack, or live-env checks.
- Manual verification notes.
- Telemetry dashboards, queries, or SLOs.
- Typecheck, lint, static analysis, scripts, smoke checks, and CI.

### 4. Analyze Gaps And Select Proofs

For each weak or missing testing what, choose the cheapest sufficient proof.
Consider confidence gained, risk severity, stakeholder visibility, flake risk,
runtime, fixture complexity, cleanup burden, diagnostic value, and maintenance.

Prioritize gaps with risk-weighted judgment. A release-critical billing,
security, data isolation, or destructive-admin expectation with weak direct
evidence should outrank many low-risk UI or display gaps.

Useful defaults:

- Deterministic pure logic: unit tests.
- Public boundaries, server actions, route handlers, authz, and schema
  validation: contract tests.
- DB state, transactions, audit rows, migrations, jobs, and cross-module
  invariants: integration tests.
- User-visible browser behavior, routing, session behavior, role-gated UI, and
  rendered regressions: project-standard E2E, agent, or manual browser checks.
- Third-party callbacks, staging-only auth, production SLOs, and live signals:
  agent tests, manual checks, or telemetry.

### 5. Improve Worthwhile Evidence

Add or update tests and checks when they materially raise confidence. Keep edits
scoped to tests, test fixtures, test scripts, reports, and minimal support code
needed for testability. Do not add brittle tests merely to increase count.
Classify low-value or unavailable checks as implicit, deferred, blocked, or not
measured with a reason.

### 6. Run Verification

Run targeted checks first, then broader suites when justified:

- New or changed tests.
- Relevant existing unit, contract, integration, or E2E tests.
- Typecheck, lint, build, migration, smoke, or CI-equivalent commands.
- Migration generation/application checks when schema or data migrations are in
  scope.
- Agent checks when required by the test spec, including browser, API, DB, or
  mixed full-stack verification.

Record exact commands, outcomes, and important failure details. If a capability
is missing, mark it `BLOCKED` or `NOT MEASURED`; do not claim it passed.

### 7. Write Or Update Quality Map

Write `quality-evidence/<target>/quality-map.yaml` as the structured evidence
graph. Use the bundled template for new maps:

- `assets/quality-map.template.yaml`

Use the bundled schema as the validation contract for tools and UIs:

- `assets/quality-map.schema.json`

On repeat runs:

- Preserve stable expectation and evidence ids when the meaning is unchanged.
- Refresh latest results, timestamps, commits, artifacts, and CI-gating status.
- Update weighted evaluations only when evidence or risk actually changed.
- Mark stale, flaky, blocked, missing, or deferred evidence explicitly.
- Add release blockers, high-risk gaps, stale/flaky evidence, and deferred
  items to `gap_summary` when applicable.

### 8. Write Or Update Test Report

Write `quality-evidence/<target>/test-report.md` as the current evidence snapshot.
Include:

- Target, scope, source material, branch/commit when available, and timestamp.
- Overall status and confidence.
- Commands run and pass/fail/block results.
- Coverage matrix derived from `quality-map.yaml`, including risk weight,
  evidence depth, latest result, weighted confidence, and residual risk.
- Tests added or updated.
- Blocking findings first.
- Deferred items and residual risk with retest paths.
- Cleanup performed and resources intentionally left behind.

On repeat runs, refresh current results, preserve useful historical manual logs
and evidence links, update timestamps, and close deferred items only when new
evidence actually covers them.

## Specialized Test Authoring

When the project has a specialized local test-authoring workflow, use it for
implementation details rather than inventing tests directly. For example, use a
project's established browser, E2E, YAML, mobile, load, migration, or contract
test workflow to create, update, validate, and run those tests. Then map the
resulting specs, test files, command output, and run artifacts back into this
skill's `quality-map.yaml`, coverage matrix, and test report.

## Agent Test Authoring

Use agent tests when verification requires flexible, tool-driven judgment across
UI, API, database, logs, files, network, or live-environment state, and when a
deterministic test would be premature, brittle, too expensive, or too narrow.

Agent tests are especially useful for:

- UI changes that require visual, interactive, browser-console, network, or
  trace verification.
- API and DB workflows where confidence requires live requests plus persisted
  state inspection.
- Full-stack flows that cross frontend, backend, storage, jobs, external mocks,
  and cleanup.
- Exploratory regression checks before converting stable paths into standard
  unit, contract, integration, E2E, or YAML tests.

Agent tests are not a replacement for deterministic tests. Prefer converting
high-value stable agent flows to the project's standard automated test format
later.

Before authoring an agent test, check for `tests/agent/agent-test-template.md`.
If it exists, treat it as the authoritative local convention. Do not rediscover
or replace it through broad search unless the user explicitly asks to update the
local convention.

If no local convention exists and an agent test is the cheapest sufficient
proof, scaffold from the installed internal assets:

- `tests/agent/agent-test-template.md`
- `tests/agent/agent-test-suites.example.json`
- `quality-evidence/run-agent-verification.ts`

If those files have not been installed but the internal skill bundle is
available, use the bundled sources under `files/tests/agent/`:

- `files/tests/agent/agent-test-template.md`
- `files/tests/agent/agent-test-suites.example.json`
- `files/tests/agent/run-agent-verification.ts`
- `files/tests/agent/README.md`

Each repo owns its real `tests/agent/agent-test-suites.json`, actual case files
under `tests/agent/<feature>/`, fixture setup commands, auth/session bootstrap,
CI wiring, engine secrets and MCP config, staging/production mutation policies,
and cleanup ownership.

Agent reports should use the local runner/report convention when present. Map
the report path, final `PASS`/`FAIL`/`BLOCKED`/`ABORTED` status, and evidence
artifacts such as HTML reports, screenshot sets, videos, or traces back into
`quality-evidence/<target>/quality-map.yaml` and
`quality-evidence/<target>/test-report.md`. Text-only browser claims are not
sufficient evidence.

## Artifact Skeletons

Use these sections unless the repo has a better local convention.

`test-spec.md`:

```markdown
# Test Spec: <Target>

**Scope**: <project|feature|module|PR|ticket>
**Source material**: <paths, prompt, issue, PRD, inferred>
**Test report**: [test-report.md](./test-report.md)

## Testing What
## Evidence Strategy
## Test Cases
## Fixtures And Environments
## Report Expectations
## Coverage Notes
```

`quality-map.yaml`:

```yaml
schema_version: 1
target:
  id: 001-example-feature # or project for project scope
  name: <target name>
  scope: feature
  aliases: []
  source_refs: []
assessment:
  updated_at: <ISO-8601 timestamp>
  branch: <branch-or-unknown>
  commit: <git-sha-or-unknown>
  generated_by: quality-evidence
  overall_status: UNKNOWN
  overall_confidence: UNKNOWN
expectations:
  - id: <stable-expectation-id>
    title: <behavior or invariant>
    source_type: SOURCE
    category: other
    priority: P1
    risk:
      weight: 3
      rationale: <why failure matters>
    evidence: []
    evaluation:
      coverage_status: NOT COVERED
      confidence: UNKNOWN
      breadth: MISSING
      depth: MISSING
      freshness: UNKNOWN
      weighted_confidence: UNKNOWN
      residual_risk: <what remains unproven>
      next_best_proof: <highest-value follow-up evidence>
gap_summary:
  release_blockers: []
  high_risk_gaps: []
  stale_or_flaky_evidence: []
  deferred_items: []
```

For the full starter, copy `assets/quality-map.template.yaml`. For validation,
use `assets/quality-map.schema.json`.

`test-report.md`:

```markdown
# Test Report: <Target>

**Test spec**: [test-spec.md](./test-spec.md)
**Quality map**: [quality-map.yaml](./quality-map.yaml)
**Branch / commit**: <branch and commit if available>
**Last updated**: <YYYY-MM-DD>
**Tester**: <agent or person>

## Summary
## Source Material
## Commands Run
## Tests Added Or Updated
## Coverage Matrix
## Agent Test Evidence
## Manual Verification Log
## Findings
## Deferred / Residual Risk
## Cleanup
## Coverage Summary
```

## Operating Rules

- This skill may edit tests, test fixtures, test scripts,
  `quality-evidence/**`, legacy `test-quality/**`, and project-standard test
  evidence folders.
- Avoid unrelated refactors and unrelated production-code changes.
- Keep `quality-map.yaml` stable enough for tools: preserve ids, use the schema
  enums, and avoid free-form dialects when a field already exists.
- Never include secrets, cookies, tokens, database URLs, raw fixture secrets, or
  private customer data in specs, reports, logs, or artifacts.
- Never report pass/fail without command output, automated test evidence, or
  explicit observation.
- Never report browser/live behavior as verified by a coding agent without
  auditable evidence.
- Prefer owner-facing clarity over exhaustive detail.

## When Not To Use

- When the user only wants a code review with no evidence-quality assessment.
- When implementation does not exist and the user only wants product planning.
- When the user wants only a narrow command run and no quality mapping.
