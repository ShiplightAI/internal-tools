# Project Map Reference

Use the project map as the project-level graph that connects product intent,
feature specs, implementation artifacts, and evidence. It is an index and
traceability artifact, not a replacement for PRDs, specs, tasks, code, or
quality maps.

## Location

Preferred locations:

- `.specify/project-map.yaml` for Speckit-native projects.
- `project-map.yaml` when the repo or web UI expects a top-level visible file.

If both exist, ask which is canonical or keep the `.specify` file canonical and
the root file generated. Do not let two divergent maps evolve silently.

## Source Hierarchy

Maintain this authority model:

```text
PRD / roadmap: project intent
project-map.yaml: project graph and traceability
spec.md: feature truth
plan.md / tasks.md: execution contract
code: implementation artifact
tests / reports / reviews: evidence
```

Specs are current snapshots of accepted behavior, not changelogs. Git history
records history. When a newer feature replaces older behavior, remove the old
behavior from the active spec and optionally mark it `deprecated` or
`superseded` in the project map.

## Active Feature

`active_feature` is current working state, not roadmap truth. It answers:

```text
Which feature should project-level and Speckit commands operate on now?
```

Keep it aligned with:

- current git branch
- `.specify/feature.json`
- `AGENTS.md` Speckit pointer
- selected feature entry in the map

Durable status belongs on `features[*].status`; `active_feature.phase` can
change frequently during a work session.

## Suggested Schema

Use `assets/project-map.template.yaml` for new maps. Keep fields stable and add
project-specific fields only when they have a clear consumer.

Important fields:

- `project`: identity and source docs.
- `product_docs`: PRD, roadmap, architecture docs, release notes.
- `roadmap`: milestones and feature order.
- `active_feature`: current working pointer.
- `features`: numbered feature graph.
- `cross_feature_concerns`: shared risks, constraints, and architecture seams.
- `discovery`: brownfield inference metadata, if applicable.

## Feature Entry Semantics

Each feature should include:

- stable `id`, `name`, `status`, and `priority`
- `source_type` and `confidence`
- `dependencies`
- links to PRD/roadmap/spec/plan/tasks/checklists
- code references owned or primarily touched by the feature
- evidence references, including quality-evidence reports
- open questions and residual risks

Use concise refs. Do not paste whole specs into the map.

## Status Values

Recommended feature status values:

- `candidate`: proposed but not ratified.
- `planned`: accepted roadmap item.
- `specified`: spec exists and requirements are mostly clear.
- `designed`: plan/contracts/data model exist.
- `tasked`: tasks exist and analyze issues are resolved or documented.
- `implementing`: code work in progress.
- `implemented`: code complete for accepted scope.
- `verified`: tests/verification complete enough for review.
- `reviewed`: code review completed with no critical/high blockers.
- `done`: feature accepted for the current release boundary.
- `blocked`: cannot progress without user or external state.
- `deferred`: intentionally postponed.
- `deprecated`: obsolete and retained only for history.

Recommended active feature phases:

- `specify`
- `clarify`
- `plan`
- `tasks`
- `analyze`
- `implement`
- `verify`
- `quality-evidence`
- `code-review`
- `release`

## Confidence Values

Use confidence to avoid overclaiming:

- `HIGH`: directly supported by explicit source docs or user decisions.
- `MEDIUM`: supported by strong implementation/test evidence but not yet
  directly ratified.
- `LOW`: weakly inferred from partial docs, filenames, or behavior.
- `UNKNOWN`: not enough evidence to judge.

## Source Types

- `SOURCE`: explicit PRD/spec/user decision.
- `IMPLEMENTATION`: observed from current code or runtime behavior.
- `INFERRED`: derived by the agent from patterns.
- `LEGACY`: existing behavior that may need preservation but lacks endorsement.
- `DEPRECATED`: known old behavior.

Never convert non-`SOURCE` facts to `SOURCE` without a user decision or accepted
project document.

## Drift And Gap Tracking

Use the map to surface:

- orphan code with no feature/spec mapping
- specs with no implementation
- implementation behavior missing from specs
- tests asserting behavior missing from specs
- features with no evidence
- stale quality-evidence reports
- changed code without updated specs
- release blockers and unresolved cross-feature concerns

Keep drift entries short and actionable.

When drift affects product semantics and the correct intent is unclear, ask the
user to decide. Do not silently treat code as truth over specs.
