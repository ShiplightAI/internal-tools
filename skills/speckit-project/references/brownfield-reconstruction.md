# Brownfield Reconstruction

Use this workflow when a repository did not previously use Spec Kit, or when
the existing product/spec history is incomplete.

## Principle

Existing code is observed behavior, not automatically product truth. The goal is
to build a provisional project graph, then ask the user to ratify it before
turning observations into authoritative specs.

If the repo already has specs but code changed outside the spec process, treat
that as drift, not as automatic truth. Identify the conflict and ask the user to
ratify whether the code behavior should update the spec or be changed back to
the spec.

## Operating Posture

Brownfield works best as a collaboration, not autonomous reconstruction:

- **User drives**: supplies intent sources (PRD/design-doc paths, tracker
  queries), sets scope and priority (where to start), and ratifies candidates.
- **Agent ingests**: reads docs, code, tests, and trackers; proposes candidate
  features; maps evidence; surfaces conflicts and open questions.

This runs **without Spec Kit installed**. Produce the provisional project map and
an initial `quality-evidence` pass first; install and `specify init` only after
the user decides to adopt Spec Kit. quality-evidence is the recommended
cold-start entry point because it runs standalone on existing code and tests.

## Discovery Sources

Read only what is needed to infer feature boundaries:

- `README*`, `docs/**`, `prd/**`, `requirements/**`, ADRs, release notes
- route/page/app structure
- API handlers, server actions, controllers, schemas, migrations, jobs
- package scripts and workspace layout
- tests: unit, contract, integration, E2E, YAML, agent, CI
- configuration: auth, billing, storage, deployment, feature flags
- runtime behavior through browser verification when needed
- external trackers the user points to — Jira, Linear, GitHub Issues — via an
  available MCP, an export/CSV, or pasted ticket text. Use the user's project
  key, team, or saved filter; do not crawl a whole tracker unprompted
- git history or issues only when relevant and available

Prefer `rg` and targeted file reads. Avoid broad context dumps.

## Reconstruction Steps

1. **Gather user-named sources and priority, then inventory**
   - Ask the user for intent sources (PRD/design-doc paths, tracker pointers) and
     the highest-value or highest-risk area to assess first.
   - Identify product names, actors, jobs, workflows, domains, and integration
     boundaries from those sources plus runtime surfaces.

2. **Group candidate features**
   - Cluster by user workflow, route/API boundary, domain model, or test suite.
   - Avoid one feature per file. A feature should be independently specifiable
     and verifiable.

3. **Assign provisional IDs**
   - Use existing numeric specs if present.
   - Otherwise assign stable `001-*`, `002-*` IDs in dependency order.
   - Mark status `candidate` until ratified.

4. **Record source types**
   - `SOURCE` for endorsed intent from PRDs, design docs, or accepted tracker
     items — but reconcile against code: a tracker item that contradicts current
     behavior is drift to decide, and a backlog or aspirational ticket is intent,
     not current behavior.
   - `IMPLEMENTATION` for code-backed behavior.
   - `INFERRED` for agent-derived feature boundaries.
   - `LEGACY` for behavior that appears old or compatibility-driven.

5. **Create provisional project map**
   - Use `.specify/project-map.yaml` or `project-map.yaml`.
   - Include product-language project, release area, and feature summaries plus
     docs, code refs, test refs, open questions, and orphan areas.

6. **Ask for ratification**
   - Present the feature list with source type and open questions.
   - Ask the user to accept, split, merge, rename, defer, or reject features.

7. **Backfill Speckit specs**
   - For ratified features, create `specs/NNN-feature-name/spec.md`.
   - Make clear which requirements are `SOURCE` and which are reconstructed
     from implementation.
   - Run clarify before plan/tasks if product behavior is underspecified.
   - Remove obsolete behavior from active specs when the user confirms a
     replacement. Use git history for history; use the project map only for
     optional `deprecated` or `superseded` traceability.

8. **Connect evidence**
   - Map existing tests to feature expectations through `quality-evidence`.
   - Mark missing evidence and residual risk instead of overclaiming.

## Candidate Feature Notes

For each candidate, capture:

- product goal or workflow promise
- observed routes/APIs/components/jobs
- data models or external systems
- existing tests
- likely dependencies
- open questions
- source type
- whether behavior seems current, legacy, or deprecated

## User Ratification Prompt Shape

When asking the user to ratify, keep it concrete:

```text
I found these candidate features:

001-authentication: IMPLEMENTATION
Evidence: app/login, auth middleware, login.spec.ts
Open question: Are SSO and password login both current requirements?

002-billing-dashboard: INFERRED
Evidence: billing route and fixtures, no tests
Open question: Is this an active product area or legacy admin-only UI?
```

Ask one to three focused questions at a time. Put the question first, then the
options.

## Safety Rules

- Do not rewrite large specs from code without user acceptance.
- Do not mark inferred behavior as required.
- Do not delete or deprecate observed features without user approval.
- Do not keep obsolete behavior in active specs after the user confirms it has
  been replaced.
- Do not run destructive commands.
- If runtime behavior and docs conflict, record the conflict in the project map
  and ask for a decision.
