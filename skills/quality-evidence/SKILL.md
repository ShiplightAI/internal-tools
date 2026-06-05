---
name: quality-evidence
description: Assess and improve quality evidence for a feature or spec by defining what must be proven, mapping risk-weighted executable evidence in quality-map.yaml, adding worthwhile tests or checks, running verification, and writing clear confidence reports. Speckit-aware but not Speckit-dependent.
user_invocable: true
---

# Quality Evidence

Quality evidence workflow for features, specs, modules, PRs, tickets, PRDs,
or user-described changes. Use when the user wants to understand or raise
confidence in a system through clear quality checks, mapped quality evidence,
concrete evidence gaps, recommended actions, and an auditable pass/fail report.

This skill is Speckit-aware but not Speckit-dependent. It works best when a
Speckit spec provides the upstream truth; for brownfield projects, it can
reconstruct provisional quality checks from docs, code, tests, CI, and runtime
behavior, then mark those checks as `IMPLEMENTATION` or `INFERRED` until the
user ratifies them.

## Core Model

Separate testing into two layers:

1. **Quality checks**: behaviors, properties, requirements, and invariants that
   must be verified to trust the feature.
2. **Testing how**: evidence used to verify the what: unit, contract,
   integration, E2E, agent tests, manual checks, telemetry, static
   checks, smoke tests, CI, or project-specific mechanisms.

Quality evidence is not test count. Optimize for justified confidence per unit
of cost, stability, latency, diagnostic value, and maintenance.

Represent quality as an evidence graph:

```text
quality check -> task/implementation -> test intent -> executable evidence ->
latest result -> weighted evaluation -> evidence gap / recommended action
```

Each quality check should carry an impact weight before evaluating tests.
Evidence should then be judged by breadth, depth, latest result, reliability,
freshness, and whether it is CI/release gated. Do not weight every test equally.
Use evidence gaps to describe the concrete difference between the check and the
current evidence. Use recommended actions to say what would close the gap.

## Scope Resolution

Resolve the target before writing artifacts or adding tests. A target is always
a single feature or spec, identified as a named feature, PRD item, ticket,
route, module, workflow, branch diff, or implementation area. Quality checks and
evidence always belong to a feature; features and specs are cleanly separated.

This skill does not produce a project-scope quality map. Project-level quality
is an aggregate of the individual feature maps.

Use explicit user input first. If the user does not provide a source, silently
infer the target from current git changes, repo structure, docs, tests, package
scripts, and CI config. Mark inferred quality checks as `INFERRED` in
artifacts.

## Target Slug Naming

Use stable target slugs so specs, tasks, quality maps, reports, tests, and UI
routes can be joined reliably.

- Every target uses a Speckit-style `NNN-kebab-case-name` slug, for example
  `026-enterprise-rate-card`. There is no special `project` slug.
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

Do not invent requirements. Distinguish `SOURCE` quality checks from
`IMPLEMENTATION` quality checks and `INFERRED` quality checks.

## Artifact Location

Create or update these artifacts:

- Per target: `quality-evidence/<target-slug>/test-spec.md`
- Per target: `quality-evidence/<target-slug>/quality-map.yaml`
- Per target: `quality-evidence/<target-slug>/test-report.md`

For new projects, use `quality-evidence/`. For existing repos that already use
the legacy `test-quality/` root, continue updating that root unless the user
explicitly asks to migrate. Do not create parallel `quality-evidence/` and
`test-quality/` evidence trees for the same target.

If the repo has another obvious existing convention for quality evidence
artifacts, use that convention only when it clearly fits, but keep the canonical
target slug format above. Do not require `specs/`, `plan.md`, `tasks.md`,
`.specify/`, or Spec Kit templates.

`quality-map.yaml` is the canonical machine-readable artifact, and its check
titles, descriptions, gap text, and recommended actions must also be readable in
product dashboards without opening the source files. Markdown files provide
longer narrative summaries. When creating a new map, copy and fill
`assets/quality-map.template.yaml`. When tooling or validation is available,
validate against `assets/quality-map.schema.json`.

## Quality Map

Maintain `quality-map.yaml` around quality checks, not test files. The current
map schema stores quality checks under the `expectations` key. Each check should
include:

- Stable check id and title.
- Source type: `SOURCE`, `IMPLEMENTATION`, or `INFERRED`.
- Source references to specs, PRDs, issues, code, docs, or user input.
- Category and priority.
- Impact/risk weight from 1 to 5 with rationale.
- Related implementation tasks when available.
- Evidence entries for unit, contract, integration, E2E, agent, manual,
  telemetry, static, smoke, script, or project-specific checks.
- Latest result status, command or artifact path, commit/timestamp when known,
  and whether the evidence is CI/release gated.
- Evaluation fields: coverage status, confidence, breadth, depth, freshness,
  weighted confidence, residual risk, and next best proof. Treat residual risk
  as the gap impact, and next best proof as the recommended action.

Use the map for agent handoff, UI visualization, release gates, trend analysis,
and gap prioritization. Preserve the input fields behind any confidence
judgment so scoring formulas can evolve without losing the audit trail.

## Product-Language Check Writing

Dashboards may render `title`, `description`, `risk.rationale`,
`evaluation.residual_risk`, and `evaluation.next_best_proof` directly, so write
those fields as product-language summaries first. Use the existing schema; do
not add free-form keys that fail validation.

- `title`: name the product behavior or quality promise the check proves. Do not
  name only a command, artifact, or test file.
- `description`: explain what the check proves and which feature behavior or
  release confidence it affects.
- `risk.rationale`: state the quality, user, operational, data, security,
  billing, or release consequence if the check is not proven.
- `evaluation.residual_risk`: describe only the open gap or current limitation.
  Put history in evidence artifacts or the Markdown report unless essential.
- `evaluation.next_best_proof`: write the recommended action that closes the
  gap. If there is no open gap, write the maintenance proof.

Put paths, commands, test names, commits, and artifacts in `source_refs`,
`evidence.path`, `evidence.command`, and `latest_result.artifacts`. Keep
`SOURCE` product promises, `IMPLEMENTATION`-observed checks, and `INFERRED`
checks visibly distinct in title and description.

Documentation-baseline checks should stay compact and secondary. If a target
includes a check that says the current docs/specs/contracts are aligned, keep it
to a lightweight baseline:

- Use one concise documentation-baseline check at most.
- Prefer `source_refs` to enumerate related docs instead of many separate static
  evidence rows.
- If static evidence is still useful, keep it to one compact evidence bundle or
  a short list, not one row per source file unless a tool requires that shape.
- Do not let the documentation-baseline check carry the main coverage story for
  the feature. Runtime behavior, data rules, browser flows, provider behavior,
  and release gating should be described by separate feature-behavior checks.
- `evaluation.next_best_proof` for a documentation-baseline check should usually
  be a maintenance action or a pointer to the real runtime proof still needed,
  not the primary readiness conclusion for the feature.

## Generate Fix Prompts

Invocation shortcut: `fix-prompts`.

When the user says `quality-evidence fix-prompts`, interpret it as this workflow.
Accept script-style options after the shortcut, for example:

```text
quality-evidence fix-prompts --target 026-enterprise-rate-card --limit 10
```

When the user wants coding agents to fix many evidence gaps, do not require
manual copy/paste from a dashboard. Generate prompts directly from the repo's
quality maps with the bundled script:

```bash
<skill-dir>/scripts/generate-fix-prompts <repo-root> \
  --output quality-evidence/fix-prompts.md
```

Useful options:

- `--format json` for automation.
- `--target <target-id>` for one feature target.
- `--limit <n>` for the highest-priority prompts only.
- `--include-covered` when auditing every quality check, not just open gaps.

Relative `--output` paths are resolved under `<repo-root>`.

The script scans `quality-evidence/**/quality-map.yaml` and
`test-quality/**/quality-map.yaml`. It uses quality-map target ids and names for
affected feature/spec identity; do not infer feature ownership from test file
names. Each prompt separates source-of-truth inputs from verification checks so
the fixing agent knows what to read versus what to run. The bundled helper is
TypeScript plus a bash launcher only; do not introduce Python or another language
for this workflow.

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

## Testing Strategy And Budget Policy

Testing is always a balance against budget. Pick the most effective strategy the
budget allows: buy sufficient confidence per check at the lowest cost, and spend
the scarce expensive-test budget (e2e, agent) where risk is highest and cheaper
proofs structurally cannot reach. See `assets/default-quality-policy.md` for the
modality economics, the decision principle, the three guardrails
(capability-before-cost, risk-floor / budget-ceiling, defense-in-depth), and the
non-negotiable floors.

Resolve the strategy posture for each check, first match wins:

1. A per-expectation override in `quality-map.yaml` (one-off tuning).
2. A project `quality-policy.yaml` at the repo root or evidence root, if present.
3. The baked-in default in `assets/default-quality-policy.md`.

Standalone-safe: if no `quality-policy.yaml` exists, use the baked-in default.
Never require the file, and never block on its absence. The resolved posture
governs how hard to push for evidence (strategy), not how the result is scored.

## Workflow

### 1. Resolve Target And Inputs

- Identify the feature target.
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

For each testing-what item, draft a product-language check title and description
before mapping evidence. If the item is an implementation baseline rather than a
product or feature promise, mark its source type accordingly.

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

For each check, resolve its strategy posture (see Testing Strategy And Budget
Policy), then size the gap as *required proof minus actual evidence*. Choose the
cheapest proof **capable** of closing it — capability before cost: a unit test is
not in the feasible set for a real-browser or third-party flow. Consider
confidence gained, risk severity, release or customer impact, flake risk,
runtime, fixture complexity, cleanup burden, diagnostic value, and maintenance.

Allocate the scarce expensive-test budget by risk. A release-critical billing,
security, data isolation, or destructive-admin expectation with weak direct
evidence should outrank many low-risk UI or display gaps, and may warrant
defense-in-depth (stacked layers) rather than a single cheapest proof.

Capability map — which modalities can prove which kind of check:

- Deterministic pure logic: unit tests.
- Public boundaries, server actions, route handlers, authz, and schema
  validation: contract tests.
- DB state, transactions, audit rows, migrations, jobs, and cross-module
  invariants: integration tests.
- Browser-rendered product behavior, routing, session behavior, role-gated UI,
  and rendered regressions: project-standard E2E, agent, or manual browser
  checks.
- Third-party callbacks, staging-only auth, production SLOs, and live signals:
  agent tests, manual checks, or telemetry.

### 5. Improve Worthwhile Evidence

Drive each under-covered check up to its resolved posture, honoring the
non-negotiable floors (unit coverage on core/changed logic; at least one gate on
every release-critical check) regardless of budget. Add or update tests when they
materially raise confidence; do not add brittle tests merely to increase count.
Classify low-value or unavailable checks as implicit, deferred, blocked, or not
measured with a reason.

Push, do not just record:

- **Code-tied tests** (unit, contract, integration, api): author them inline, or
  emit `fix-prompts` to push the base coding agent toward deep, high-coverage
  tests on the highest-risk gaps. Keep edits scoped to tests, fixtures, test
  scripts, and minimal support code needed for testability.
- **Behavioral tests** (e2e, agent): delegate authoring to the producer skills
  (`create-tests`, `create-agent-tests`) per Specialized Test Authoring, then
  record the resulting evidence.
- When budget forces a check to stop short of its ideal proof, record the chosen
  allocation and the **residual risk knowingly accepted** in `residual_risk` /
  `next_best_proof`; never under-test silently.

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
- Rewrite confusing titles, descriptions, residual-risk text, and next-best
  proof text when the meaning is unchanged but the dashboard would be hard to
  understand.
- Collapse bloated documentation-baseline evidence lists when they are only
  proving source alignment rather than feature behavior.
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

This skill assesses and records evidence; it delegates test creation to producer
skills and project workflows rather than inventing tests directly. Use the
established workflow for the test kind, then map the resulting specs, test files,
command output, and run artifacts back into this skill's `quality-map.yaml`,
coverage matrix, and test report.

- `create-tests`: deterministic Shiplight YAML E2E tests (Playwright + agentic
  SDK).
- `create-agent-tests`: coding-agent-driven Markdown cases for live-environment
  verification (browser, API, DB, logs, cloud, telemetry).
- The project's own browser, mobile, load, migration, contract, or unit test
  workflow for other kinds.

## Recording Agent Test Evidence

Agent tests are coding-agent-driven Markdown cases that verify live-environment
behavior across UI, API, database, logs, files, network, and telemetry when a
deterministic test would be premature, brittle, too expensive, or too narrow.
This skill does not author them. To create, scaffold, or run agent tests, use
the `create-agent-tests` skill (or the project's local `tests/agent/` convention
when one exists).

When an agent test produces a report, record it here:

- Map the report path, the final `PASS`/`FAIL`/`BLOCKED`/`ABORTED` status, and
  evidence artifacts (HTML reports, screenshot sets, videos, traces, logs) into
  `quality-evidence/<target>/quality-map.yaml` and
  `quality-evidence/<target>/test-report.md`.
- Treat `ABORTED` as an orchestration interruption to rerun, not as product
  evidence.
- Text-only browser claims are not sufficient evidence; require an auditable
  artifact for browser-driven cases.

## Artifact Skeletons

Use these sections unless the repo has a better local convention.

`test-spec.md`:

```markdown
# Test Spec: <Target>

**Scope**: <feature|module|PR|ticket>
**Source material**: <paths, prompt, issue, PRD, inferred>
**Test report**: [test-report.md](./test-report.md)

## Testing What
## Evidence Strategy
## Test Cases
## Fixtures And Environments
## Report Expectations
## Coverage Notes
```

For the full starter, copy `assets/test-spec-template.md`.

`quality-map.yaml`:

```yaml
schema_version: 1
target:
  id: 001-example-feature # numbered feature slug
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

For the full starter, copy `assets/test-report-template.md`.

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
- Prefer product-language summaries with technical details preserved in evidence
  fields.
- Resolve testing strategy from the policy chain (per-expectation override →
  `quality-policy.yaml` → baked-in `assets/default-quality-policy.md`). Treat the
  resolved posture as a push target for evidence, never as a quality score.
- Stay standalone-safe: never require `quality-policy.yaml`; fall back to the
  baked-in default when it is absent.

## When Not To Use

- When the user only wants a code review with no evidence-quality assessment.
- When implementation does not exist and the user only wants product planning.
- When the user wants only a narrow command run and no quality mapping.
