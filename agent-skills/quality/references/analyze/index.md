# analyze — Observations, scoring, and triage

The `analyze` mode of the `/quality` router: the heaviest Quality Center
workflow, covering observation config, the four scores, recommendation analysis,
and triage.

## Read first

- `_shared/independence.md`
- `_shared/layout.md`
- `_shared/vocabularies.md`

Project-level quality improvement workflow. Use when the user wants to raise or
review quality across the whole project or a saved slice of it: wiring runtime
review, bundling observation sources into observation sets, creating saved reader
views, running recommendation analysis, and working down the generated
recommendations across multiple feature quality maps.

This `analyze` mode never works on a single new feature target. Single-feature index
construction — building `.quality-center/evidence/<target>/quality-map.yaml` — belongs to
the `evidence` subcommand, and the dev artifacts it reads
(`specs/<feature>/test-spec.md`, `test-report.md`) belong to `/shiplight cover`.
This `analyze` mode consumes those feature maps as existing inputs and improves the
evidence system around and across them.

In this `analyze` subcommand, `.quality-center` is the checked-in quality artifact namespace
that Shiplight tooling reads: observation sources, observation sets, saved reader
views, and generated recommendations. Agents should use
`@shiplightai/quality-tools` for runtime analysis and generated recommendations.

## Core Model

Feature quality maps are the structural proof definitions. Observation runs join
runtime results onto them through a repo-scoped config layer:

```text
.quality-center/evidence/<target>/quality-map.yaml   structural proof definition (per feature)
        ↓
.quality-center/config/observation-sources.yaml      where runtime results come from
        ↓
.quality-center/config/observation-sets.yaml          which profiles are reviewed together
        ↓
quality-tools analyze                                observation-backed recommendations
                                                     and review state
```

The layers are separate, and each answers exactly one question:

- `quality-map.yaml` — feature-scoped, owned by the `evidence` subcommand (its
  template/schema live in that mode's assets): what counts as proof for the
  feature.
- `.quality-center/config/observation-sources.yaml` — repo-scoped: where runtime
  results come from.
- `.quality-center/config/observation-sets.yaml` — repo-scoped: which profiles are
  reviewed together.
- `.quality-center/config/views.yaml` — repo-scoped: which project-map feature ids are
  read together as saved reader slices.

Observation-backed evaluation is a join, not a second proof definition. Quality
tools load observations from the configured sources, normalize them, and join
them to quality-map evidence by canonical proof-source path plus optional
`test_case`, under the Runtime Join Contract defined in the `evidence`
subcommand. Joined observations make the affected expectation observed as
pass/fail/error/skipped; no matching observation leaves it `unobserved`. The
observation-backed quality score is one of four scores Quality Center reports
(see Quality Scores); do not edit maps, scopes, views, or `structure_provenance`
to optimize any of them.

## Quality Scores

Quality Center reports **one observation-backed quality score plus three
structural scores**. They answer different questions and are shown side by side,
**never blended** into one number.

| Score | Kind | Answers | Raised by |
| --- | --- | --- | --- |
| Quality score | observation-backed (runtime) | Are the mapped proofs passing right now? | green runtime observations (run an observation set) |
| Coverage | structural | Is proof *designed* for the checks? (breadth) | mapping evidence for more checks |
| Evidence confidence | structural | Is that proof *trustworthy and strong*? | stronger test types (derived from evidence `type`), more proof mapped |
| Structure confidence | structural | Are these the *right checks*, and where did they come from? | human ratification of the check list |

What this `analyze` mode must hold:

- **The quality score requires runtime.** It stays unavailable until an
  observation set runs and observations join to the maps. Coverage, evidence
  confidence, and structure confidence are derived from the static maps alone.
- **Read structure confidence beside the others, never as part of them.** A map
  reconstructed from code can show high coverage, evidence confidence, and
  quality score on a check list that misses real requirements; its low structure
  confidence is the only signal that the proven checks may be the *wrong* checks.
  Never report a strong quality/coverage/evidence picture as trustworthy while
  structure confidence is low — surface both.
- **Structure confidence reads `structure_provenance`** (`spec`/`user_authored`
  = high, `agent_generated` = medium, `inferred_brownfield` = low, `unspecified`
  = 0, counted — earns no trust). That field is authored and owned by the
  `evidence` subcommand; this `analyze` mode reports and triages it but never authors
  or self-promotes it.

Split improvement work by which score it raises:

- **Structure-confidence work — human-gated.** The check list is
  `inferred_brownfield`/`unspecified`, or misses real requirements. Raising it
  means ratifying or correcting the checks and their provenance, which is a human
  decision. Hand to the `evidence` subcommand (per feature) or
  the `project` subcommand (project construction); never self-promote provenance here.
  No `quality-tools` command raises structure confidence.
- **Coverage and evidence-confidence work — agent-automatable.** The checks are
  right but proof is missing or weak. Emit `fix-prompts`; tests are authored by
  `/shiplight cover` and mapped by the `evidence` subcommand. This is the closed loop.
- **Quality-score work — runtime.** Proof exists but observations fail or stay
  unobserved. Fix the producer, the wiring, or the product, then re-run
  `analyze`.

## Scope Resolution

Resolve the review scope before changing anything. Valid scopes:

- the whole project (all discovered feature quality maps)
- a saved view from `.quality-center/config/views.yaml`
- an observation set from `.quality-center/config/observation-sets.yaml`
- an existing generated recommendations file the user points to

Never invent a new feature target for project-level work, and never mint a new
`NNN-` slug from this `analyze` mode. If the user's request turns out to be about one
feature's evidence ("add tests for the rate-card feature"), hand off to the
`evidence` subcommand instead.

This `analyze` mode does not produce a project-scope quality map. Project-level quality
is an aggregate of the individual feature maps, read through views and
observation sets.

## Relationship To the `evidence` subcommand

The two modes share artifacts but split responsibilities:

| Concern | Owner |
| --- | --- |
| Feature `specs/<feature>/test-spec.md`, `test-report.md`, `TESTING.md` | `/shiplight cover` |
| Feature `.quality-center/evidence/<feature>/quality-map.yaml` construction, Runtime Join Contract, product-language check writing | `evidence` |
| `.quality-center/config/observation-sources.yaml`, `config/observation-sets.yaml`, `config/views.yaml` | this `analyze` mode |
| `quality-tools analyze` runs and recommendation triage | this `analyze` mode |
| Repo-wide `fix-prompts` generation | this `analyze` mode |

When a recommendation requires deep rework of one feature's evidence — new
testing-what items, restructured expectations, new test authoring against the
feature's spec — run the `evidence` workflow for that target rather
than editing its artifacts ad hoc. Small contract-conformant fixes to a feature
map (correcting an `evidence.path`, pinning a `test_case`, updating a
`proof_gap`) may be applied directly from this `analyze` mode; follow the
`evidence` map contract and preserve stable ids.

Before editing any feature `quality-map.yaml` or authoring emitted
`test_file`/`test_case` values, read the `evidence` subcommand's Runtime
Join Contract section and validate map edits against its schema,
`../evidence/assets/quality-map.schema.json`.

## Artifact Location

Create or update these repo-scoped artifacts:

- `.quality-center/config/observation-sources.yaml` from
  `assets/observation-sources.template.yaml`
- `.quality-center/config/observation-sets.yaml` from
  `assets/observation-sets.template.yaml`
- `.quality-center/config/views.yaml` from `assets/views.template.yaml`

Validate against:

- `assets/observation-sources.schema.json`
- `assets/observation-sets.schema.json`
- `assets/views.schema.json`

These schema files mirror the current Shiplight quality artifact parser
contract.

Generated analysis output lands in
`.quality-center/generated/recommendations/<observation-set-id>--<scope-id>.json`.
Treat generated files as tool output to read, not artifacts to author.

Keep observation config proportional. Do not create these files just because
the repo has tests. Create them when the user wants shared observations,
release review, or observation ingestion.

## Workflow

### 1. Resolve Scope And Inventory

- Resolve the review scope (whole project, saved view, observation set, or
  recommendations file).
- Inventory existing inputs: the primary project map
  (`.quality-center/project-map.yaml`), feature maps under
  `.quality-center/evidence/**/quality-map.yaml`, existing
  `.quality-center/config/*` config, the dev-owned testing strategy
  (`TESTING.md`), CI workflows, and local result folders.
- Record which inputs exist and which are missing. Missing feature maps for
  important features are themselves a finding: recommend an `evidence`
  pass per missing target rather than scaffolding maps from here.

### 2. Wire Or Repair Observations Config

Author repo-level observation config in two layers, validating each against
its schema.

**`observation-sources.yaml`** — one profile per source integration (one GitHub
workflow, or one local artifact folder). Each profile needs `id`, `name`,
`source_kind`, source-specific config, and one or more acquisition-only adapters
(`artifact_path` + a schema-defined parser type). Inspect the repo's existing
producers first (Actions workflows, local result folders, structured artifacts
the schema already covers) and prefer an adapter that matches one. Use the
manifest contract in `assets/observation-sources.template.yaml` for smoke/health
gates and other non-test-file checks.

**`observation-sets.yaml`** — one set per shared review unit, referencing one or
more profile ids in precedence order. To debug a single profile in isolation,
use a single-profile set rather than inventing a new concept. Scope filtering
happens later (project or saved view), not in the set.

The join target already lives in `quality-map.yaml`: runtime join happens
through `evidence.path` (+ optional `test_case`) under the Runtime Join
Contract, not a second remapping table. Do not add `subject_id`, `evidence_id`,
or workflow-step mappings to source profiles. Verify the wiring by running an
observation set (§4) and confirming observations resolve onto the intended
evidence paths; if credentials or artifacts are unavailable, report that.

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
  the `features[].id` values from the repo's `.quality-center/project-map.yaml`
  artifact. These often match feature target slugs, but do not infer them from
  `.quality-center/evidence/<target>/quality-map.yaml`; read the project map.
- Each saved view must include at least one feature id.
- Do not create saved views when the repo has no primary project map; there is
  no authoritative feature list to validate the view membership.
- Do not create a saved view named `whole-project`; the built-in Whole project
  scope exists automatically when no saved view is selected.
- Keep saved views as reader filters only. Do not duplicate feature metadata,
  quality checks, evidence paths, observation source profiles, or
  observation-set membership in `views.yaml`.
- Prefer a small number of meaningful product slices over one view per feature.

Good view boundaries: product or package area, release readiness scope, team
ownership scope, customer workflow slice, or a observations scope that should
be read separately after an observation set runs.

### 4. Run Recommendation Analysis

Run local analysis from the target repo:

```bash
npx @shiplightai/quality-tools analyze \
  --project-path <repo-root> \
  --observation-set <observation-set-id> \
  --view <optional-view-id>
```

The command writes
`.quality-center/generated/recommendations/<observation-set-id>--<scope-id>.json`.

Read the generated JSON as feedback for evidence-system work only: fix tests,
workflow artifact emission, observation-source config, observation-set config,
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
vocabularies defined in the `evidence` subcommand.

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
   `resolution_audit.unmatched_examples[].test_file` with `evidence.path`, then
   the observed `test_case` with `evidence.test_case`, under the Runtime Join
   Contract. Fix the emitted path or the structural `evidence.path`/`test_case`
   declaration — never add a second mapping table. If the join is *ambiguous*
   (one observation matches both a file-level and a pinned row for the same
   path), remove the overlap: keep the path file-level, or pin every distinct
   row.
5. **Real evidence gap**: the proof definition is right and the runtime result
   shows missing or failing proof. Emit `fix-prompts` for the gap; tests are
   authored by `/shiplight cover` and mapped by the `evidence` subcommand. For deep
   per-feature rework, run the `evidence` workflow for that target. This
   `analyze` mode does not author tests.
6. **Scope problem**: view membership or observation-set bundling reads wrong.
   Fix `views.yaml` or `observation-sets.yaml`.

After each fix, rerun the relevant proof commands, then rerun analysis until
remaining recommendations are low-return, blocked, deferred, or require user
judgment.

### 6. Report

Summarize for the user:

- scope reviewed and observation sets/views used
- config created or repaired
- recommendations fixed, with the fix domain for each
- recommendations remaining, split into low-return, blocked, deferred, and
  needs-user-judgment
- feature targets that need a full `evidence` pass

Do not write run outcomes into feature `quality-map.yaml` files; current
results live in generated recommendations and each feature's `test-report.md`.

## Generate Fix Prompts

Invocation shortcut: `fix-prompts`.

When the user says `analyze fix-prompts`, interpret it as this workflow.
Accept script-style options after the shortcut, for example:

```text
analyze fix-prompts --limit 10
```

When the user wants coding agents to fix many evidence gaps, do not require
manual copy/paste from a dashboard. Generate prompts directly from the repo's
quality maps with the package command:

```bash
npx @shiplightai/quality-tools fix-prompts \
  --project-path <repo-root> \
  --output .quality-center/fix-prompts.md
```

Useful options:

- `--format json` for automation.
- `--target <target-id>` for one feature target.
- `--limit <n>` for the highest-priority prompts only.
- `--include-covered` when auditing every quality check, not just open gaps.

Relative `--output` paths are resolved under `<repo-root>`.

The command scans `.quality-center/evidence/**/quality-map.yaml`. It uses quality-map
target ids and names for affected feature/spec identity; do not infer feature
ownership from test file names. It reads structural proof gaps, evidence `type`,
commands, paths, and notes from the current map contract; it does not depend on
embedded run-state fields. Each prompt separates source-of-truth inputs from
verification checks so the fixing agent knows what to read versus what to run.
Use the package command; do not write a custom prompt generator for this
workflow.

## Workflow-Emitted Observations

Many release gates are smoke or health checks that run in CI but are not test
files (exit-code assertions, probes, healthchecks). The map side — the quality
check with `path` at the workflow file and `test_case` naming the proven unit —
is covered by the `evidence` subcommand. This `analyze` mode owns the source side.

If the gate produces no machine-readable result, add or adjust a workflow step
that writes a small JSON observation report (see the manifest contract in
`assets/observation-sources.template.yaml`); its emitted `test_file`/`test_case`
must follow the Runtime Join Contract. Only modify a workflow when you are
authoring it or the user has authorized it; otherwise propose the step and leave
it to the owner. Without an artifact, write **no source profile** — record the
gap and add the profile later with the emit step. A documented proof with no
runtime backing is a legitimate gap, not an error.

For a manifest adapter, `artifact_path` is optional: omit it when the artifact
is a dedicated JSON-only observation bundle; set it when the source also holds
other JSON, so the reader targets the one report instead of globbing every
`.json`. The template documents the full contract.

## Artifact Skeletons

`.quality-center/config/observation-sources.yaml`:

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

`.quality-center/config/observation-sets.yaml`:

```yaml
observation_sets:
  - id: example-review
    name: Example review
    profiles:
      - profile_id: example-workflow
```

For the full starter, copy `assets/observation-sets.template.yaml`.
For validation, use `assets/observation-sets.schema.json`.

`.quality-center/config/views.yaml`:

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

- This `analyze` mode may edit `.quality-center/config/observation-sources.yaml`,
  `.quality-center/config/observation-sets.yaml`, `.quality-center/config/views.yaml`, CI
  workflow observation-emit steps (when authorized), and — for
  contract-conformant join-key and proof-gap fixes (`evidence.path`,
  `evidence.test_case`, `proof_gap`), after reading the `evidence`
  contract per Relationship To the `evidence` subcommand — feature
  `.quality-center/evidence/**/quality-map.yaml` files. It does **not** author or edit
  tests, fixtures, or test scripts (owned by `/shiplight cover`), nor feature
  `specs/<feature>/test-spec.md` or `test-report.md`; when a fix needs new tests
  or makes those stale, run the `/shiplight cover` workflow for that target or flag
  it.
- Follow the `evidence` subcommand's map contract when touching feature
  quality maps: preserve stable ids, use the schema enums, keep maps
  structural, and never write run outcomes, timestamps, freshness, or
  confidence rollups into them.
- Keep `.quality-center/*` repo-scoped. Do not duplicate source-acquisition,
  saved-review bundling, or reader-slice membership into feature
  `quality-map.yaml` files. Keep the proof-definition join in feature evidence
  via canonical repo-relative test file paths.
- Never invent a new feature target or mint a new `NNN-` slug from this `analyze` mode.
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
  ticket: use the `evidence` subcommand.
- When the user only wants a code review with no evidence-system work.
- When the repo has no feature quality maps yet: run `evidence` on the
  priority features first; there is nothing for project-level review to join
  onto.
