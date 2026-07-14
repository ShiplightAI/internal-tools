# evidence — Build/maintain a feature's quality map

The `evidence` subcommand of the `/quality` router. Constructs and maintains one
feature's quality map (`quality-map.yaml`) from existing artifacts so the
`quality-tools` engine can score coverage, evidence confidence, and structure
confidence.

## Read first

- `_shared/independence.md`
- `_shared/layout.md`
- `_shared/vocabularies.md`

Quality-map construction for one feature, spec, module, PR, or ticket at a
time. Use when the user wants a trustworthy `quality-map.yaml` for a feature —
the right set of quality checks, each with its declared priority, its proof
mapped as evidence, honest structure provenance, and concrete proof gaps — so
the `quality-tools` engine can score coverage, evidence confidence, and structure
confidence.

This is the `evidence` subcommand of the `/quality` skill. It reads facts and
constructs the map; it does not generate them:

- It does **not** create tests or pick testing strategy — that is `/shiplight
  cover`. This subcommand reads the test-spec, the test-report, and the actual
  test files and indexes what exists.
- It does **not** wire observations, observation sets, saved views, or run
  `@shiplightai/quality-tools analyze` — that is the `analyze` subcommand.
- It does **not** author `.quality/project-map.yaml` — that is the
  `project` subcommand.

Project-wide quality improvement across many feature maps belongs to the
`analyze` subcommand. When the request is about overall project quality rather
than one feature's map, use that mode.

## What This Skill Constructs

Per target, at `.quality/evidence/<target-slug>/quality-map.yaml`: the structural
proof-definition graph — the quality checks (`expectations`), each carrying a
declared `priority`, evidence rows (`type` + `path`), `structure_provenance`,
and `proof_gap` guidance. It is structural only: no run outcomes, timestamps,
freshness, or confidence rollups (those are observations/evaluations).

It does **not** author `test-spec.md` / `test-report.md` (owned by
`/shiplight cover`, in `specs/<feature>/`), the dev-owned testing strategy
(`TESTING.md`), `.quality/project-map.yaml` (owned by the `project`
subcommand), or `.quality/config/*` and `.quality/generated/*`
(owned by the `analyze` subcommand).

## Inputs, Facts, And Independence

Build the map from whatever facts exist — `specs/<feature>/test-spec.md` (the
testing-what and each behavior's declared priority), `specs/<feature>/test-report.md`
(the test types written and session results), the actual test files, code,
schemas, routes, and CI, and the PRD/spec for declared priorities. Construction
is the same path whether spec-driven or brownfield; only the confidence differs —
spec-driven inputs yield high structure confidence, inference from code/tests
alone starts `inferred_brownfield` until a human ratifies it.

This skill **records two facts and derives scores from them; it authors no
judgments**, and it verifies facts rather than copying the dev session's claims:

- **`priority` (P0–P3)** — read from the declaring artifact (PRD, feature
  breakdown, spec, or per-behavior test-spec), never invented. Mark `UNKNOWN`
  when nothing declares it; do not guess. It is the importance signal — there is
  no 1–5 risk weight — and its trust rides on `structure_provenance`.
- **Evidence `type`** — a fact about each proof artifact, confirmed against the
  artifact at `evidence.path` (a Shiplight YAML is `e2e`, a `/shiplight
  create-agent-verification` case is `agent`, a `*.test.ts` with no browser is
  `unit`), not copied from the
  report's self-label. Evidence confidence is **derived from type** by a
  transparent rubric (manual < single automated < direct automated + gate); do
  not author `depth`, `reliability`, or a `HIGH/MEDIUM/LOW` verdict — flakiness,
  staleness, and pass/fail come from runtime observations joined on `path`.

## Target Slug Naming

Use stable `NNN-kebab-case-name` slugs so specs, tasks, maps, reports, tests,
and UI routes join reliably. If `specs/NNN-feature-name` exists, the default
index target is `.quality/evidence/NNN-feature-name/`. Reuse an existing numeric
prefix; never drop `NNN-`. Mint a new slug only for a genuine feature or spec,
never to host project-wide or multi-feature work. Preserve old slugs under
`target.aliases`.

## Quality Map

Maintain `quality-map.yaml` around quality checks, not test files. Checks live
under `expectations`. Each should include:

- Stable check id and title (product language).
- Source type: `SOURCE`, `IMPLEMENTATION`, or `INFERRED`.
- Source references to specs, PRDs, issues, code, docs, or user input.
- Category and `priority` (read as a fact from the declaring artifact).
- Related implementation tasks when available.
- Evidence rows: schema-valid `type` at a `path` (+ optional `test_case`,
  `contexts`), the type confirmed against the artifact.
- Optional `proof_gap` describing what proof is still missing and what to add
  next.

Keep the map structural: proof definitions, declared priority, and proof gaps
belong here; run outcomes and derived judgments do not. Preserve stable ids so
downstream observation and evaluation systems can join on them. Copy
`assets/quality-map.template.yaml` for new maps and validate against
`assets/quality-map.schema.json`.

## Unit Test Evidence

Treat unit tests as code-level evidence by default. They can be strong primary
evidence only when the check itself is confined to a small deterministic
implementation contract with no meaningful dependency on runtime wiring,
external state, integration behavior, or user workflow. Examples include pure
parsing or formatting rules, schema validation, deterministic serialization,
local routing decisions, and narrow safety guards.

For product-facing workflows or boundary-spanning claims, unit tests may support
the check but should not close it alone. This includes, but is not limited to,
claims whose correctness depends on integration between components, user or
runtime state, external systems, persistence, permissions, transport/protocol
behavior, browser or CLI execution, deployment wiring, or release gates.

## Structure Provenance And Structure Confidence

Declare `structure_provenance` at the top of `quality-map.yaml` (and optionally
per check) so the `quality-tools` engine can report **structure confidence** — how much the
map's structure (its set of checks *and their priorities*) can be trusted — as a
separate axis from evidence confidence. Evidence confidence asks "is each check
proven?"; structure confidence asks "is this the right set of checks at the
right priorities, and where did it come from?". The two are reported side by
side and never blended.

Choose the value honestly from how the check list was actually produced:

- `spec` — derived from a written spec/PRD/Speckit artifact.
- `user_authored` — a human defined the checks directly.
- `agent_generated` — an agent produced the checks and a human reviewed them.
- `inferred_brownfield` — reconstructed from existing code/tests after the fact,
  not yet validated against intended requirements.
- `unspecified` — origin undeclared; the default. Scores 0 and is counted in the
  structure-confidence denominator (it is the human anchor — unattested structure
  earns no trust), so declare an honest value to lift it.

Rules:

- Set the map-level value on every map you author or repair; add a per-check
  value only for genuine exceptions.
- Prefer an honest `unspecified` over a guessed origin. A wrong `spec` lies that
  the structure is trustworthy.
- Never infer provenance from heuristics (git dates, whether a spec file exists)
  and record it as declared.

Raising structure confidence is a **ratification ladder**, not an agent edit:
`inferred_brownfield` → `agent_generated` (an agent produced the checks and a
human reviewed them) → `user_authored` / `spec`. The agent may author at
`inferred_brownfield` and *propose* checks and priorities, but must not record
`agent_generated` until a human has reviewed the list, nor `user_authored`/`spec`
without genuine human authorship or an accepted spec. Surface the unratified
checks — highest-priority first — for that review. Promotion is the per-feature
action that raises structure confidence, and it is always human-gated; no test
and no `fix-prompts` run can raise it. Mapping more proof and stronger types
raises coverage and evidence confidence, reported beside structure confidence
and never substituting for it.

This map-level `structure_provenance` is **gate 1** of the three ratification
gates that feed structure confidence; the feature-level gates — feature `status`
and `priority_provenance` in `project-map.yaml` — are owned by the `project`
subcommand, and the engine joins all three. See `_shared/independence.md` →
"Structure confidence: the three ratification gates".

## Runtime Join Contract

The canonical interface between feature quality maps and observations. The
`analyze` subcommand's observation adapters consume it; evidence authored here
must honor it:

- `evidence.path` is the canonical proof-source identity. Prefer stable
  repo-relative paths aligned with emitted artifact paths.
- `evidence.test_case` is an optional pin within that path. Matching is
  whitespace-trimmed and case-insensitive.
- Evidence without `test_case` is file-level and matches any observed test case
  for the same path; evidence with `test_case` matches only that test case.
- Do not mix pinned and unpinned rows for the same path.
- Standard adapters populate the observed side from their native report: JUnit
  uses testcase file + name, Playwright JSON uses spec file + title, manifest
  records use `test_file` + `test_case`.

## Smoke And Health Checks As Evidence

Many release gates are smoke/health checks that run in CI but are not test files.
They are valid runtime evidence. Author the map side: set `path` to the workflow
file that wires the gate and `test_case` to the unit being proven (the workflow
step, or a finer check name). Choose a schema-valid evidence `type` and validate.
When no parseable report exists yet, record the missing runtime backing as a
`proof_gap` — a legitimate gap, not an error — and hand the workflow-emit step
and observation source to the `analyze` subcommand. Do not record run outcomes
in the map.

## Product-Language Check Writing

Dashboards render `title`, `description`, `proof_gap.summary`, and
`proof_gap.next_step` directly, so write those as product-language summaries.
Use the schema; do not add free-form keys.

- `title`: name the product behavior or quality promise the check proves — not a
  command, artifact, or test file.
- `description`: explain what the check proves and which feature behavior or
  release confidence it affects.
- `proof_gap.summary`: describe only the structural proof gap or current
  limitation. Put run history in observation artifacts.
- `proof_gap.next_step`: the highest-value proof to add next, or omit `proof_gap`
  if there is no open gap.

Keep `SOURCE` product promises, `IMPLEMENTATION`-observed checks, and `INFERRED`
checks visibly distinct in title and description. Keep any documentation-baseline
check compact and secondary — do not let it carry the feature's coverage story.

## Generate Fix Prompts

Invocation shortcut: `fix-prompts`. Interpret `evidence fix-prompts` as:

```bash
npx @shiplightai/quality-tools fix-prompts \
  --project-path <repo-root> \
  --target <target-id> \
  --output .quality/fix-prompts.md
```

Accept script-style options after the shortcut (e.g. `--target 026-... --limit
10`). Use the package command; do not write a custom generator. Repo-wide
fix-prompt generation across all maps is documented in the `analyze` subcommand.
Fix-prompts that require *creating* tests are executed by `/shiplight cover`
and the producers; this subcommand records the resulting evidence back into the
map.

## Workflow

1. **Resolve target.** A single feature/spec slug. If the request has no single
   target ("improve quality across the repo", "act on recommendations"), hand
   off to the `analyze` subcommand.
2. **Gather inputs.** Read `test-spec.md`, `test-report.md`, the test files,
   code, CI config, and the PRD/spec for declared priorities. Record what was
   found and what was missing.
3. **Construct expectations.** Enumerate the quality checks; carry each check's
   `priority` (read, not invented — mark `UNKNOWN` if undeclared) and set
   `source_type`.
4. **Map evidence.** For each check, add evidence rows of `type` + `path`,
   confirming the type against the artifact. Honor the Runtime Join Contract.
   Record `proof_gap` where proof is missing or weak.
5. **Set provenance.** Set `structure_provenance` honestly. Surface unratified,
   highest-priority checks for human ratification.
6. **Validate.** Validate against `assets/quality-map.schema.json`. Keep the map
   structural — no run outcomes or rollups.
7. **Optional runtime hand-off.** When the user wants observations, hand the
   `.quality/config/*` wiring to the `analyze` subcommand; this
   subcommand's contribution is the map side (evidence `path`/`test_case` and
   proof gaps).

## Artifact Skeletons

| Artifact | Template | Schema |
| --- | --- | --- |
| `.quality/evidence/<target>/quality-map.yaml` | `assets/quality-map.template.yaml` | `assets/quality-map.schema.json` |

Map-side vocabularies (and what is owned elsewhere) live in
`_shared/vocabularies.md`. For `test-spec.md` / `test-report.md` see `/shiplight
cover`; for `.quality/config/*` see the `analyze` subcommand.

## Operating Rules

- Constructs and edits `.quality/evidence/**` only (the `analyze`
  subcommand may also apply contract-conformant join-key/`proof_gap` fixes there).
  Does not create tests,
  author `test-spec.md`/`test-report.md` (dev-owned, in `specs/<feature>/`),
  author `.quality/project-map.yaml`, or touch the rest of
  `.quality/**` (config and generated output, owned by the `analyze`
  subcommand).
- Never author `depth`, `reliability`, a risk weight, or a `HIGH/MEDIUM/LOW`
  verdict; `priority` and evidence `type` are read/confirmed facts (see Inputs,
  Facts, And Independence), never invented.
- Never self-promote `structure_provenance`; ratification is human-gated.
- Keep `quality-map.yaml` structural: preserve ids, use schema enums, no run
  state, timestamps, freshness, or confidence rollups.
- Never report pass/fail without command output or an auditable observation.

## When Not To Use

- When the user wants tests created or a testing strategy chosen: use
  `/shiplight cover`.
- When the user wants project-wide quality, runtime-review wiring, evaluation
  sets, saved views, or recommendation-driven work: use the `analyze`
  subcommand.
- When the user wants project orchestration or a project map: use
  `speckit-project` (dev) or the `project` subcommand (index).
- When the user only wants a code review with no index construction.
