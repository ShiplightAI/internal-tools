---
name: speckit-test
description: After implementing a Spec Kit feature, define or refresh the testing contract, map and improve the evidence strategy, add worthwhile missing tests, run checks, and write specs/<feature>/test-report.md.
user_invocable: true
---

# Speckit Test

Feature-level testing lifecycle for Spec Kit projects. Use after implementation
work is substantially complete and the feature can be inspected through code,
tests, and, when relevant, a running app.

This skill may update tests and test documentation when doing so materially
improves confidence. Do not maximize test count; maximize justified confidence
per unit of cost, stability, latency, and maintenance.

## Core Model

Separate testing into two layers:

1. **Testing what**: behaviors, properties, risks, and evidence targets that
   must be verified to trust the feature.
2. **Testing how**: proof methods used to verify the what: unit, contract,
   integration, E2E, agent browser tests, manual checks, telemetry, live-env
   smoke, static checks, or other project-specific mechanisms.

Testing what is broader than product requirements. Sources include:

- Product requirements, user stories, acceptance scenarios, FRs, and SCs.
- Existing implementation behavior that is intentionally relied on.
- System design, architecture decisions, APIs, schemas, and data model
  invariants.
- Security, privacy, billing, permission, audit, and compliance boundaries.
- Operational behavior: migrations, jobs, cleanup, idempotency, observability,
  rollback, and release process.
- UX, accessibility, browser behavior, historical regressions, third-party
  assumptions, performance, and reliability expectations.

A single testing what may have multiple valid hows. Choose the cheapest
sufficient evidence mix for the risk.

## Expected Artifacts

- `specs/<feature>/test-spec.md`: durable testing contract. It defines what
  should be tested and acceptable evidence strategies.
- `specs/<feature>/test-report.md`: current run/report artifact. It records
  what was tested, what passed or failed, evidence links, coverage status, and
  residual risk.

## Evidence Categories

Keep these categories distinct in both `test-spec.md` and `test-report.md`:

| Category | Use for | Evidence |
| --- | --- | --- |
| Automated tests | Unit, contract, integration, E2E, scripts, static checks | Command output and file paths |
| Agent tests | Coding-agent-driven browser/live-env verification | Written report plus watchable artifact when a browser is driven |
| Manual checks | Human-observed checks | Human notes, optional report/artifact links |
| Live telemetry | Production/staging SLOs and operational signals | Dashboard/query/link and timestamp |
| Deferred / implicit | Not worth automating now, source-level invariant, missing environment, or future release sweep item | Reason and retest path |

When a coding agent drives a browser, produce auditable evidence: recording,
trace, HTML report, or the closest project-standard equivalent. Text-only claims
are not enough for browser verification.

## Workflow

### 1. Resolve Feature Context

- Identify the active feature directory and confirm `spec.md`, `plan.md`, and
  `tasks.md` exist.
- Read existing `test-spec.md` and `test-report.md` if present.
- Read changed implementation and tests since the feature branch merge base.

### 2. Construct Or Update Testing What

Create or update `specs/<feature>/test-spec.md` using the project template at
`specs/test-spec-template.md`.

Do not limit the what to the product spec. Include intentional implementation
details when they are important to preserve, such as transactional boundaries,
schema invariants, route ownership, cleanup ownership, or audit provenance.

### 3. Inventory Existing How

Find existing proof artifacts and map them to the testing what:

- `tests/unit`, source-adjacent `*.test.ts`, or equivalent: unit tests.
- `tests/contract`: route/action/API/schema boundary tests.
- `tests/integration`: database, transaction, job, migration, and cross-module
  tests.
- `tests/e2e`: browser or YAML/Playwright tests.
- `tests/agent`: coding-agent-driven browser/live-env cases.
- Scripts, static checks, typecheck, lint, migration checks, telemetry queries,
  and manual evidence.

Update `test-spec.md` with automated check commands and evidence options for
each test case.

### 4. Analyze Gaps And Select Proofs

For each missing or weak what, decide the best proof method. Consider:

- Confidence gained.
- Risk severity and stakeholder visibility.
- Stability and flake risk.
- Runtime latency and infrastructure cost.
- Fixture complexity and cleanup burden.
- Diagnostic value when it fails.
- Maintenance cost under likely implementation changes.

Useful defaults:

- Deterministic pure logic: unit tests.
- Public boundaries, server actions, route handlers, schema validation, authz:
  contract tests.
- DB state, transactions, audit rows, migrations, jobs, and cross-module
  invariants: integration tests.
- User-visible browser behavior, routing, session behavior, role-gated UI, and
  regressions that only the rendered app can prove: use the project's
  established browser/UI testing guidance.
- Third-party callbacks, staging-only auth, production SLOs, and live
  operational signals: agent tests, manual checks, or telemetry.

These are not exclusive. A UI feature may be tested manually, by an agent using
browser tooling, or by automated E2E. Choose the cheapest sufficient mix.

### 5. Implement Worthwhile Missing Tests

Add tests when they materially improve confidence relative to cost. Keep edits
scoped to test and minimal support code unless a testability gap requires a
small production-code seam.

Do not add brittle tests just to turn every row green. Mark low-value gaps as
implicit or deferred with a reason.

### 6. Run Checks

Run targeted checks first, then broader suites when justified:

- New or changed unit/contract/integration tests.
- Relevant E2E tests.
- Typecheck, lint, migration generation/application, or scripts named in the
  feature plan.
- Agent/browser checks when required by `test-spec.md`.

Record exact commands and outcomes. If an environment capability is missing,
classify it as blocked/deferred rather than pretending the behavior passed.

### 7. Write Or Update Test Report

Write `specs/<feature>/test-report.md` using the project template at
`specs/test-report-template.md`.

Use statuses consistently: `COVERED`, `PARTIAL`, `IMPLICIT`,
`NOT COVERED`, `NOT MEASURED`, `MANUAL`, `BLOCKED`, or `DEFERRED`.

On repeat runs:

- Refresh the matrix and command outcomes.
- Preserve historical manual logs and meaningful prior evidence links.
- Update `Last updated`.
- Remove deferred items only when new evidence closes them.

## Operating Rules

- This skill may edit tests, `test-spec.md`, `test-report.md`, and
  `tests/agent/**`.
- Avoid unrelated refactors and unrelated production-code changes.
- Never report a browser flow as verified without auditable evidence when the
  coding agent drove the browser.
- Never include secrets, cookies, tokens, database URLs, raw fixture secrets, or
  private customer data in specs, reports, logs, or artifacts.
- If the project has hooks in `.specify/extensions.yml`, check for
  `hooks.before_test` and `hooks.after_test`. If absent, skip silently.

## When Not To Use

- Before implementation exists: use planning or analysis skills instead.
- For only creating E2E tests from scratch: use the project's E2E test creation
  workflow, then return here for mapping and reporting.
- For a release-wide sweep across many features: use this per feature, then
  aggregate the resulting `test-report.md` files with a release process.
