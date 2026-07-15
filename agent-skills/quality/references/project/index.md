# project — Build/maintain the project map

The `project` subcommand of the `/quality` skill: construct and maintain the
project map (`project-map.yaml`) and read the project's quality scores with their
structure-confidence gate.

## Read first

- `_shared/independence.md`
- `_shared/layout.md`

Project-level map construction. Use this to build or repair `project-map.yaml`,
group features into release areas, classify and record incoming change,
reconstruct features from an existing codebase, surface cross-feature drift, and
read the project's quality scores with their structure-confidence gate.

This is the **`project` subcommand of the `/quality` skill**. It reads the
artifacts that development produces and constructs the map; it does not generate them:

- It does **not** drive development, write the PRD, the feature breakdown, or
  specs, or switch branches — that is `speckit-project` (development bundle).
- It does **not** create tests or pick testing strategy — that is
  `/shiplight cover`.
- It does **not** build per-feature `quality-map.yaml` — that is the `evidence`
  subcommand.
- It does **not** wire observations — that is the `analyze` subcommand.

It reads what those skills produce and keeps `project-map.yaml` aligned. When the
request is to drive development, hand off to `speckit-project`.

## What This Skill Constructs

`project-map.yaml` (at `.quality/project-map.yaml`): project identity,
release areas, the feature graph and dependencies, canonical artifact paths,
cross-feature concerns, source types, and the `active_feature` pointer (reflected
from the dev branch/pointers). It links to each feature's
`.quality/evidence/<feature>/quality-map.yaml`; it does **not** produce a
project-scope quality map. It owns no run outcomes — pass/fail,
freshness, and readiness are derived from observations.

## Default Invocation

When invoked without a specific request, run a non-mutating status pass: read
`project-map.yaml`, the branch and active-feature pointers, and recent
evidence/review artifacts; report the active feature, phase, traceability gaps
(orphan code, specs without implementation, evidence gaps, stale entries), and
the next gate. Do not create or edit files unless asked.

## Backbone And Construction

The project-map and the per-feature quality-maps are the stable **backbone** —
fixed-shape data structures that downstream tools (the `quality-tools` scoring
engine, runtime join, the Quality Center dashboards) read regardless of where
their content came from. How the
backbone gets populated is **construction**, and it is the same path everywhere —
only the confidence differs:

- **Spec-driven construction**: features come from the PRD, the feature
  breakdown, and specs. Map facts are `SOURCE`; the feature's quality-map is
  authored `structure_provenance: spec`/`user_authored`. High structure
  confidence.
- **Brownfield construction**: features are reconstructed from existing code,
  docs, tests, and trackers. Map facts are `IMPLEMENTATION`/`INFERRED`/`LEGACY`;
  quality-maps are `inferred_brownfield` until a human validates them. Low
  structure confidence until ratified.

Construction is continuous reconciliation, not a one-time bootstrap: the same
step keeps the backbone aligned as code, specs, tickets, and evidence change. A
single project may mix constructors — some features spec-driven, some
reconstructed — because provenance is per artifact, not per project. Spec-driven
development (via `speckit-project`) is one optional constructor, not a
prerequisite.

`structure_provenance` is the join key for the **structure confidence** score,
exactly as `evidence.path` is the join key for runtime
review. It is owned by the `evidence` subcommand per feature; this skill drives *when*
construction and ratification happen across the project, and records the matching
project-map facts.

## Source Types

Use consistently in the project map:

- `SOURCE`: explicit user, PRD, roadmap, spec, or accepted decision.
- `IMPLEMENTATION`: observed from current code or runtime.
- `INFERRED`: agent-derived from patterns, filenames, tests, or partial docs.
- `LEGACY`: existing behavior preserved but not yet endorsed.
- `DEPRECATED`: intentionally obsolete.

Do not promote `IMPLEMENTATION`/`INFERRED`/`LEGACY` to `SOURCE` without a clear
user decision or accepted document.

## Recording Change Classification

Development classifies incoming work (new feature vs cross-cutting) to decide
branching; this skill records the result in the project map:

- **New feature**: add a feature entry with its declared priority, dependencies,
  and artifact paths once `speckit-project` creates it.
- **Cross-cutting change**: do **not** add a new feature entry. Record the
  touched feature IDs and any residual risk on the existing entries. A single
  change may touch several features — list them and reconcile their index entries
  together.

## Brownfield Reconstruction

Use when constructing the map from a repo that did not use Spec Kit. Runs
read-only without Spec Kit installed.

Posture: **user-driven + agent-ingest.** The user supplies intent pointers (PRD
links, tracker queries, priorities) and ratifies; the agent ingests docs, code,
tests, and trackers, proposes candidate features, and records source types. Do
not autonomously reconstruct a whole repo without the user steering scope and
priority.

1. Read `brownfield-reconstruction.md`.
2. Ask for intent sources and where to start (highest-value or highest-risk
   area first).
3. Discover docs, routes, APIs, schemas, jobs, tests, CI, runtime behavior, and
   named trackers.
4. Group observed behavior into candidate features; record source types; mark
   status `candidate` until ratified.
5. Create a provisional project map; trigger the `evidence` subcommand on the
   priority area for an initial confidence pass.
6. Ask the user to ratify feature boundaries before treating them as product
   truth.
7. Only after ratification and an explicit decision to adopt Spec Kit, hand off
   to `speckit-project` to install/`specify init` and backfill specs.

## Project Map Maintenance

Read `project-map.md` before creating or significantly changing a map.
`assets/project-map.template.yaml` is the single source of truth for shape.

- Record product-language project, release-area, feature, and concern summaries
  alongside feature IDs, statuses, dependencies, source refs, spec paths, code
  refs, evidence refs, and residual risks.
- When the repo's testing strategy lives in a dev-owned file (`TESTING.md`),
  reference it from the project; do not author the strategy here.
- Use `roadmap.release_areas` for product-language groups of features judged
  together for readiness — not directories, scopes, branches, or deploy gates
  unless the project says so.
- Keep `active_feature` aligned with the dev branch and Spec Kit pointers (read
  from `speckit-project`'s pointers; this skill reflects, it does not switch
  branches).
- Use stable IDs; do not renumber without explicit approval.
- Surface orphan code, specs without implementation, implementation not in spec,
  evidence gaps, stale reports, and cross-feature drift. Resolving a single
  feature's drift is `speckit-project`'s job; surfacing it across the project is
  this skill's.

Status pass is read-only unless the user asks to fix artifacts. Branch, release,
PR, and merge operations require an explicit user request or `auto-pr`.

## Quality And Release Gates

The project map links to each feature's quality map; project-level quality is an
aggregate of those maps. The `quality-tools` engine reports four scores over the
aggregate (quality, coverage, evidence confidence, structure confidence), shown side by
side and never blended — the `analyze` subcommand owns the full model.

This skill owns the feature-level ratification gates that feed **structure
confidence** — feature `status` (gate 2) and `priority_provenance` (gate 3) — part
of the human-gated axis no automated command can move. The per-map
`structure_provenance` (gate 1) and map-level `checks_reviewed` (gate 4) are owned by
the `evidence` subcommand; the engine joins all four. See `_shared/independence.md` →
"Structure confidence: the ratification gates".

- **Raise structure confidence — this skill's gates.** Construct and *ratify* the
  backbone: propose features, checks, and priorities, then have the owner validate
  them. This skill's own gates are per-feature: ratify a `candidate` feature's
  `status` and mark `priority_provenance: human` once a person sets the priority. It
  also drives *when* per-feature `structure_provenance` climbs
  `inferred_brownfield` → `agent_generated` → `user_authored`/`spec` (that field
  itself is owned by the `evidence` subcommand). The heaviest work in a brownfield
  project. Never let an agent ratify on the owner's behalf to make the number rise.
- **The other three are delegated and agent-automatable**: coverage and evidence
  confidence through `/shiplight cover` (create tests) and the `evidence`
  subcommand (map them, `fix-prompts`); the runtime quality score through the
  `analyze` subcommand.

Do not report a feature as done in the project map unless its spec/tasks are
reconciled, implementation is complete for the accepted scope, relevant tests
passed or residual risks are documented, and evidence is linked from the project
map. Verification and code review are themselves development-workflow steps that
`speckit-project` sequences; this skill records their outcomes in the project map, it
does not run them.

## When Not To Use

- When the user wants to drive development, write a PRD/feature breakdown, or run
  the spec lifecycle: use `speckit-project`.
- When the user wants tests created: use `/shiplight cover`.
- When the user wants one feature's quality map/scores: use the `evidence`
  subcommand.
- When the user wants runtime-review wiring, observation sets, or saved views: use
  the `analyze` subcommand.
