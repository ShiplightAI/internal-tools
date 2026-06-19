---
name: quality-center
description: Improve overall project quality across many features using existing quality maps and Quality Center artifacts. Wire and repair runtime review config (observation sources, evaluation sets), author saved reader views, run @shiplightai/quality-tools analysis, and drive recommendation-based fixes across tests, workflows, config, and feature quality maps. Repo-scoped sibling of the feature-scoped quality-evidence skill.
user_invocable: true
---

# Quality Center

Project-level quality improvement workflow. Use when the user wants to raise or
review quality across the whole project or a saved slice of it: wiring runtime
review, bundling observation sources into evaluation sets, creating saved reader
views, running recommendation analysis, and working down the generated
recommendations across multiple feature quality maps.

This skill never works on a single new feature target. Single-feature evidence
work — authoring `quality-evidence/<target>/test-spec.md`, `quality-map.yaml`,
and `test-report.md` for one feature — belongs to the `quality-evidence` skill.
This skill consumes those feature maps as existing inputs and improves the
evidence system around and across them.

In this skill, `.quality-center` is the checked-in quality artifact namespace
that Shiplight tooling reads: observation sources, evaluation sets, saved reader
views, and generated recommendations. Agents should use
`@shiplightai/quality-tools` for runtime analysis and generated recommendations.

## Core Model

Feature quality maps are the structural proof definitions. Runtime review joins
runtime results onto them through a repo-scoped config layer:

```text
quality-evidence/<target>/quality-map.yaml   structural proof definition (per feature)
        ↓
.quality-center/observation-sources.yaml     where runtime results come from
        ↓
.quality-center/evaluation-sets.yaml         which profiles are reviewed together
        ↓
quality-tools analyze                        observation-backed recommendations
                                             and review state
```

Keep the layers separate:

- `quality-map.yaml` stays feature-scoped and structural. It is owned by the
  `quality-evidence` skill and its bundled contract
  (`quality-map.template.yaml` / `quality-map.schema.json` in that skill's
  assets).
- `.quality-center/observation-sources.yaml` is repo-scoped runtime source
  config.
- `.quality-center/evaluation-sets.yaml` is repo-scoped review bundling.
- `.quality-center/views.yaml` is repo-scoped saved reader slices over
  project-map feature ids.

Observation-backed evaluation is a join, not a second proof definition. Quality
tools load observations from the configured sources, normalize them, and join
them to quality-map evidence by canonical proof-source path plus optional
`test_case`, under the Runtime Join Contract defined in the `quality-evidence`
skill. Joined observations make the affected expectation observed as
pass/fail/error/skipped; no matching observation leaves it `unobserved`. The
observation-backed quality score is one of four scores Quality Center reports
(see Quality Scores); do not edit maps, scopes, views, or `structure_provenance`
to optimize any of them.

Responsibility boundaries, in one line each:

- `quality-map.yaml` answers: what counts as proof for the feature.
- `observation-sources.yaml` answers: where runtime results come from.
- `evaluation-sets.yaml` answers: which profiles are reviewed together.
- `views.yaml` answers: which project-map features should be read together as
  saved reader slices.

## Quality Scores

Quality Center reports **one observation-backed quality score plus three
structural scores**. They answer different questions and are shown side by side,
**never blended** into one number.

| Score | Kind | Answers | Raised by |
| --- | --- | --- | --- |
| Quality score | observation-backed (runtime) | Are the mapped proofs passing right now? | green runtime observations (run an evaluation set) |
| Coverage | structural | Is proof *designed* for the checks? (breadth) | mapping evidence for more checks |
| Evidence confidence | structural | Is that proof *trustworthy and strong*? (depth) | stronger, more direct, more reliable proof |
| Structure confidence | structural | Are these the *right checks*, and where did they come from? | human ratification of the check list |

What this skill must hold:

- **The quality score requires runtime.** It stays unavailable until an
  evaluation set runs and observations join to the maps. Coverage, evidence
  confidence, and structure confidence are derived from the static maps alone.
- **Read structure confidence beside the others, never as part of them.** A map
  reconstructed from code can show high coverage, evidence confidence, and
  quality score on a check list that misses real requirements; its low structure
  confidence is the only signal that the proven checks may be the *wrong* checks.
  Never report a strong quality/coverage/evidence picture as trustworthy while
  structure confidence is low — surface both.
- **Structure confidence reads `structure_provenance`** (`spec`/`user_authored`
  = high, `agent_generated` = medium, `inferred_brownfield` = low, `unspecified`
  = excluded, not penalized). That field is authored and owned by the
  `quality-evidence` skill; this skill reports and triages it but never authors
  or self-promotes it.

Split improvement work by which score it raises:

- **Structure-confidence work — human-gated.** The check list is
  `inferred_brownfield`/`unspecified`, or misses real requirements. Raising it
  means ratifying or correcting the checks and their provenance, which is a human
  decision. Hand to the `quality-evidence` skill (per feature) or
  `shiplight-project` (project construction); never self-promote provenance here.
  No `quality-tools` command raises structure confidence.
- **Coverage and evidence-confidence work — agent-automatable.** The checks are
  right but proof is missing or weak. Use `fix-prompts` and author tests. This is
  the closed loop.
- **Quality-score work — runtime.** Proof exists but observations fail or stay
  unobserved. Fix the producer, the wiring, or the product, then re-run
  `analyze`.

## Scope Resolution

Resolve the review scope before changing anything. Valid scopes:

- the whole project (all discovered feature quality maps)
- a saved view from `.quality-center/views.yaml`
- an evaluation set from `.quality-center/evaluation-sets.yaml`
- an existing generated recommendations file the user points to

Never invent a new feature target for project-level work, and never mint a new
`NNN-` slug from this skill. If the user's request turns out to be about one
feature's evidence ("add tests for the rate-card feature"), hand off to the
`quality-evidence` skill instead.

This skill does not produce a project-scope quality map. Project-level quality
is an aggregate of the individual feature maps, read through views and
evaluation sets.

## Relationship To quality-evidence

The two skills share artifacts but split responsibilities:

| Concern | Owner |
| --- | --- |
| Feature `test-spec.md`, `quality-map.yaml`, `test-report.md` | `quality-evidence` |
| Quality map contract, Runtime Join Contract, product-language check writing | `quality-evidence` |
| `.quality-center/observation-sources.yaml`, `evaluation-sets.yaml`, `views.yaml` | this skill |
| `quality-tools analyze` runs and recommendation triage | this skill |
| Repo-wide `fix-prompts` generation | this skill |

When a recommendation requires deep rework of one feature's evidence — new
testing-what items, restructured expectations, new test authoring against the
feature's spec — run the `quality-evidence` workflow for that target rather
than editing its artifacts ad hoc. Small contract-conformant fixes to a feature
map (correcting an `evidence.path`, pinning a `test_case`, updating a
`proof_gap`) may be applied directly from this skill; follow the
`quality-evidence` map contract and preserve stable ids.

Before editing any feature `quality-map.yaml` or authoring emitted
`test_file`/`test_case` values, read the `quality-evidence` skill's Runtime
Join Contract section and validate map edits against its
`assets/quality-map.schema.json` (the skill is installed alongside this one).
If the `quality-evidence` skill is not available, do not edit feature maps —
record the needed fix in your report instead.

## Artifact Location

Create or update these repo-scoped artifacts:

- `.quality-center/observation-sources.yaml` from
  `assets/observation-sources.template.yaml`
- `.quality-center/evaluation-sets.yaml` from
  `assets/evaluation-sets.template.yaml`
- `.quality-center/views.yaml` from `assets/views.template.yaml`

Validate against:

- `assets/observation-sources.schema.json`
- `assets/evaluation-sets.schema.json`
- `assets/views.schema.json`

These schema files mirror the current Shiplight quality artifact parser
contract.

Generated analysis output lands in
`.quality-center/generated/recommendations/<evaluation-set-id>--<scope-id>.json`.
Treat generated files as tool output to read, not artifacts to author.

Keep runtime review config proportional. Do not create these files just because
the repo has tests. Create them when the user wants shared runtime review,
release review, or observation ingestion.

## Workflow

### 1. Resolve Scope And Inventory

- Resolve the review scope (whole project, saved view, evaluation set, or
  recommendations file).
- Inventory existing inputs: the primary project map
  (`.specify/project-map.yaml` or repo-root `project-map.yaml`), feature maps
  under `quality-evidence/**/quality-map.yaml`, existing `.quality-center/*`
  config, repo-root `quality-policy.yaml`, CI workflows, and local result
  folders.
- Record which inputs exist and which are missing. Missing feature maps for
  important features are themselves a finding: recommend a `quality-evidence`
  pass per missing target rather than scaffolding maps from here.

### 2. Wire Or Repair Runtime Review Config

Author repo-level runtime review config in two layers, following the
Observation Review Setup Guide below:

1. `.quality-center/observation-sources.yaml`
2. `.quality-center/evaluation-sets.yaml`

Inspect the repo's existing result producers first: GitHub Actions workflows,
local result folders, and structured result artifacts already covered by
`assets/observation-sources.schema.json`.

Use `quality-map.yaml` as the proof-definition source of truth. Runtime join
happens through evidence proof-source paths under the Runtime Join Contract,
not through a second remapping table. Do not add `subject_id`, `evidence_id`,
or workflow-step mappings to source profiles.

### 3. Optional: Create Saved Reader Views

Only do this when the user asks for saved views, product slices, release-area
views, team views, or reusable filtered project readers. Do not create saved
views for every feature by default.

Use this contract:

```yaml
views:
  - id: "release-readiness"
    name: "Release readiness"
    description: "Features reviewed together for release readiness."
    feature_ids:
      - "001-example-feature"
      - "002-example-feature"
```

Rules:

- `id` must be stable, lowercase kebab-case, and unique within the file.
- `name` must be short and user-facing.
- `description` is optional but recommended when the grouping is not obvious.
- `feature_ids` must reference existing primary project-map feature ids exactly:
  the `features[].id` values from the repo's discovered `project-map.yaml`
  artifact. These often match feature target slugs, but do not infer them from
  `quality-evidence/<target>/quality-map.yaml`; read the project map.
- Each saved view must include at least one feature id.
- Do not create saved views when the repo has no primary project map; there is
  no authoritative feature list to validate the view membership.
- Do not create a saved view named `whole-project`; the built-in Whole project
  scope exists automatically when no saved view is selected.
- Keep saved views as reader filters only. Do not duplicate feature metadata,
  quality checks, evidence paths, observation source profiles, or
  evaluation-set membership in `views.yaml`.
- Prefer a small number of meaningful product slices over one view per feature.

Good view boundaries: product or package area, release readiness scope, team
ownership scope, customer workflow slice, or a runtime review scope that should
be read separately after an evaluation set runs.

### 4. Run Recommendation Analysis

Run local analysis from the target repo:

```bash
npx @shiplightai/quality-tools analyze \
  --project-path <repo-root> \
  --evaluation-set <evaluation-set-id> \
  --view <optional-view-id>
```

The command writes
`.quality-center/generated/recommendations/<evaluation-set-id>--<scope-id>.json`.

Read the generated JSON as feedback for evidence-system work only: fix tests,
workflow artifact emission, observation-source config, evaluation-set config,
saved-view membership, or quality-map proof definitions. Do not optimize the
quality score as an agent objective, and do not remove scope or weaken quality
checks to make recommendations disappear.

Key fields:

- `runtime_review.execution_status` and `runtime_review.profiles[]` describe
  source acquisition and adapter ingestion.
- `runtime_review.resolution_status` describes whether loaded observations
  joined to quality-map evidence.
- `runtime_review.execution_diagnostics` cover source/config/artifact/parser
  problems.
- `runtime_review.resolution_diagnostics` cover join-time ambiguity or invalid
  loaded observations.
- `runtime_review.resolution_audit` gives matched, unmatched, and ambiguous
  observation counts plus bounded examples. Use it to distinguish "the artifact
  was missing" from "the artifact loaded, but its test file or test case did
  not match evidence."
- `recommendations[]` lists the concrete quality checks to fix, including
  `quality_map_path`, `expectation_local_id`, `observed_state`,
  `proof_source_paths`, `verification_commands`, and the generated agent
  `prompt`.

Runtime analysis output owns its own lowercase vocabularies: observed states
(`pass`, `fail`, `error`, `skipped`, `unobserved`) and stage statuses (`valid`,
`partial`, `invalid`). `valid` means the stage completed without diagnostics,
`partial` means usable observations plus diagnostics, and `invalid` means
diagnostics prevented usable observations for that stage. Do not copy these
vocabularies into authored artifacts; authored feature artifacts keep the
vocabularies defined in the `quality-evidence` skill.

### 5. Triage And Fix Recommendations

Work the recommendations as a converging loop. Classify each one by fix domain
before editing anything:

1. **Source/config problem**: missing credentials, wrong `source_kind`, repo,
   workflow, or local-folder config. Fix `observation-sources.yaml`.
2. **Artifact problem**: wrong `artifact_names`, wrong adapter `artifact_path`,
   or a workflow that produces no machine-readable report. Fix the profile, or
   add a report-emitting workflow step (see Workflow-Emitted Observations).
3. **Producer problem**: the report format, parser type, status values, or
   timestamps emitted by the producer are invalid. Fix the producer.
4. **Join problem**: observations loaded but proof stays `unobserved`. Compare
   `resolution_audit.unmatched_examples[].test_file` with `evidence.path`, and
   the observed `test_case` with `evidence.test_case`, under the Runtime Join
   Contract. Fix the emitted path or the structural `evidence.path`/`test_case`
   declaration — never add a second mapping table.
5. **Real evidence gap**: the proof definition is right and the runtime result
   shows missing or failing proof. Fix or add the tests. For code-tied tests,
   author them or emit fix-prompts; for deep per-feature rework, run the
   `quality-evidence` workflow for that target.
6. **Scope problem**: view membership or evaluation-set bundling reads wrong.
   Fix `views.yaml` or `evaluation-sets.yaml`.

After each fix, rerun the relevant proof commands, then rerun analysis until
remaining recommendations are low-return, blocked, deferred, or require user
judgment.

Use this debugging ladder for runtime diagnostics, in order:

1. Missing credentials or invalid source: fix required env, `source_kind`,
   repo, workflow, or local-folder config.
2. Missing artifact match: verify the selected run/folder, `artifact_names`,
   and adapter `artifact_path`. For manifest adapters without `artifact_path`,
   confirm the matched artifact actually contains JSON observation manifests.
3. Invalid observation artifact: fix the report format, parser type, status
   values, or timestamps emitted by the producer.
4. Loaded observations but unobserved proof: compare
   `resolution_audit.unmatched_examples[].test_file` with `evidence.path`.
5. Same path but still unobserved: compare the observed `test_case` with the
   quality-map `evidence.test_case`.
6. Ambiguous proof source: remove overlapping file-level and pinned rows for
   the same path, or pin every distinct evidence row.

### 6. Report

Summarize for the user:

- scope reviewed and evaluation sets/views used
- config created or repaired
- recommendations fixed, with the fix domain for each
- recommendations remaining, split into low-return, blocked, deferred, and
  needs-user-judgment
- feature targets that need a full `quality-evidence` pass

Do not write run outcomes into feature `quality-map.yaml` files; current
results live in generated recommendations and each feature's `test-report.md`.

## Generate Fix Prompts

Invocation shortcut: `fix-prompts`.

When the user says `quality-center fix-prompts`, interpret it as this workflow.
Accept script-style options after the shortcut, for example:

```text
quality-center fix-prompts --limit 10
```

When the user wants coding agents to fix many evidence gaps, do not require
manual copy/paste from a dashboard. Generate prompts directly from the repo's
quality maps with the package command:

```bash
npx @shiplightai/quality-tools fix-prompts \
  --project-path <repo-root> \
  --output quality-evidence/fix-prompts.md
```

Useful options:

- `--format json` for automation.
- `--target <target-id>` for one feature target.
- `--limit <n>` for the highest-priority prompts only.
- `--include-covered` when auditing every quality check, not just open gaps.

Relative `--output` paths are resolved under `<repo-root>`.

The command scans `quality-evidence/**/quality-map.yaml`. It uses quality-map
target ids and names for affected feature/spec identity; do not infer feature
ownership from test file names. It reads structural proof gaps, evidence depth,
commands, paths, and notes from the current map contract; it does not depend on
embedded run-state fields. Each prompt separates source-of-truth inputs from
verification checks so the fixing agent knows what to read versus what to run.
Use the package command; do not write a custom prompt generator for this
workflow.

## Workflow-Emitted Observations

Many release gates are smoke or health checks that run in CI but are not test
files (exit-code assertions, probes, healthchecks). The map side — authoring the
quality check with `path` pointing at the workflow file and `test_case` naming
the proven unit — is covered by the `quality-evidence` skill. This skill owns
the source side:

If the gate produces no machine-readable result, add or adjust a workflow step
that writes a small JSON observation report — see the manifest contract in
`assets/observation-sources.template.yaml`. The emitted `test_file` and
`test_case` values must follow the Runtime Join Contract. Only modify a
workflow when you are authoring it or the user has authorized the change;
otherwise propose the step and leave it to the workflow owner. Without this,
the check stays a documented proof with no runtime backing — a legitimate gap,
not an error.

The observation source profile says **where** results come from (the workflow
and its artifact), not the details of the report. For a manifest adapter,
`artifact_path` is **optional**, but choose deliberately:

- **Omit it only when the artifact is dedicated to observations** — a JSON-only
  observation bundle (the recommended pattern: a `qc-*` artifact, or a local
  folder that holds nothing else). The manifest adapter then reads every JSON
  file in the source as a manifest.
- **Set it when the source also holds other JSON** (Playwright reports, release
  records, etc.). The manifest reader globs every `.json` and tries to parse
  each one; non-manifest JSON is rejected safely — it never becomes a false
  observation — but it produces diagnostics and a `partial` execution status,
  which is misleading noise. Pointing `artifact_path` at the one report avoids
  it.

If the workflow produces no observation artifact yet, write **no source
profile** — record the gap and add the profile later, together with the
workflow-emit step.

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
- Prefer an adapter from `assets/observation-sources.schema.json` that matches
  an existing structured result. Use the manifest contract in
  `assets/observation-sources.template.yaml` for smoke/health checks and other
  non-test-file gates.
- Keep adapters acquisition-only:
  - `artifact_path`
  - schema-defined parser type
- Do not add `subject_id`, `evidence_id`, or workflow-step mappings here.
- The join target already lives in `quality-map.yaml`:
  - `evidence.path` should point at the canonical repo-relative test file path
  - multiple evidence rows may intentionally share the same file path in v1,
    but follow the Runtime Join Contract: keep them all file-level or pin each
    row with its own `test_case`; do not mix pinned and unpinned rows on the
    same path

### B. Author `evaluation-sets.yaml`

- One evaluation set per shared review unit.
- A set references one or more profile ids in precedence order.
- If a user wants to debug one profile in isolation, use a single-profile
  evaluation set instead of inventing a separate product concept.
- Scope filtering happens later at the project or saved-view level, not in the
  evaluation set.

### C. Verify

- Validate both files against the schema when tooling is available.
- Run `@shiplightai/quality-tools analyze` for at least one saved evaluation
  set when required source credentials/artifacts are available. Treat the
  config as verified only when the intended source profiles execute and any
  missing-artifact or missing-match diagnostics are explained.
- Confirm the generated recommendations show observations resolved onto the
  intended evidence paths and optional `test_case` values. Expected proof
  sources should show observed states in the runtime review; expected but
  missing proof remains `unobserved` and visible, not silently omitted.
- If credentials or artifacts are unavailable, report that runtime analysis
  could not be run.
- If observations are missing, fix the emitted test file path or the structural
  `evidence.path` declaration rather than adding a second mapping table.
- For saved views, confirm the repo has a primary project map and the selected
  `feature_ids` exist under its `features:` list, validate against
  `assets/views.schema.json`, and run analyze with `--view <view-id>` against
  at least one relevant evaluation set when runtime artifacts are available.
  Confirm the generated recommendation scope uses the selected view id and the
  evaluated target inventory is filtered to the intended feature ids.

## Artifact Skeletons

`.quality-center/observation-sources.yaml`:

```yaml
profiles:
  - id: example-workflow
    name: Example workflow
    source_kind: github-actions
    source_refs: []
    auth:
      required_env: [GITHUB_TOKEN]
    github:
      repo: org/repo
      workflow: publish.yml
      artifact_names: [qc-observations-*]
    adapters:
      - id: browser-junit
        type: junit
        artifact_path: artifacts/browser.junit.xml
      - id: browser-json
        type: playwright-json
        artifact_path: artifacts/browser.playwright.json
      - id: release-smoke-manifest
        type: manifest
        # artifact_path is optional for manifest adapters; set it when the
        # source artifact also contains non-observation JSON.
        artifact_path: artifacts/qc/smoke-observations.json
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

`.quality-center/views.yaml`:

```yaml
views:
  - id: example-slice
    name: Example slice
    description: Reusable reader slice for related project-map features.
    feature_ids:
      - 001-example-feature
      - 002-example-feature
```

For the full starter, copy `assets/views.template.yaml`.
For validation, use `assets/views.schema.json`.

## Operating Rules

- This skill may edit `.quality-center/observation-sources.yaml`,
  `.quality-center/evaluation-sets.yaml`, `.quality-center/views.yaml`, tests,
  test fixtures, test scripts, CI workflow observation-emit steps (when
  authorized), and — for contract-conformant join-key and proof-gap fixes
  (`evidence.path`, `evidence.test_case`, `proof_gap`), after reading the
  `quality-evidence` contract per Relationship To quality-evidence — feature
  `quality-evidence/**/quality-map.yaml` files. It does not edit feature
  `test-spec.md` or `test-report.md`; when a fix makes those stale, run the
  `quality-evidence` workflow for that target or flag it for one.
- Follow the `quality-evidence` skill's map contract when touching feature
  quality maps: preserve stable ids, use the schema enums, keep maps
  structural, and never write run outcomes, timestamps, freshness, or
  confidence rollups into them.
- Keep `.quality-center/*` repo-scoped. Do not duplicate source-acquisition,
  saved-review bundling, or reader-slice membership into feature
  `quality-map.yaml` files. Keep the proof-definition join in feature evidence
  via canonical repo-relative test file paths.
- Never invent a new feature target or mint a new `NNN-` slug from this skill.
- Do not optimize any of the four scores as an objective. In particular, never
  promote `structure_provenance` (e.g. to `spec`/`user_authored`) to lift
  structure confidence without genuine human ratification, and do not remove
  scope, weaken checks, or trim view membership to make recommendations
  disappear.
- Treat generated recommendation files as read-only tool output.
- Avoid unrelated refactors and unrelated production-code changes.
- Never include secrets, cookies, tokens, database URLs, raw fixture secrets,
  or private customer data in config, reports, logs, or artifacts.
- Never report pass/fail without command output, automated test evidence, or
  explicit observation.

## When Not To Use

- When the user wants quality evidence for a single feature, spec, PR, or
  ticket: use the `quality-evidence` skill.
- When the user only wants a code review with no evidence-system work.
- When the repo has no feature quality maps yet: run `quality-evidence` on the
  priority features first; there is nothing for project-level review to join
  onto.
