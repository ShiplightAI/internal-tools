---
name: quality-project
description: "Orchestrate project-level Spec Kit development: PRDs, roadmap and feature breakdown, project-map traceability, active feature selection, change classification (new feature vs cross-cutting refactor/bug fix), brownfield reconstruction from existing docs/code/tests, and sequencing of Spec Kit, verify, quality-evidence, and code-review workflows."
user_invocable: true
---

# Quality Project

Project-level operating workflow for Spec Kit projects. Use this when the user
wants to create or refine a PRD, break a product into numbered features, select
or switch the active feature, build project-level traceability, reconstruct
features from an existing codebase, or drive the full project workflow across
Spec Kit, verification, quality-evidence, and review.

This skill is the orchestrator. It should call or sequence feature-level skills
instead of duplicating them.

## Prerequisites

Before using this skill to create project artifacts, reconstruct behavior, or
drive a project, verify that the project and current agent have these
foundations:

1. **Spec Kit installed and bootstrapped**
   - The `specify` CLI is installed.
   - The target repo has already run the `specify init` command for the current
     coding agent. For Codex skills mode, use the Spec Kit Codex integration
     with skills enabled.
   - Spec Kit commands or skills from `specify init` are available for the active
     agent.
   - Reference: https://github.com/github/spec-kit/blob/main/README.md

2. **Shiplight MCP and skills installed**
   - The Shiplight MCP server is installed for the current agent.
   - Shiplight skills are installed for the current agent. This orchestrator
     sequences the sibling internal skills it invokes — `quality-evidence`,
     `code-review-run`, and the test producers (`create-agent-tests`,
     `create-tests`) — plus public Shiplight skills such as `verify`.
   - Reference: https://github.com/ShiplightAI/agent-skills/blob/main/README.md

These prerequisites gate **Spec-Kit-specific** work — creating Spec Kit
artifacts, backfilling specs, or running the `speckit-*` commands. They do
**not** gate all project work. Two paths run without `specify init`:

- **Read-only brownfield assessment**: discovering docs/code/tests/trackers,
  proposing a provisional project map, and running a `quality-evidence`
  confidence pass.
- **Spec-less development and maintenance**: constructing and ratifying the
  backbone (project map + feature quality maps) directly and driving the feature
  lifecycle through its spec-less planning path (see Mode 4), including bug fixes
  and cross-cutting changes. This is a first-class path, not a fallback — most
  existing repos never adopt Spec Kit.

For an un-initialized brownfield repo, start with the assessment (see Brownfield
Reconstruction) and install/scaffold Spec Kit only if the user decides to adopt
it. If a **Spec-Kit-specific** step is requested while Spec Kit is missing, stop
and either help the user install it or offer the spec-less path instead.

## Default Invocation

When the user invokes this skill without a more specific request, run a
non-mutating project status pass (mode `status`):

1. Verify prerequisites are present.
2. Read the current Spec Kit pointer, branch, project map if present, active
   feature spec/plan/tasks, and recent evidence/review artifacts.
3. Report current mode, active feature, branch, phase, artifacts found, drift or
   traceability gaps, and the next gate.
4. Do not create files, switch branches, edit pointers, or run long validation
   suites unless the user asks for that next step.

Treat the status pass as orientation. If a project map is missing, stale, or
inconsistent, report the exact gap and recommend the smallest follow-up action.

## Backbone

Maintain this hierarchy:

```text
PRD / roadmap: project intent
project-map.yaml: project graph and traceability
quality-policy.yaml: project proof-strategy guidance
spec.md: feature truth (spec-driven) — or ratified quality-map SOURCE checks (spec-less)
plan.md / tasks.md: execution contract (spec-driven)
code: implementation artifact
tests / reports / reviews: evidence
```

When a project is spec-less, the spec/plan/tasks rows are absent; the feature's
ratified backbone (project-map entry plus quality-map `SOURCE` checks) carries
the feature-truth role instead.

For brownfield projects, existing code, docs, and tests are discovery inputs,
not automatically product truth. Mark reconstructed facts as `IMPLEMENTATION`,
`INFERRED`, or `LEGACY` until the user ratifies them.

Definitions:

- **Greenfield**: product intent starts from PRD/specs before implementation.
- **Brownfield**: existing docs, code, tests, and runtime behavior are used to
  reconstruct candidate product intent and specs.

## Backbone And Construction

The project-map and the per-feature quality-maps are the stable **backbone** —
fixed-shape data structures that downstream tools (Quality Center scores, runtime
join, dashboards) read regardless of where their content came from. How the
backbone gets populated is **construction**, and it varies by source:

- **Spec-driven construction**: features and checks come from PRDs/specs and the
  Spec Kit lifecycle. Quality maps are authored with `structure_provenance: spec`
  (or `user_authored` when a human defines the checks directly).
- **Brownfield construction**: features and checks are reconstructed from existing
  code, docs, tests, and trackers. Quality maps are authored
  `structure_provenance: inferred_brownfield` until a human validates them, and
  project-map facts are marked `IMPLEMENTATION`/`INFERRED`/`LEGACY` as above.

Construction is continuous reconciliation, not a one-time bootstrap: the same step
keeps the backbone aligned as code, specs, tickets, and evidence change. A single
project may mix constructors — some features spec-driven, some reconstructed —
because provenance is recorded per artifact, not per project. Spec Kit is one
optional constructor, not a prerequisite for the backbone.

`structure_provenance` is the join key for Quality Center's **structure
confidence** score, exactly as `evidence.path` is the join key for runtime review.
It is owned and authored by the `quality-evidence` skill; this orchestrator drives
*when* construction and ratification happen, not the field's contract.

## Specification Authority

Establish and enforce this principle in every project:

- Specs are the source of truth for accepted product behavior.
- Code is an implementation artifact of the specs.
- Tests, verification reports, quality evidence, and code reviews are evidence.
- Specs are current snapshots, not historical logs.
- Git history tracks how specs, code, and tests changed over time.

When behavior changes, update the relevant spec in the same change. If code,
tests, plans, tasks, or docs drift from the spec, reconcile the drift before
declaring the feature done.

If intent is unclear, stop and clarify with the user. Do not silently choose
between conflicting spec/code/test behavior when the choice affects product
semantics.

Old behavior should be removed from the active spec when it is replaced. Do not
keep obsolete behavior as an active alternative just to preserve history; git is
the history. If useful, mention the replacement in the project map as
`deprecated` or `superseded`, but keep the active spec focused on current
accepted behavior.

## Primary Artifacts

Prefer existing repo conventions. If none exist, use:

- `docs/prd.md`: product requirements and intent.
- `docs/feature-breakdown.md`: numbered roadmap and feature dependencies.
- `.specify/project-map.yaml`: project graph for Spec Kit repos.
- `project-map.yaml`: acceptable top-level alternative when the web UI or repo
  conventions prefer a visible root artifact.
- `quality-policy.yaml`: project-wide proof-strategy guidance for
  `quality-evidence`.
- `specs/NNN-feature-name/`: feature-level Spec Kit artifacts.
- `quality-evidence/<feature>/`: quality evidence for a feature.

Use bundled assets when creating new files:

- `assets/prd-template.md`
- `assets/feature-breakdown-template.md`
- `assets/project-map.template.yaml`

Read `references/project-map.md` before creating or significantly changing a
project map. Read `references/brownfield-reconstruction.md` before deriving
features from an existing non-Spec Kit codebase.

`assets/project-map.template.yaml` is the single source of truth for project map
shape. When a map is missing, stale, or needs repair, read `references/project-map.md`
and use `assets/project-map.template.yaml` directly.

Project maps should be readable as product-language summaries before they are
used as traceability graphs. Write project, release area, feature, and concern
names/descriptions in terms of product capabilities, workflows, outcomes, and
risk or proof posture. Put technical detail in refs, artifact paths, source types,
statuses, discovery metadata, and evidence links.

## Source Types

Use source types consistently in project maps, specs, and reports:

- `SOURCE`: explicit user, PRD, roadmap, spec, or accepted decision.
- `IMPLEMENTATION`: observed from current code or runtime behavior.
- `INFERRED`: agent-derived from patterns, filenames, tests, or partial docs.
- `LEGACY`: existing behavior that may be preserved but is not yet endorsed.
- `DEPRECATED`: intentionally obsolete behavior.

Do not promote `IMPLEMENTATION`, `INFERRED`, or `LEGACY` to `SOURCE` without a
clear user decision or accepted project document.

## Change Classification

Before selecting a mode or touching a branch, classify the incoming work. The
**one branch per feature** rule (one active feature, one feature branch, one
spec/plan/tasks set) governs *new features only*. Most real project work —
bug fixes, refactors, performance or reliability improvements, dependency
upgrades, cross-cutting cleanups — is not a new feature, and forcing it into a
new feature branch produces orphan specs and false roadmap entries.

When work arrives, decide which of these it is:

1. **New feature** — adds a product capability, workflow, or accepted behavior
   that is not yet specified. Apply the one-branch-per-feature rule: create or
   select a feature ID, work on its dedicated branch, and run it through the
   feature lifecycle (Mode 4). This is the only case where a new feature branch
   and a new feature entry are created by default.

2. **Cross-cutting change** — a bug fix, refactor, or improvement that touches
   one or more *existing* features without introducing a new product capability.
   Do **not** auto-create a new feature or feature branch. Instead the agent
   decides between two sub-cases, asking the user when the call is unclear or
   changes product semantics:

   - **Retrofit existing features** (default for most fixes/refactors): treat
     the change as maintenance of features that already exist. Run it as the
     Maintenance mode (Mode 8) — identify every feature it touches, reconcile
     each through Drift Resolution (a pure bug fix usually realigns code to the
     existing spec rather than changing it), and use the repo's normal change
     branch with no new feature entry. Record the touched feature IDs and any
     residual risk in the project map.
   - **Promote to a new feature**: only when the change is coherent and
     substantial enough to stand as its own product capability or proof unit
     (for example, a reliability or migration effort the project wants to track,
     specify, and verify on its own). Then it follows the new-feature path
     above, with explicit dependencies on the features it derives from.

A single cross-cutting change may touch several features at once — scope it,
list the affected feature IDs, and reconcile their specs and evidence together.
That does not violate the one-active-feature rule, which constrains how new
features are built, not how existing ones are maintained.

## Operating Modes

The modes fall into three families along the backbone/construction lens, plus the
read-only status pass (see Default Invocation). Pick the family first, then the
mode:

- **Construct the backbone** — build or reconstruct project-map and quality-maps
  from their sources: Project Initialization (1), Roadmap And Feature Breakdown
  (2), Brownfield Reconstruction (7).
- **Drive a feature** — operate on one active feature through planning and
  execution: Active Feature Selection (3), Feature Lifecycle Driver (4), Batch
  Planning (5), Autonomous Execution (6).
- **Maintain** — change existing features without adding a new one:
  Cross-Cutting Change / Maintenance (8).

The mode numbers below are stable labels, not an execution order; cross-references
elsewhere in this skill use them.

### 1. Project Initialization (`init`)

Use after `specify init` when starting a new product or adding project-level
Spec Kit discipline to a repo. This mode creates or refines artifacts such as the
PRD, feature breakdown, and project map; it does not replace the Spec Kit
`specify init` command.

1. Read `README*`, existing docs, package metadata, current Spec Kit files, and
   any user-provided product notes.
2. Create or refine `docs/prd.md`.
3. Create `docs/feature-breakdown.md` with numbered features, dependencies,
   MVP/release areas, and quality focus.
4. Create `.specify/project-map.yaml` or `project-map.yaml`.
5. Create `quality-policy.yaml` when the project already knows recurring proof
   posture decisions that differ from the baked-in default.
6. Verify the project constitution establishes specification authority:
   - specs are source of truth
   - code is artifact
   - tests/reviews/reports are evidence
   - specs are current snapshots, not history logs
   - behavior changes require spec reconciliation
   - unresolved drift requires user clarification
7. If the constitution is missing or weak on these points, run
   `speckit-constitution` before feature execution.

### 2. Roadmap And Feature Breakdown (`breakdown`)

Use when converting a PRD into executable feature slices.

1. Identify product actors, jobs, workflows, data domains, integrations, and risk
   boundaries.
2. Split features so each can be specified, implemented, and verified
   independently.
3. Assign stable three-digit IDs (`001-*`, `002-*`) and explicit dependencies.
4. Keep MVP/release areas visible.
5. Update the project map so the web UI can connect PRD, roadmap, specs, code,
   evidence, and status.

### 3. Active Feature Selection (`select`)

Use when switching from one feature to another or resuming work.

1. Confirm the desired feature ID and branch.
2. Ensure only one active feature is selected.
3. Align the repo state:
   - current git branch
   - `.specify/feature.json`
   - `AGENTS.md` Spec Kit pointer, if present
   - `project-map.yaml` or `.specify/project-map.yaml` `active_feature`
4. If the feature does not exist, create it: use the Spec Kit feature creation
   flow when Spec Kit is adopted, or create the backbone entry directly
   (project-map feature plus a `quality-evidence` target) when spec-less.
5. Report the active feature, branch, phase, and next expected command.

`active_feature` is a working pointer. Durable roadmap status belongs on the
feature entry in the project map.

If the selected feature appears implemented, verified, reviewed, merged, or on
`main`, do not assume the active pointer is wrong. Report the state and choose
one of these next gates:

- `done`: mark the feature status complete only when acceptance/evidence is
  current and no blocking drift remains.
- `release`: keep the feature active while release or rollout verification is
  still pending.
- `select-next`: ask for or select the next feature only after the current
  feature has an explicit durable status in the project map.

### 4. Feature Lifecycle Driver (`lifecycle`)

Use one active feature at a time. This mode and its one-active-feature rule
apply to **new features** (see Change Classification). For bug fixes and
cross-cutting refactors that maintain existing features, use Maintenance
(Mode 8) instead of opening a new feature branch.

The planning phase establishes the feature's intent contract. Use whichever
constructor the project has adopted — both are first-class and converge on the
same execution phase.

**Spec-driven planning** (Spec Kit adopted), usually with the user present:

```text
speckit-specify
-> speckit-clarify
-> speckit-checklist
-> speckit-plan
-> speckit-tasks
-> speckit-analyze and fixes
-> commit docs/artifacts when requested
```

**Spec-less planning** (no Spec Kit) — the default for repos that develop or fix
without spec-driven development: author and ratify the backbone directly as the
intent contract — the project-map feature entry plus the feature's
`quality-evidence` test-spec and quality-map. The ratified quality-map `SOURCE`
checks (`structure_provenance: user_authored`) stand in for the spec as accepted
behavior. The owner ratifies them, exactly as Spec Kit planning is owner-present;
this is what raises structure confidence (see Quality And Release Gates).

Execution-heavy phase, shared by both planning modes and often automatable after
planning is accepted:

```text
speckit-implement (or implement directly, spec-less)
-> verify UI/API behavior as needed
-> create or update tests
-> quality-evidence
-> optional code-review-run
-> commit implementation and evidence when requested
```

The orchestrator should update the project map after major transitions:
`planned`, `specified`, `designed`, `tasked`, `implementing`, `implemented`,
`verified`, `reviewed`, `done`, `blocked`, or `deferred`.

### 5. Batch Planning Mode (`batch`)

Use when the user is available for product judgment and wants to prepare many
features.

1. For each selected feature, switch active feature.
2. Run specify/clarify/plan/tasks/analyze.
3. Commit the resulting documents when requested.
4. Do not implement multiple features at once.
5. Leave each feature with a clear next execution step.

### 6. Autonomous Execution Mode (`autonomous`)

Use only for features whose planning is complete and ratified: spec, plan,
tasks, and analyze fixes (spec-driven), or the ratified backbone — project-map
entry plus quality-map `SOURCE` checks (spec-less).

1. Work feature-by-feature in dependency order.
2. Switch active feature before implementation.
3. Run implementation and evidence steps.
4. Stop if requirements are ambiguous, tests require product judgment, or a
   feature depends on unimplemented work.
5. Commit after each feature when requested by the user or repo workflow.

### 7. Brownfield Reconstruction (`brownfield`)

Use when a repo did not previously use Spec Kit. Runs **read-only without Spec Kit
installed** — use it as the brownfield front door before any scaffolding.

Posture: **user-driven + agent-ingest.** The user supplies intent pointers (PRD
links, tracker queries, priorities) and ratifies; the agent ingests docs, code,
tests, and trackers, proposes candidates, and maps evidence. Do not autonomously
reconstruct a whole repo without the user steering scope and priority.

1. Read `references/brownfield-reconstruction.md`.
2. Ask the user for intent sources and where to start: PRD/design-doc paths,
   tracker pointers (Jira/Linear/GitHub Issues), and the highest-value or
   highest-risk area first.
3. Discover existing docs, routes, APIs, schemas, jobs, tests, CI, runtime
   behavior, and the named trackers (via MCP/export/paste when available).
4. Group observed behavior into candidate features; record source types.
5. Create a provisional project map; run `quality-evidence` on the priority area
   for an initial confidence pass.
6. Ask the user to ratify or correct feature boundaries before treating them as
   product truth.
7. Only after ratification and an explicit decision to adopt Spec Kit:
   install / `specify init`, then generate or backfill Spec Kit specs for ratified
   features.

### 8. Cross-Cutting Change / Maintenance (`maintenance`)

Use for the **retrofit** path from Change Classification: a bug fix, refactor,
or improvement that maintains one or more existing features without adding a new
product capability. This mode does not create a feature entry or feature branch;
it works on the repo's normal change branch.

1. Identify every existing feature the change touches and list their IDs.
2. For each touched feature, reconcile spec/plan/tasks/code/tests/evidence
   through Drift Resolution. A pure bug fix usually realigns code to the existing
   spec; only update a spec when accepted behavior actually changes.
3. Run the relevant evidence and review steps (`quality-evidence`, `verify`,
   `code-review-run`) for the affected scope.
4. Update each touched feature's project-map entry and residual risks; do not
   leave cross-feature drift unresolved.

If the change turns out to be coherent and substantial enough to be its own
product capability, stop and promote it to a new feature (Mode 1–4) instead.

## Project Map Maintenance

Keep the map useful as both a product summary and traceability index:

- Record product-language project, release area, feature, and concern summaries
  alongside feature IDs, statuses, dependencies, source refs, spec paths, code
  refs, evidence refs, and residual risks.
- Keep `project.quality_policy_path` aligned with the canonical repo policy file
  when the project uses one.
- Use `roadmap.release_areas` for product-language release areas: logical groups
  of feature IDs that should be judged together for readiness. They are not
  filesystem directories, feature scopes, git branches, or deployment gates
  unless the project explicitly says so.
- Use stable IDs. Do not renumber existing features without explicit approval.
- Prefer concise source refs over dumping full requirements into the map.
- Keep `active_feature` aligned with branch and Spec Kit pointers.
- Mark inferred and legacy facts honestly.
- Surface orphan code, specs without implementation, implementation not in spec,
  evidence gaps, stale reports, and cross-feature drift.

Mutation boundaries:

- Status pass: read-only unless the user explicitly asks to fix artifacts.
- Project initialization, roadmap breakdown, brownfield reconstruction, and
  requested map maintenance: create or edit PRD, roadmap, and project map as
  needed.
- Active feature selection: update `.specify/feature.json`, AGENTS pointers, and
  project-map `active_feature` only when the target feature is clear. Do not
  switch git branches if there are uncommitted changes that could be stranded;
  report the conflict instead.
- Feature lifecycle execution: update specs before code when accepted behavior
  changes, then update plan/tasks/code/tests/evidence to match.
- Branch, release, PR, and merge operations require an explicit user request or
  the `auto-pr` workflow.

## Drift Resolution

Drift is expected in real projects. Handle it explicitly.

Common drift cases:

- Code implements behavior not present in the current spec.
- Spec describes behavior that was never implemented.
- Tasks are checked off but code or evidence is missing.
- Tests assert behavior not present in the spec.
- A newer feature replaces an older feature but both specs still describe
  conflicting active behavior.
- Brownfield code has behavior that may be legacy, accidental, or still
  required.

Resolution order:

1. Identify the conflicting artifacts and quote or reference the smallest useful
   evidence.
2. If product intent is obvious from accepted specs/PRD/constitution, update the
   drifting artifacts to match.
3. If product intent is not obvious, ask the user to decide before changing
   behavior or promoting implementation to source truth.
4. After the decision, update the active spec first, then plan/tasks/code/tests
   and quality evidence.
5. Remove replaced behavior from active specs. Use git history for history and
   the project map for optional `deprecated`/`superseded` traceability.

Do not report a feature as complete while known spec/code/test drift remains
unresolved.

## Quality And Release Gates

Use `quality-evidence` to create or update
`quality-evidence/<feature>/quality-map.yaml` for each feature.

Use repo-root `quality-policy.yaml` when project owners want recurring
proof-strategy guidance to apply across many features.

Do not produce a project-scope quality map. The project map links to each
feature's quality map, and project-level quality is an aggregate of those maps.

Quality Center reports four scores over that aggregate: one observation-backed
**quality score** (proofs passing at runtime) and three structural scores —
**coverage** (proof designed), **evidence confidence** (proof strong), and
**structure confidence** (the check list is the right one, from
`structure_provenance`). They are shown side by side and never blended; a strong
quality/coverage/evidence picture on low structure confidence means the proven
checks may be the *wrong* checks.

These map to three improvement activities, with the gate on the first:

- **Raise structure confidence — human-gated.** Construct and *ratify* the
  backbone: propose features and checks, then have the owner validate them so
  provenance climbs `inferred_brownfield` → `agent_generated` →
  `user_authored`/`spec`. This is the only score no command can move; it is this
  orchestrator's gate and the heaviest work in a brownfield project.
- **Raise coverage and evidence confidence — agent-automatable.** For ratified
  checks, design and strengthen proof through `quality-evidence` and `fix-prompts`.
- **Raise the quality score — runtime.** Wire observations and make them pass
  through the `quality-center` runtime-review flow (`analyze`).

The end-goal automated loop runs the agent-automatable activities continuously and
stops at the ratification gate for owner input. Never let an agent ratify the
backbone on the owner's behalf to make the structure-confidence number rise.

Use `verify` when UI or live behavior needs browser evidence. Use
`code-review-run` after implementation stabilizes or before PR/release gates.

Do not report a feature as done unless:

- Spec/tasks are reconciled.
- Implementation is complete for the accepted scope.
- Relevant tests or checks have passed or residual risks are documented.
- Evidence artifacts are linked from the project map or quality-evidence report.

## Output Style

When working with the user, keep project-level status explicit:

- current mode (`status`, `init`, `breakdown`, `select`, `lifecycle`, `batch`,
  `autonomous`, `brownfield`, or `maintenance`)
- active feature
- branch
- phase
- artifacts changed
- next gate

For clarification questions, present the question first, then options.
