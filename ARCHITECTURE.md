# Architecture & Design Philosophy

This document records the current architecture for Shiplight's spec-driven
quality system: what each layer owns, which artifacts are static versus
temporal, and how release decisions are derived.

It spans several repos. Keep it current when the boundaries move.

> This is the composition document, not an implementation guide.
> Individual skills explain how to do their job. This document explains how
> those jobs fit together.

## North star

The system is built around four distinct concerns:

1. **Structural definition**
   - Shared, reviewed, checked into git.
   - Same for everyone on the same commit.
   - Defines what the product is, what must be proven, and any human-authored
     guidance for how hard to push for proof.
2. **Observations**
   - Dynamic run outcomes from executing proofs in a context.
   - Different across developers, CI lanes, environments, and time.
3. **Evaluations**
   - Derived judgments produced from structural definition + observations.
   - Grounded on a specific subject, context, commit, and timestamp.
4. **Portfolio views**
   - Aggregated release and organizational views built from evaluations.

The key boundary:

- `project-map.yaml`, `quality-map.yaml`, and `quality-policy.yaml` are
  structural artifacts.
- Pass/fail state, freshness, and readiness are not authored into those files.
- They are derived from observations.

## Core vocabulary

| Term | Meaning |
| --- | --- |
| **Subject** | The thing being judged: feature, release area, project, or another named product slice. |
| **Expectation** | A product behavior, invariant, or quality promise that must be proven. |
| **Proof definition** | A structural declaration of what evidence counts and how it relates to an expectation. |
| **Observation** | The outcome of exercising a proof definition in a context at a point in time. |
| **Context** | A single stable label for where or why an observation was produced, for example `local`, `pr-ci`, `staging-gate`, or `prod-smoke`. |
| **Policy** | Human-authored proof-strategy guidance that steers `quality-evidence` on what kinds of proof to push for and how hard to push. |
| **Evaluation** | A derived judgment for a subject in a context at a commit and time. |
| **Readiness** | An evidence-based decision outcome derived from evaluations, not a field handwritten into a map. |

Use `subject` and `context` consistently:

- `subject` answers: "what are we judging?"
- `context` answers: "under which decision lane are we judging it?"

Do not overload `target` to mean both.

## The system at a glance

| Layer / actor | Repo | Role |
| --- | --- | --- |
| **Spec Kit** | `github/spec-kit` (upstream) | SDD engine. Turns intent into English artifacts such as `spec.md`, `plan.md`, and `tasks.md`. Gates the quality of those artifacts, not the built software. |
| **quality-project** | `internal-agent-skills` | Project-level orchestrator. Maintains `project-map.yaml`, release areas, feature graph, active feature selection, change classification, and brownfield reconstruction. |
| **quality-evidence** | `internal-agent-skills` | Per-feature proof-definition strategist. Defines what must be proven, reads proof-strategy guidance, maintains `quality-map.yaml` and `test-spec.md`, pushes producers to create evidence, and may export local observations when it runs checks. |
| **quality-center (skill)** | `internal-agent-skills` | Repo-scoped quality-improvement workflow. Wires `.quality-center/` observation sources, evaluation sets, and saved views; runs `quality-tools analyze`; triages generated recommendations across feature maps and delegates deep per-feature rework to `quality-evidence`. Agent-side counterpart of the Quality Center engine below. |
| **Producers** | mixed | Author and execute evidence: code-tied tests, `create-agent-tests`, `create-tests`, manual checks, telemetry queries, and similar mechanisms. |
| **Observation exporters** | mixed | Normalize raw producer outcomes into observation records keyed by evidence id, context, commit, and timestamp. |
| **Quality Center** | `quality-center` | Evaluation engine and portfolio judge. Ingests structural artifacts and observations, derives evidence-based evaluation snapshots with transparent built-in rules, and supports release decisions. |
| Supporting | both | `verify`, `code-review-run`, `auto-pr`, and project-specific CI workflows. |

## Traceability spine

Every artifact still descends from product intent, but the current design separates static truth
from dynamic results:

```text
PRD / roadmap         project intent
project-map.yaml      project graph + release graph
spec.md               feature truth          ── FR-### / SC-### ──┐
plan.md / tasks.md    execution contract                         │ derive
code                  implementation artifact                    │
quality-map.yaml      proof definition per feature ◄─────────────┘
quality-policy.yaml   proof-strategy guidance for authoring

proof execution in a context
        ↓
observations
        ↓
structural definition + observations
        ↓
evaluations
        ↓
Quality Center / release decisions / reports
```

The seam between the English-artifact world and the executable-evidence world
is still the feature expectation. What changed is where temporal state and
judgment live.

## End-to-end flow

```text
        ┌─────────────────────────── quality-project ───────────────────────────┐
        │                                                                          │
   PRD ─┤  Spec Kit: constitution → specify → plan → tasks → implement            │
        │              gates: checklist · analyze                                 │
        │                               │ spec FR/SC               │ code/tests   │
        │                               ▼                          ▼              │
        │  quality-evidence: expectations · risk · proof strategy · structural    │
        │  quality map · push producers                                            │
        │        │ delegates authoring                         │ writes            │
        │        ▼                                             ▼                   │
        │  ┌───────────────┬──────────────────┬──────────────┐  quality-map.yaml   │
        │  code-tied tests   create-agent-tests   create-tests  test-spec.md       │
        │  manual checks     telemetry queries    CI jobs                         │
        └───────────────────────────────────────────────────────────────────────────┘
                             ▲
                     quality-policy.yaml
                             │ authoring guidance
                             ▼
                      quality-evidence
                             │ execution / export
                             ▼
                         observations
                             │
                             ▼
                    Quality Center / evaluator
             (transparent derivation · evaluation · release readiness)
                             │
                             ▼
                   evaluation snapshots / reports / portfolio views
```

## Component boundaries

### 1. Structural definition

Structural artifacts are stable, reviewed, and commit-addressable.

They should answer:

- What product slices exist?
- What expectations must be proven?
- What evidence counts as proof?
- What human guidance should steer proof posture?

They must not answer:

- Did the proof pass today?
- Is the evidence fresh right now?
- Is the feature ready for staging at this moment?

#### `project-map.yaml`

Owns:

- project identity and summary
- release areas and feature graph
- feature dependencies
- canonical artifact paths
- cross-feature concerns
- policy/profile references for release areas or other subjects

Must not own:

- current pass/fail state
- current confidence
- freshness
- release readiness

#### `quality-map.yaml`

Owns:

- feature-scoped expectations
- risk weight and rationale
- proof definitions
- evidence metadata such as modality, depth, path, command, and reliability
- structural notes about missing or preferred proofs

Must not own time-sensitive run outcomes or derived readiness judgments.

`quality-map.yaml` defines the proof graph, not the current score.

#### `quality-policy.yaml`

Owns:

- project or team proof posture
- modality preferences and minimum proof floors
- guidance for which contexts matter for which kinds of checks
- required or preferred gating posture for higher-risk expectations
- project-specific overrides to the default testing strategy

Policy is static and checked in. It is primarily an authoring contract for
`quality-evidence`.

### 2. Observations

Observations are dynamic records created when a proof definition is exercised.

Each observation should be keyed strongly enough to answer:

- which evidence definition ran
- in which context
- for which commit or artifact version
- when it ran
- what happened
- where the supporting artifacts live

Examples:

- local unit run by a developer
- PR CI browser lane
- staging gate run
- production smoke run
- manual verification record
- telemetry query snapshot

Observations are not shared structural truth. Two developers on different
branches can have different local observations for the same structural map, and
that is expected.

Observations should be machine-generated whenever possible. Manual and telemetry
inputs still need normalized observation records.

### 3. Evaluations

Evaluations are derived snapshots, not authored facts.

An evaluation joins:

- structural definition
- one or more observations

An evaluation must always be grounded by:

- `subject`
- `context`
- `commit` or equivalent build identity
- `evaluated_at`
- references to the input observations

Evaluations can then produce:

- coverage status
- confidence
- freshness
- residual risk
- readiness / gate result
- actionable explanations for which gaps or failures drove the result

This is the level a release decision maker should read.

Evaluation is evidence-based and transparent. Quality Center may inspect
structural proof guidance to explain expected-versus-observed gaps, but the
system does not require a separate user-authored evaluation-policy artifact or
scoring DSL.

### 4. Portfolio views

Portfolio and release views are built from evaluation snapshots, not from
hand-authored map status fields.

These views support:

- feature readiness by context
- release-area readiness by context
- cross-feature risk concentration
- stale evaluation detection
- evidence gap prioritization
- go / no-go release decisions

## Ownership model

### Spec Kit

Owns product intent artifacts:

- `spec.md`
- `plan.md`
- `tasks.md`

It does not prove the built software works.

### quality-project

Owns the project graph and release graph:

- `project-map.yaml`
- feature breakdown
- release areas
- active feature coordination

It does not author run outcomes.

### quality-evidence

Owns per-feature proof-definition strategy:

- derive expectations from product truth
- pick proof posture
- maintain `quality-map.yaml`
- maintain `test-spec.md`
- push producers to author the needed evidence

It may export observations gathered during a session, but those observations are
session outputs, not canonical checked-in map fields.

### Producers

Own executable proof:

- unit, integration, contract, API, E2E, agent, manual, telemetry, static

Their job is to produce or execute proof and expose artifacts that can be
normalized into observations.

### Quality Center

Owns derived judgment and portfolio visibility:

- ingest structural maps and observations
- produce evaluations
- aggregate across features and release areas
- surface release decisions and adjustment levers

Quality Center is the judge, not the source of structural truth.

## File-as-interface

The layers exchange files, not runtime calls:

- `project-map.yaml`, `quality-map.yaml`, and `quality-policy.yaml` flow from
  authoring layers to the quality system.
- observations flow from producers and runners to evaluators.
- evaluations flow from evaluators to dashboards, reports, and release
  decision-makers.

Either side should remain usable without the others present:

- `quality-evidence` must stay standalone-safe when Quality Center is absent.
- Quality Center must be able to evaluate whatever structural artifacts and
  observations are available without invoking authoring tools directly.

## Core design principles

### 1. Static truth vs. dynamic truth

Do not commit time-sensitive state into structural maps.

If a fact changes because a new run happened, it belongs in an observation or an
evaluation, not in a checked-in proof-definition file.

### 2. One context dimension

Use one stable `context` label rather than splitting origin and environment into
multiple required axes.

Examples:

- `local`
- `pr-ci`
- `staging-gate`
- `prod-smoke`

If a project later needs richer decomposition, it can add metadata inside the
observation record. The primary evaluation key should still be a single context
id.

### 3. Proof definition is not proof outcome

Do not conflate:

- modality
- depth
- reliability
- result status

`reliability` is a property of the proof definition, not a fallback pass/fail
field.

### 4. Authoring policy is first-class

Evidence posture is not just "write more tests."

Human input is needed to steer `quality-evidence` on:

- where to spend expensive evidence budget
- which modalities to prefer
- what minimum proof floor high-risk checks require
- which contexts are important enough to pursue
- where defense-in-depth is expected

Without this guidance, proof-pushing becomes ad hoc and inconsistent.

### 5. Evaluation should be transparent, not policy-tuned

Quality Center should derive judgments from the visible structural proof graph
and the visible observation set.

Users should be able to inspect:

- which expectations exist
- which proofs were defined
- which observations passed or failed
- which gaps remain

Prefer explicit evidence and transparent built-in derivation rules over
score-tuning knobs.

### 6. Evaluation is contextual

There is no single globally meaningful current outcome snapshot for a feature.

Different questions require different contexts:

- "Is my branch locally healthy?"
- "Did the PR gate pass?"
- "Is staging ready for release?"
- "Did production smoke stay green after deploy?"

The system must answer those separately.

### 7. Release decisions must be replayable

A release decision should be explainable later from recorded inputs.

That means an evaluation snapshot must preserve:

- subject
- context
- commit
- evaluator version or derivation version
- observation references
- evaluated timestamp

### 8. Standalone-safe and brownfield-safe

The quality layer must still work in brownfield repos and partial-adoption
states:

- no Spec Kit required to start
- no Quality Center required to author structural maps
- no `quality-policy.yaml` required if a default policy exists

But partial adoption should degrade the certainty of evaluations, not blur the
boundaries between structural artifacts and temporal outputs.

## Artifact roles

| Artifact | Written by | Consumed by | Role |
| --- | --- | --- | --- |
| `spec.md` | Spec Kit / quality-project | quality-evidence | feature truth |
| `project-map.yaml` | quality-project | quality-evidence, Quality Center, dashboards | structural project and release graph |
| `quality-map.yaml` | quality-evidence | Quality Center, fix-prompts, review | structural proof-definition graph |
| `quality-policy.yaml` | maintainers / project owners / future tools | quality-evidence | structural proof-strategy guidance |
| observation records | producers / exporters / CI / local runs | Quality Center, reports | temporal proof outcomes |
| evaluation records | Quality Center / evaluator | dashboards, release decisions, reports | derived readiness snapshots |
| `test-spec.md` | quality-evidence | review, producers | durable testing contract |
| `test-report.md` | evaluator or export workflow | humans | human-readable evaluation snapshot for a subject and context |

## Brownfield onboarding

Brownfield remains first-class:

- reconstruct `project-map.yaml` from docs, code, trackers, and repo shape
- derive `quality-map.yaml` from accepted or provisional feature truth
- map existing tests and checks to proof definitions
- export observations from whatever runs already exist
- derive evaluations from the available evidence with explicit proof posture and
  explicit uncertainty

Brownfield reconstruction must not promote observed behavior to canonical truth
without ratification.
