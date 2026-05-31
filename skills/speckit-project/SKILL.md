---
name: speckit-project
description: "Orchestrate project-level Spec Kit development: PRDs, roadmap and feature breakdown, project-map traceability, active feature selection, brownfield reconstruction from existing docs/code/tests, and sequencing of Speckit, verify, quality-evidence, and code-review workflows."
user_invocable: true
---

# Speckit Project

Project-level operating workflow for Spec Kit projects. Use this when the user
wants to create or refine a PRD, break a product into numbered features, select
or switch the active feature, build project-level traceability, reconstruct
features from an existing codebase, or drive the full project workflow across
Speckit, verification, quality-evidence, and review.

This skill is the orchestrator. It should call or sequence feature-level skills
instead of duplicating them.

## Prerequisites

Before using this skill to initialize, reconstruct, or drive a project, verify
that the project and current agent have these foundations:

1. **Spec Kit installed and initialized**
   - The `specify` CLI is installed.
   - The target repo has been initialized with `specify init` for the current
     coding agent. For Codex skills mode, use the Spec Kit Codex integration
     with skills enabled.
   - Speckit commands or skills are available for the active agent, including
     `speckit-constitution`, `speckit-specify`, `speckit-clarify`,
     `speckit-plan`, `speckit-tasks`, `speckit-analyze`, and
     `speckit-implement`.
   - Reference: https://github.com/github/spec-kit/blob/main/README.md

2. **Shiplight MCP and skills installed**
   - The Shiplight MCP server is installed for the current agent.
   - Shiplight skills are installed for the current agent, especially `verify`,
     `create-tests`, `triage`, and relevant review skills.
   - Reference: https://github.com/ShiplightAI/agent-skills/blob/main/README.md

If either prerequisite is missing, stop project orchestration and help the user
install or initialize the missing foundation before running the project workflow.

## Backbone

Maintain this hierarchy:

```text
PRD / roadmap: project intent
project-map.yaml: project graph and traceability
spec.md: feature truth
plan.md / tasks.md: execution contract
code: implementation artifact
tests / reports / reviews: evidence
```

For brownfield projects, existing code, docs, and tests are discovery inputs,
not automatically product truth. Mark reconstructed facts as `IMPLEMENTATION`,
`INFERRED`, or `LEGACY` until the user ratifies them.

Definitions:

- **Greenfield**: product intent starts from PRD/specs before implementation.
- **Brownfield**: existing docs, code, tests, and runtime behavior are used to
  reconstruct candidate product intent and specs.

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
- `specs/NNN-feature-name/`: feature-level Speckit artifacts.
- `quality-evidence/<target>/`: quality evidence for project or feature.

Use bundled assets when creating new files:

- `assets/prd-template.md`
- `assets/feature-breakdown-template.md`
- `assets/project-map.template.yaml`

Read `references/project-map.md` before creating or significantly changing a
project map. Read `references/brownfield-reconstruction.md` before deriving
features from an existing non-Speckit codebase.

## Source Types

Use source types consistently in project maps, specs, and reports:

- `SOURCE`: explicit user, PRD, roadmap, spec, or accepted decision.
- `IMPLEMENTATION`: observed from current code or runtime behavior.
- `INFERRED`: agent-derived from patterns, filenames, tests, or partial docs.
- `LEGACY`: existing behavior that may be preserved but is not yet endorsed.
- `DEPRECATED`: intentionally obsolete behavior.

Do not promote `IMPLEMENTATION`, `INFERRED`, or `LEGACY` to `SOURCE` without a
clear user decision or accepted project document.

## Operating Modes

### 1. Project Initialization

Use when starting a new product or adding Speckit discipline to a repo.

1. Read `README*`, existing docs, package metadata, current Speckit files, and
   any user-provided product notes.
2. Create or refine `docs/prd.md`.
3. Create `docs/feature-breakdown.md` with numbered features, dependencies,
   MVP/release boundaries, and quality focus.
4. Create `.specify/project-map.yaml` or `project-map.yaml`.
5. Verify the project constitution establishes specification authority:
   - specs are source of truth
   - code is artifact
   - tests/reviews/reports are evidence
   - specs are current snapshots, not history logs
   - behavior changes require spec reconciliation
   - unresolved drift requires user clarification
6. If the constitution is missing or weak on these points, run
   `speckit-constitution` before feature execution.

### 2. Roadmap And Feature Breakdown

Use when converting a PRD into executable feature slices.

1. Identify user personas, workflows, data domains, integrations, and risk
   boundaries.
2. Split features so each can be specified, implemented, and verified
   independently.
3. Assign stable three-digit IDs (`001-*`, `002-*`) and explicit dependencies.
4. Keep MVP/release boundaries visible.
5. Update the project map so the web UI can connect PRD, roadmap, specs, code,
   evidence, and status.

### 3. Active Feature Selection

Use when switching from one feature to another or resuming work.

1. Confirm the desired feature ID and branch.
2. Ensure only one active feature is selected.
3. Align the repo state:
   - current git branch
   - `.specify/feature.json`
   - `AGENTS.md` Speckit pointer, if present
   - `project-map.yaml` or `.specify/project-map.yaml` `active_feature`
4. If the feature does not exist, use `speckit-git-feature` and
   `speckit-specify` as appropriate.
5. Report the active feature, branch, phase, and next expected command.

`active_feature` is a working pointer. Durable roadmap status belongs on the
feature entry in the project map.

### 4. Feature Lifecycle Driver

Use one active feature at a time.

Planning-heavy phase, usually with the user present:

```text
speckit-specify
-> speckit-clarify
-> speckit-checklist
-> speckit-plan
-> speckit-tasks
-> speckit-analyze and fixes
-> commit docs/artifacts when requested
```

Execution-heavy phase, often automatable after planning is accepted:

```text
speckit-implement
-> verify UI/API behavior as needed
-> create or update tests
-> quality-evidence
-> optional code-review-run
-> commit implementation and evidence when requested
```

The orchestrator should update the project map after major transitions:
`planned`, `specified`, `planned_for_implementation`, `implemented`,
`verified`, `reviewed`, `done`, `blocked`, or `deferred`.

### 5. Batch Planning Mode

Use when the user is available for product judgment and wants to prepare many
features.

1. For each selected feature, switch active feature.
2. Run specify/clarify/plan/tasks/analyze.
3. Commit the resulting documents when requested.
4. Do not implement multiple features at once.
5. Leave each feature with a clear next execution step.

### 6. Autonomous Execution Mode

Use only for features whose spec, plan, tasks, and analyze fixes are complete.

1. Work feature-by-feature in dependency order.
2. Switch active feature before implementation.
3. Run implementation and evidence steps.
4. Stop if requirements are ambiguous, tests require product judgment, or a
   feature depends on unimplemented work.
5. Commit after each feature when requested by the user or repo workflow.

### 7. Brownfield Reconstruction

Use when a repo did not previously use Speckit.

1. Read `references/brownfield-reconstruction.md`.
2. Discover existing docs, routes, APIs, schemas, jobs, tests, CI, and runtime
   behavior.
3. Group observed behavior into candidate features.
4. Create a provisional project map with confidence and source types.
5. Ask the user to ratify or correct feature boundaries before treating them as
   product truth.
6. Generate or backfill Speckit feature specs for ratified features.

## Project Map Maintenance

Keep the map useful for humans, agents, and web UIs:

- Record feature IDs, names, statuses, dependencies, source refs, spec paths,
  code refs, evidence refs, and residual risks.
- Use stable IDs. Do not renumber existing features without explicit approval.
- Prefer concise source refs over dumping full requirements into the map.
- Keep `active_feature` aligned with branch and Speckit pointers.
- Mark inferred and legacy facts honestly.
- Surface orphan code, specs without implementation, implementation not in spec,
  evidence gaps, stale reports, and cross-feature drift.

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

Use `quality-evidence` to create or update:

- `quality-evidence/project/quality-map.yaml` for project-level evidence posture.
- `quality-evidence/<feature>/quality-map.yaml` for feature-level evidence.

Use `verify` when UI or live behavior needs browser evidence. Use
`code-review-run` after implementation stabilizes or before PR/release gates.

Do not report a feature as done unless:

- Spec/tasks are reconciled.
- Implementation is complete for the accepted scope.
- Relevant tests or checks have passed or residual risks are documented.
- Evidence artifacts are linked from the project map or quality-evidence report.

## Output Style

When working with the user, keep project-level status explicit:

- current mode
- active feature
- branch
- phase
- artifacts changed
- next gate

For clarification questions, present the question first, then options.
