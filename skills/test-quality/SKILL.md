---
name: test-quality
description: Assess and improve testing quality for a project or feature by defining what should be tested, mapping current evidence depth, adding worthwhile tests or checks, running verification, and writing owner-facing test quality reports.
user_invocable: true
---

# Test Quality

Testing quality workflow for projects, features, modules, PRs, tickets, PRDs,
or user-described changes. Use when the owner wants to understand or raise
confidence in a system through clear "testing what", clear "testing how",
focused improvements, and an auditable pass/fail report.

This skill is not tied to Spec Kit. Source material can be user-provided,
repo-local docs, PRDs, specs, issues, current implementation, git changes,
existing tests, CI config, runtime behavior, or a silent scan of the repository.

## Core Model

Separate testing into two layers:

1. **Testing what**: behaviors, properties, risks, and expectations that must
   be verified to trust the project or feature.
2. **Testing how**: evidence used to verify the what: unit, contract,
   integration, E2E, agent browser tests, manual checks, telemetry, static
   checks, smoke tests, CI, or project-specific mechanisms.

Testing quality is not test count. Optimize for justified confidence per unit
of cost, stability, latency, diagnostic value, and maintenance.

## Scope Resolution

Resolve the target before writing artifacts or adding tests:

- **Feature scope**: a named feature, PRD item, ticket, route, module, workflow,
  branch diff, or implementation area.
- **Project scope**: the whole repo, app, service, package, or subsystem.

Use explicit user input first. If the user does not provide a source, silently
infer the target from current git changes, repo structure, docs, tests, package
scripts, and CI config. Mark inferred expectations as `INFERRED` in artifacts.

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

- Feature target: `test-quality/<target-slug>/test-spec.md`
- Feature target: `test-quality/<target-slug>/test-report.md`
- Project target: `test-quality/project/test-spec.md`
- Project target: `test-quality/project/test-report.md`

If the repo has an obvious existing convention for test quality artifacts, use
that convention only when it clearly fits. Do not require `specs/`, `plan.md`,
`tasks.md`, `.specify/`, or Spec Kit templates.

## Evidence Categories

Keep categories distinct in both artifacts:

| Category | Use for | Evidence |
| --- | --- | --- |
| Automated tests | Unit, contract, integration, E2E, scripts, static checks, CI | Command output and file paths |
| Agent tests | Coding-agent-driven browser/live-env verification | Written report plus HTML report, screenshot set, video, trace, or project-standard artifact |
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
`BLOCKED`, `SKIPPED`, `NOT RUN`, or `DEFERRED`.

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
- Locate prior `test-spec.md` and `test-report.md` for this target if present.
- Read changed implementation and tests when git context exists, using the
  branch merge base when available.

### 2. Define Or Refresh Testing What

Write `test-quality/<target>/test-spec.md` as the durable testing contract.
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

Find existing evidence and map it to the testing what:

- Unit tests and source-adjacent tests.
- Contract/API/schema/action boundary tests.
- Integration tests for DB, transactions, jobs, migrations, and cross-module
  behavior.
- E2E/browser tests.
- Agent-driven browser/live-env checks.
- Manual verification notes.
- Telemetry dashboards, queries, or SLOs.
- Typecheck, lint, static analysis, scripts, smoke checks, and CI.

### 4. Analyze Gaps And Select Proofs

For each weak or missing testing what, choose the cheapest sufficient proof.
Consider confidence gained, risk severity, stakeholder visibility, flake risk,
runtime, fixture complexity, cleanup burden, diagnostic value, and maintenance.

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
- Agent/browser checks when required by the test spec.

Record exact commands, outcomes, and important failure details. If a capability
is missing, mark it `BLOCKED` or `NOT MEASURED`; do not claim it passed.

### 7. Write Or Update Test Report

Write `test-quality/<target>/test-report.md` as the current evidence snapshot.
Include:

- Target, scope, source material, branch/commit when available, and timestamp.
- Overall status and confidence.
- Commands run and pass/fail/block results.
- Coverage matrix with evidence depth.
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
skill's coverage matrix and test report.

## Agent Test Authoring

Use agent tests when browser or live-environment workflows need flexible,
auditable proof and a deterministic E2E test would be premature, brittle, or
too expensive. Prefer converting high-value stable agent flows to the project's
standard E2E format later.

Before authoring an agent test, check for `tests/agent/agent-test-template.md`.
If it exists, treat it as the authoritative local convention. Do not rediscover
or replace it through broad search unless the user explicitly asks to update the
local convention.

If no local convention exists and an agent test is the cheapest sufficient
proof, scaffold from the installed internal assets:

- `tests/agent/agent-test-template.md`
- `tests/agent/agent-test-suites.example.json`
- `test-quality/run-agent-verification.ts`

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
`test-quality/<target>/test-report.md`. Text-only browser claims are not
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

`test-report.md`:

```markdown
# Test Report: <Target>

**Test spec**: [test-spec.md](./test-spec.md)
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

- This skill may edit tests, test fixtures, test scripts, `test-quality/**`,
  and project-standard test evidence folders.
- Avoid unrelated refactors and unrelated production-code changes.
- Never include secrets, cookies, tokens, database URLs, raw fixture secrets, or
  private customer data in specs, reports, logs, or artifacts.
- Never report pass/fail without command output, automated test evidence, or
  explicit observation.
- Never report browser/live behavior as verified by a coding agent without
  auditable evidence.
- Prefer owner-facing clarity over exhaustive detail.

## When Not To Use

- When the user only wants a code review with no testing-quality assessment.
- When implementation does not exist and the user only wants product planning.
- When the user wants only a narrow command run and no quality mapping.
