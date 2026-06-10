---
name: quality-evidence
description: Assess and improve quality evidence for a feature or spec by defining what must be proven, mapping risk-weighted executable evidence in quality-map.yaml, adding worthwhile tests or checks, wiring Quality Center runtime review when needed, running verification, and writing clear confidence reports. Speckit-aware but not Speckit-dependent.
user_invocable: true
---

# Quality Evidence

Quality evidence workflow for features, specs, modules, PRs, tickets, PRDs,
or user-described changes. Use when the user wants to understand or raise
confidence in a system through clear quality checks, mapped quality evidence,
concrete evidence gaps, recommended actions, optional Quality Center runtime
review wiring, and an auditable pass/fail report.

This skill is Speckit-aware but not Speckit-dependent. It works best when a
Speckit spec provides the upstream truth; for brownfield projects, it can
reconstruct provisional quality checks from docs, code, tests, CI, and runtime
behavior, then mark those checks as `IMPLEMENTATION` or `INFERRED` until the
user ratifies them. Because it runs standalone, it is the recommended cold-start
entry point for an un-initialized brownfield repo, before any Spec Kit scaffolding.

In this skill, **Quality Center** means the Shiplight `quality-center`
product/repo that scans structural artifacts, ingests observations, and
evaluates saved runtime reviews.

## Core Model

Separate testing into two layers:

1. **Quality checks**: behaviors, properties, requirements, and invariants that
   must be verified to trust the feature.
2. **Testing how**: evidence used to verify the what: unit, contract,
   integration, E2E, agent tests, manual checks, telemetry, static
   checks, smoke tests, CI, or project-specific mechanisms.

Quality evidence is not test count. Optimize for justified confidence per unit
of cost, stability, latency, diagnostic value, and maintenance.

Represent the checked-in quality map as a static proof-definition graph:

```text
quality check -> task/implementation -> test intent -> proof definition ->
proof gap / recommended action
```

Each quality check should carry an impact weight before selecting proof.
Evidence definitions should capture breadth, depth, reliability, intended
contexts, and whether proof is direct, indirect, implicit, missing, or blocked.
Do not weight every test equally. Use proof gaps to describe the concrete
difference between the desired proof posture and the current proof definition.
Use recommended actions to say what proof to add next.

Run outcomes, freshness, and current confidence do not belong in
`quality-map.yaml`. Record those in `test-report.md` and downstream
observation/evaluation artifacts.

When the user wants Quality Center to consume runtime results, add an optional
second layer:

```text
quality-map.yaml          structural proof definition
        ↓
observation-sources.yaml  where runtime results come from
        ↓
evaluation-sets.yaml      which profiles are reviewed together
        ↓
Quality Center            observation-backed quality score and review state
```

Keep the layers separate:

- `quality-map.yaml` stays feature-scoped and structural.
- `.quality-center/observation-sources.yaml` is repo-scoped runtime source
  config.
- `.quality-center/evaluation-sets.yaml` is repo-scoped review bundling.
- Observation wiring is optional. Do it when the user wants
  Quality-Center-backed runtime review, release review, or observation
  ingestion, not for every structural evidence task.

## Vocabulary Bridge

Use these terms consistently in this skill:

| Term | Meaning in this skill |
| --- | --- |
| **Testing what** | The authoring inventory of behaviors, invariants, and risk areas that need confidence. This is the planning input. |
| **Quality check** | Product-language name for one machine-tracked expectation. Use this phrasing in dashboards, reports, and human explanations. |
| **Expectation** | The machine-readable structural entry stored under `expectations:` in `quality-map.yaml`. |
| **Target** | The structured feature target evaluated by Quality Center, usually a feature slug such as `002-example-feature`. Saved product views may later group multiple targets. |

Mapping:

- `testing what` is authored first.
- each durable `quality check` becomes one `expectation` entry in
  `quality-map.yaml`
- one `target` contains many `expectations`
- runtime review config does not remap proof onto expectations
- Quality Center joins runtime results onto the containing target through the
  proof-source paths already declared on evidence entries

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

- User-provided description, PRD, acceptance criteria, issue, or ticket text,
  including external trackers (Jira, Linear, GitHub Issues) the user points to
  via an available MCP, export, or paste.
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

- Project-wide when recurring proof-strategy decisions need to be explicit:
  `quality-policy.yaml`
- Per target: `quality-evidence/<target-slug>/test-spec.md`
- Per target: `quality-evidence/<target-slug>/quality-map.yaml`
- Per target: `quality-evidence/<target-slug>/test-report.md`
- Repo-wide when Quality-Center-backed runtime review is needed:
  `.quality-center/observation-sources.yaml`
- Repo-wide when Quality-Center-backed runtime review is needed:
  `.quality-center/evaluation-sets.yaml`

Use repo-root `quality-policy.yaml` as the canonical project policy location.
Use `quality-evidence/` for per-target artifacts.

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

When project-specific proof posture needs to be shared across features, create
or update repo-root `quality-policy.yaml` from
`assets/quality-policy.template.yaml` and validate against
`assets/quality-policy.schema.json`.

When runtime review setup is in scope, create or update:

- `.quality-center/observation-sources.yaml` from
  `assets/observation-sources.template.yaml`
- `.quality-center/evaluation-sets.yaml` from
  `assets/evaluation-sets.template.yaml`

Validate runtime-review config against:

- `assets/observation-sources.schema.json`
- `assets/evaluation-sets.schema.json`

These schema files mirror the current Quality Center parser contract.

These two files are repo-scoped integration artifacts. They do not replace
feature `quality-map.yaml` files.

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
- Optional per-check policy override when the default proof posture is wrong for
  this check.
- Evidence definitions for unit, contract, integration, E2E, agent, manual,
  telemetry, static, smoke, script, or project-specific checks.
- Evidence-definition metadata such as path or URL, command, depth,
  reliability, intended contexts, and structural notes.
- Optional proof-gap guidance describing what proof is still missing and which
  proof should be added next.

Use the map for agent handoff, UI visualization, structural gap prioritization,
and proof-planning. Preserve stable ids and proof definitions so downstream
observation and evaluation systems can join on them. Keep the map structural:
proof definitions, proof posture, and proof gaps belong here; time-sensitive run
outcomes and derived judgments do not.

## Smoke And Health Checks As Evidence

Many release gates are smoke or health checks that run in CI but are not test
files (exit-code assertions, probes, healthchecks). They are valid runtime
evidence even without a test file to join on. Two things let Quality Center use
them:

1. **Author the quality map for the check.** Set `path` to the workflow file that
   wires the gate (the reviewer opens it to see the check) and `test_case` to the
   unit being proven — the workflow step, or a finer check name when one step
   bundles several. Use `type: "smoke"` (or `"script"`); both exist in the schema,
   do not invent type strings. Set `depth`/`reliability` as for any automated
   proof. `test_case` matching is case-insensitive; omit it only when one
   workflow-level pass/fail is all you need. See the worked check entry in
   `assets/quality-map.template.yaml`.

2. **(Optional) Make the workflow emit a report Quality Center can parse.** If the
   gate produces no machine-readable result, add or adjust a workflow step that
   writes a small JSON observation report — see the manifest contract in
   `assets/observation-sources.template.yaml`. Each record joins to evidence by
   `(test_file, test_case)`, so the names the workflow emits must match the
   `test_case` values in the quality map. Only modify a workflow when you are
   authoring it or the user has authorized the change; otherwise propose the step
   and leave it to the workflow owner. Without this, the check stays a documented
   proof with no runtime backing — a legitimate gap, not an error.

The observation source profile says **where** results come from (the workflow and
its artifact), not the details of the report. For a manifest adapter,
`artifact_path` is **optional**, but choose deliberately:

- **Omit it only when the artifact is dedicated to observations** — a JSON-only
  observation bundle (the recommended pattern: a `qc-*` artifact, or a local
  folder that holds nothing else). Quality Center then reads every JSON file in
  the source as a manifest.
- **Set it when the source also holds other JSON** (Playwright reports, release
  records, etc.). The manifest reader globs every `.json` and tries to parse each
  one; non-manifest JSON is rejected safely — it never becomes a false
  observation — but it produces diagnostics and a `partial` execution status,
  which is misleading noise. Pointing `artifact_path` at the one report avoids it.

If the workflow produces no observation artifact yet, write **no source
profile** — record the gap and add the profile later, together with the
workflow-emit step. Do not record run outcomes in the quality map itself — those
live in the observation source.

## Quality Policy

Use `quality-policy.yaml` for project-wide proof-strategy guidance that should
apply across many expectations. It is a structural authoring artifact, not a
scorecard.

Keep the policy lean and actionable. It should answer:

- which modalities the project prefers or avoids by default
- which expectations need direct proof, multi-layer proof, or a gate
- which contexts matter enough to pursue for recurring kinds of checks
- what non-negotiable proof floors apply to high-risk work

The policy contract has five parts:

- `contexts`: stable labels such as `local`, `pr-ci`, or `staging-gate`
- `defaults`: the base proof posture when no narrower rule applies
- `rules`: targeted overrides keyed by risk, category, priority, source type, or
  target id
- `modality_guidance`: human explanation of when a modality is strong or weak
- `guardrails` / `floors`: persistent project guidance for scarce-test-budget
  decisions

Per-expectation `policy_override` in `quality-map.yaml` narrows or overrides the
project policy for a single expectation. Use it for local exceptions, not as a
replacement for a recurring project rule.

## Product-Language Check Writing

Dashboards may render `title`, `description`, `risk.rationale`,
`proof_gap.summary`, and `proof_gap.next_step` directly, so write those fields
as product-language summaries first. Use the existing schema; do not add
free-form keys that fail validation.

- `title`: name the product behavior or quality promise the check proves. Do not
  name only a command, artifact, or test file.
- `description`: explain what the check proves and which feature behavior or
  release confidence it affects.
- `risk.rationale`: state the quality, user, operational, data, security,
  billing, or release consequence if the check is not proven.
- `proof_gap.summary`: describe only the structural proof gap or current
  limitation. Put run history in reports or observation artifacts unless
  essential.
- `proof_gap.next_step`: write the highest-value proof to add next. If there is
  no open gap, omit `proof_gap` rather than writing maintenance chatter.

Put paths, commands, test names, dashboard links, and proof notes in
`source_refs`, `evidence.path`, `evidence.url`, `evidence.command`, and
`evidence.notes`. Keep `SOURCE` product promises, `IMPLEMENTATION`-observed
checks, and `INFERRED` checks visibly distinct in title and description.

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
- `proof_gap.next_step` for a documentation-baseline check should usually point
  to the real runtime proof still needed, not become the primary readiness
  conclusion for the feature.

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

The script scans `quality-evidence/**/quality-map.yaml`. It uses quality-map
target ids and names for affected feature/spec identity; do not infer feature
ownership from test file names. It reads structural proof gaps, evidence depth,
commands, paths, and notes from the current map contract; it does not depend on
embedded run-state fields. Each prompt separates source-of-truth inputs from
verification checks so the fixing agent knows what to read versus what to run.
The bundled helper is TypeScript plus a bash launcher only; do not introduce
Python or another language for this workflow.

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
2. Repo-root `quality-policy.yaml`, if present.
3. The baked-in default in `assets/default-quality-policy.md`.

Standalone-safe: if no `quality-policy.yaml` exists, use the baked-in default.
Never require the file, and never block on its absence. The resolved posture
governs how hard to push for evidence (strategy), not how the result is scored.

If the same proof-strategy decision keeps recurring across multiple expectations,
promote it out of per-expectation overrides and into repo-root
`quality-policy.yaml`.

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
  allocation and the **residual proof gap knowingly accepted** in
  `proof_gap.summary` / `proof_gap.next_step`; never under-test silently.

### 6. Run Verification

Run targeted checks first, then broader suites when justified:

- New or changed tests.
- Relevant existing unit, contract, integration, or E2E tests.
- Typecheck, lint, build, migration, smoke, or CI-equivalent commands.
- Migration generation/application checks when schema or data migrations are in
  scope.
- Agent checks when required by the test spec, including browser, API, DB, or
  mixed full-stack verification.

Record exact commands, outcomes, and important failure details. If later
evidence depends on any prerequisite or artifact-producing command, treat that
command as part of verification rather than as background context only. Put the
full reproducible command chain in the test spec's `Automated checks` and in
the report's `Commands Run`. If a capability is missing, mark it `BLOCKED` or
`NOT MEASURED`; do not claim it passed.

### 7. Write Or Update Quality Map

Write `quality-evidence/<target>/quality-map.yaml` as the structured evidence
graph. Use the bundled template for new maps:

- `assets/quality-map.template.yaml`

Use the bundled schema as the validation contract for tools and UIs:

- `assets/quality-map.schema.json`

On repeat runs:

- Preserve stable expectation and evidence ids when the meaning is unchanged.
- Rewrite confusing titles, descriptions, proof-gap text, and policy-override
  notes when the meaning is unchanged but the dashboard would be hard to
  understand.
- Collapse bloated documentation-baseline evidence lists when they are only
  proving source alignment rather than feature behavior.
- Keep evidence entries structural: modality, path or URL, command, depth,
  reliability, intended contexts, and structural notes.
- Encode planned-but-missing proof explicitly in the map. Use `depth: MISSING`
  or `depth: BLOCKED` only when they describe the current proof definition, not
  a runtime result.
- Keep current pass/fail state, timestamps, freshness, and confidence rollups
  out of `quality-map.yaml`; record them in `test-report.md` and downstream
  observation/evaluation artifacts instead.

### 8. Write Or Update Test Report

Write `quality-evidence/<target>/test-report.md` as the current evidence snapshot.
Include:

- Target, scope, source material, branch/commit when available, and timestamp.
- Overall status and confidence.
- Commands run and pass/fail/block results.
- Any prerequisite or artifact-producing commands actually relied on by later
  checks.
- Coverage matrix derived from `quality-map.yaml` plus the observed run results
  captured in the report, including risk weight, evidence depth, observed
  outcome, and residual risk.
- Tests added or updated.
- Blocking findings first.
- Deferred items and residual risk with retest paths.
- Cleanup performed and resources intentionally left behind.

On repeat runs, refresh current results, preserve useful historical manual logs
and evidence links, update timestamps, and close deferred items only when new
evidence actually covers them.

### 9. Optional: Wire Runtime Review Into Quality Center

Only do this step when the user wants Quality-Center-backed runtime review,
observation ingestion, or release review. Skip it for structural-only
quality-map work.

Author repo-level runtime review config in two layers:

1. `.quality-center/observation-sources.yaml`
2. `.quality-center/evaluation-sets.yaml`

Use this process:

- Inspect the repo's existing result producers first:
  - GitHub Actions workflows
  - local result folders
  - standard artifacts such as JUnit XML or Playwright JSON
- Prefer standard structured artifacts over custom exporters.
- Create one **atomic observation source profile** per source integration.
- Keep profiles acquisition-only: select the workflow or folder and the
  structured result artifacts inside it.
- Use `quality-map.yaml` as the proof-definition source of truth. Runtime join
  should happen through evidence proof-source paths, not through a second
  remapping table.
- Use the repo-relative test file path as the canonical proof-source identity.
  When an artifact omits the file path, rely on a stable class/basename
  canonicalization only as a fallback, not as the primary authoring contract.
- Create one or more saved evaluation sets that bundle the relevant profiles
  into a runnable review unit.
- Verify the config by scanning the repo in Quality Center and running at least
  one saved evaluation set.

Do not blur the responsibilities:

- `quality-map.yaml` answers: what counts as proof for the feature.
- `observation-sources.yaml` answers: where runtime results come from.
- `evaluation-sets.yaml` answers: which profiles are reviewed together.

Keep runtime review config proportional. Do not create these files just because
the repo has tests. Create them when the user wants shared runtime review.

## Observation Review Setup Guide

Use this compact authoring guide when runtime review setup is requested:

### A. Author `observation-sources.yaml`

- One profile per source integration.
- Good profile boundaries:
  - one GitHub workflow
  - one local artifact folder
- Required fields:
  - `id`
  - `name`
  - `source_kind`
  - source-specific config
  - one or more adapters
- Prefer these adapter inputs:
  - JUnit XML
  - Playwright JSON
- Keep adapters acquisition-only:
  - `artifact_path`
  - parser kind (`junit` or `playwright-json`)
- Do not add `subject_id`, `evidence_id`, or workflow-step mappings here.
- The join target already lives in `quality-map.yaml`:
  - `evidence.path` should point at the canonical repo-relative test file path
  - multiple evidence rows may intentionally share the same file path in v1

### B. Author `evaluation-sets.yaml`

- One evaluation set per shared review unit.
- A set references one or more profile ids in precedence order.
- If a user wants to debug one profile in isolation, use a single-profile
  evaluation set instead of inventing a separate product concept.
- Scope filtering happens later at the project or saved-view level, not in the
  evaluation set.

### C. Verify

- Scan the repo in Quality Center and confirm both files are discovered.
- Run one saved evaluation set.
- Confirm Quality Center resolves observations onto the intended evidence paths.
- If observations are missing, fix the emitted test file path or the structural
  `evidence.path` declaration rather than adding a second mapping table.

## Specialized Test Authoring

This skill assesses and records evidence; it delegates test creation to producer
skills and project workflows rather than inventing tests directly. Use the
established workflow for the test kind, then map the resulting specs, test files,
command output, and run artifacts back into this skill's structural
`quality-map.yaml` evidence definitions and its dynamic `test-report.md`.

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

- Keep the stable proof reference in `quality-evidence/<target>/quality-map.yaml`
  via `evidence.path`, `evidence.url`, `evidence.command`, `evidence.contexts`,
  and `evidence.notes`.
- Put the final `PASS`/`FAIL`/`BLOCKED`/`ABORTED` status and evidence artifacts
  (HTML reports, screenshot sets, videos, traces, logs) in
  `quality-evidence/<target>/test-report.md` and downstream observation
  artifacts.
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
**Quality policy**: [../../quality-policy.yaml](../../quality-policy.yaml)
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
target:
  id: 001-example-feature # numbered feature slug
  name: <target name>
  scope: feature
  aliases: []
  source_refs: []
expectations:
  - id: <stable-expectation-id>
    title: <behavior or invariant>
    source_type: SOURCE
    category: other
    priority: P1
    risk:
      weight: 3
      rationale: <why failure matters>
    policy_override:
      preferred_modalities: []
      discouraged_modalities: []
      required_modalities: []
      required_contexts: []
      minimum_depth: DIRECT
      require_direct_evidence: false
      require_multi_layer: false
      require_gate: false
      notes: <optional override>
    evidence: []
    proof_gap:
      summary: <what proof is still missing or weak>
      next_step: <highest-value follow-up proof>
```

For the full starter, copy `assets/quality-map.template.yaml`. For validation,
use `assets/quality-map.schema.json`.

`quality-policy.yaml`:

```yaml
name: <project proof policy>
summary: <how this project wants proof budget spent>
defaults:
  preferred_modalities: [unit, contract, integration]
  minimum_depth: INDIRECT
  require_direct_evidence: false
rules:
  - id: release-critical-floor
    when:
      min_risk_weight: 5
    minimum_depth: DIRECT
    require_direct_evidence: true
    require_gate: true
    require_multi_layer: true
```

For the full starter, copy `assets/quality-policy.template.yaml`. For
validation, use `assets/quality-policy.schema.json`.

`.quality-center/observation-sources.yaml`:

```yaml
profiles:
  - id: example-workflow
    name: Example workflow
    source_kind: github-actions # github-actions | local-folder
    source_refs: []
    auth:
      required_env: [GITHUB_TOKEN]
    github:
      repo: org/repo
      workflow: publish.yml
      artifact_names: [qc-observations-*]
    adapters:
      - id: browser-junit
        type: junit # junit | playwright-json
        artifact_path: artifacts/browser.junit.xml
      - id: browser-json
        type: playwright-json
        artifact_path: artifacts/browser.playwright.json
```

For the full starter, copy `assets/observation-sources.template.yaml`.
For validation, use `assets/observation-sources.schema.json`.

`.quality-center/evaluation-sets.yaml`:

```yaml
evaluation_sets:
  - id: example-review
    name: Example review
    profiles:
      - profile_id: example-workflow
```

For the full starter, copy `assets/evaluation-sets.template.yaml`.
For validation, use `assets/evaluation-sets.schema.json`.

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
  `quality-evidence/**`, repo-root `quality-policy.yaml`,
  `.quality-center/observation-sources.yaml`,
  `.quality-center/evaluation-sets.yaml`, and project-standard test evidence
  folders.
- Avoid unrelated refactors and unrelated production-code changes.
- Keep `quality-map.yaml` stable enough for tools: preserve ids, use the schema
  enums, and avoid free-form dialects when a field already exists.
- Keep `quality-map.yaml` structural only. Do not write current pass/fail state,
  timestamps, freshness, or confidence rollups into it.
- Keep `.quality-center/observation-sources.yaml` and
  `.quality-center/evaluation-sets.yaml` repo-scoped. Do not duplicate their
  source-acquisition or saved-review bundling into feature `quality-map.yaml`.
  Keep the proof-definition join in feature evidence via canonical
  repo-relative test file paths.
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
