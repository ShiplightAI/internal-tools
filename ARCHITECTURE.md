# Architecture & Design Philosophy

This document records the global design behind Shiplight's spec-driven quality
system — how the pieces fit, who owns what, and *why* the boundaries are where
they are. It spans several repos; keep it current when the boundaries move.

> This is the "so we don't forget" document. Individual skills describe *how* to
> do their job; this describes *how the jobs compose*.

## The system at a glance

| Layer / actor | Repo | Role |
| --- | --- | --- |
| **Spec Kit** | `github/spec-kit` (upstream) | SDD engine. Turns intent into English artifacts (spec → plan → tasks) and gates their *quality* (`checklist`, `analyze`). Stops at "artifacts are coherent enough to build." |
| **speckit-project** | `internal-agent-skills` | Project-level orchestrator. PRD/roadmap, `project-map.yaml` traceability, feature breakdown, active-feature selection, brownfield reconstruction. Sequences Spec Kit → verify → quality-evidence → review. |
| **quality-evidence** | `internal-agent-skills` | Per-feature quality **ledger / strategist / pusher / exporter**. Defines what must be proven, risk-weights it, picks the testing strategy within budget, pushes producers to author evidence, records it in `quality-map.yaml`, writes confidence reports. |
| **Producers** | mixed (see below) | Author executable evidence. Code-tied tests, `create-agent-tests`, `create-tests` (e2e), manual/telemetry. |
| **Quality Center** | `quality-center` | Cross-feature **judge / aggregator**. Ingests the maps, scores and weights features, supports review and adjustment, and produces the portfolio view for release go/no-go decisions. |
| Supporting | both | `verify`, `code-review-run`, `auto-pr`. |

## The traceability spine

Every artifact descends from product intent and traces back to it (the
`speckit-project` backbone):

```text
PRD / roadmap        project intent
project-map.yaml     project graph + traceability
spec.md              feature truth        ── FR-### / SC-### ──┐
plan.md / tasks.md   execution contract                       │ derive
code                 implementation artifact                  │
quality-map.yaml     evidence + confidence  ◄── quality checks ┘
test-report.md       user-facing confidence report
```

Quality checks in `quality-map.yaml` derive from the spec's functional
requirements (FR-###) and *buildable* success criteria (SC-###). That FR/SC link
is the seam between the English-artifact world and the executable-evidence world.

## End-to-end flow

```text
        ┌─────────────────────────── speckit-project (orchestrator) ───────────────────────────┐
        │                                                                                       │
   PRD ─┤  Spec Kit:  constitution → specify → plan → tasks → implement                         │
        │             gates: checklist (requirements quality) · analyze (cross-artifact)        │
        │                              │ spec FR/SC                          │ code              │
        │                              ▼                                     ▼                   │
        │  quality-evidence (per feature): what must be proven · risk weight · strategy ·        │
        │     push producers · record evidence · feature-level confidence                        │
        │        │ delegates authoring                         │ writes                          │
        │        ▼                                             ▼                                 │
        │  ┌───────────────┬──────────────────┬──────────────┐  quality-map.yaml ──┐             │
        │  code-tied tests   create-agent-tests   create-tests   test-report.md     │ flows up    │
        │  (unit/integ/      (agent tests,        (codified e2e)                    │             │
        │   contract/api)     live-env)            Shiplight YAML)                  ▼             │
        └───────────────────────────────────────────────────────────────► Quality Center ───────┘
                                                                            (score · weight ·
            quality-policy.yaml ◄──────────────────────────────────────────  release decisions)
                            flows down (deferred: 4b)
```

## Core design principles

These are the reusable ideas. When in doubt, conform to them.

### 1. English artifacts vs. executable evidence
Spec Kit's quality gates validate *requirements* — `checklist` is "unit tests for
English" (is the spec well-written?) and `analyze` is cross-artifact consistency.
They never prove the built software works. That second job — risk-weighted,
executable proof — is the quality layer (`quality-evidence` + producers +
Quality Center). The two worlds meet at FR/SC.

### 2. Ledger / producers / judge
Three jobs, kept separate:
- **Ledger / strategist** (`quality-evidence`) decides what to prove, picks the
  cheapest capable strategy, pushes for evidence, and records it. It does **not**
  author specialized tests and does **not** score across features.
- **Producers** author evidence and hand back a normalized evidence record.
- **Judge** (`quality-center`) aggregates and scores across features to support
  release go/no-go decisions.

The smell that drove this split: agent-test authoring once lived *inside*
quality-evidence while e2e had its own skill. Producers are now symmetric.

### 3. The feature line
The dividing line between `quality-evidence` and `quality-center` is the feature
boundary:
- **Within a feature** (per-check evaluation *and* the feature-level rollup:
  `overall_status`, `overall_confidence`, `weighted_confidence`) → quality-evidence.
  It owns this because per-check judgment requires having read the check, the
  tests, and the code — context a static aggregator cannot reconstruct.
- **Across features** (aggregating feature scores, weighting feature vs. feature,
  thresholds, release go/no-go, and weight adjustment) → quality-center.

### 4. File-as-interface (no runtime coupling)
The two systems exchange files, not calls:
- `quality-map.yaml` **flows up** — quality-evidence writes, quality-center reads (facts).
- `quality-policy.yaml` **flows down** — quality-center writes, quality-evidence reads (control). *(deferred: 4b)*

Either side runs without the other present.

### 5. Convention-with-override (everywhere)
The same pattern recurs: a producer proposes an expert default grounded in local
understanding; a higher layer overrides it with business priority.
- **risk weight** — quality-evidence proposes intrinsic severity → Quality Center re-weights for release priority.
- **testing posture** — baked-in `default-quality-policy.md` → project `quality-policy.yaml` → per-expectation override in the map (first match wins).
- **templates** — Spec Kit's project override → preset → core default.

### 6. Testing economics, not test count
Optimize **justified confidence per unit of cost**. Cheap tests are narrow;
expensive tests are thorough. Pick the cheapest modality *capable* of proving a
check; ration the expensive budget (e2e, agent) by risk. Guardrails:
**capability-before-cost**, **risk sets a floor / budget flexes only the
ceiling**, **defense-in-depth at the top**. Floors that budget can never
undercut: unit coverage on core/changed logic, and ≥1 gate on every
release-critical check. Full guideline:
[`skills/quality-evidence/assets/default-quality-policy.md`](./skills/quality-evidence/assets/default-quality-policy.md)
(placeholder — revisit with real examples).

### 7. Evidence has three axes
Don't conflate them:
- **Modality** — unit / contract / integration / e2e / agent / manual / telemetry / static.
- **Depth** (directness) — DIRECT / INDIRECT / STATIC / IMPLICIT / MISSING / BLOCKED.
- **Reliability** (determinism) — STRONG / MODERATE / WEAK / FLAKY.

Manual and agent tests are *observed/judgment* proofs: they can be DIRECT on a
behavior but rank lower on reliability. Behavioral proof hardens along a ladder
of rising determinism: **manual → agent test → codified e2e**. Promotion =
walking right along it.

### 8. Standalone-safe / Speckit-aware-not-dependent
Each layer degrades gracefully. quality-evidence works on a brownfield repo with
no Spec Kit spec (marking checks `INFERRED`/`IMPLEMENTATION`), and with no
`quality-policy.yaml` (falling back to the baked-in default). Nothing in the
quality layer may *require* Spec Kit or Quality Center to function.

## The producer trichotomy

Not all evidence is authored the same way:

| Bucket | Modalities | Authoring | Home |
| --- | --- | --- | --- |
| **Engine producers** | agent, e2e | specialized skill | `create-agent-tests`, `create-tests` (public `agent-skills`) |
| **Generic-authored** | unit, integration, contract, api | base coding agent + native framework | *no skill* — strategy & pushing governed by quality-evidence |
| **Recorded-only** | manual, telemetry, static | not authored | recorded into the map by quality-evidence |

## Key artifacts

| Artifact | Written by | Consumed by | Purpose |
| --- | --- | --- | --- |
| `spec.md` (FR/SC) | Spec Kit / speckit-project | quality-evidence | feature truth; source of quality checks |
| `project-map.yaml` | speckit-project | speckit-project, dashboards | project graph + traceability |
| `quality-map.yaml` | quality-evidence | quality-center, fix-prompts | per-feature evidence graph + confidence (release signal) |
| `test-spec.md` | quality-evidence | quality-evidence, review | durable "testing what" contract |
| `test-report.md` | quality-evidence | release go/no-go, gap-fixing | user-facing confidence report: overview (release decision) + detail (gaps to fix) |
| `default-quality-policy.md` | (maintainers) | quality-evidence | baked-in testing strategy |
| `quality-policy.yaml` | quality-center *(deferred)* | quality-evidence | per-project testing posture override |

## Design state — done / dropped / deferred

| Item | State |
| --- | --- |
| Extract agent-test authoring into `create-agent-tests` (sibling to `create-tests`) | **done** |
| Slim quality-evidence to ledger/strategist/exporter | **done** |
| Testing strategy + budget policy + pusher wired into quality-evidence | **done** |
| `default-quality-policy.md` baked-in default | **done (placeholder — revisit with real examples)** |
| Schema-ownership split of map scoring fields | **dropped** — quality-evidence keeps per-feature scoring; the feature line settles it |
| Quality Center writes `quality-policy.yaml` (policy-authoring UI) | **deferred (4b)** |
| Shared agent⇄e2e behavioral-intent format + promotion path | **deferred (5)** |

When revisiting the deferred items, the open questions are: `quality-policy.yaml`
granularity (global + per-category + per-expectation), and where the shared
behavioral-intent lives (Spec Kit `specs/tests/`, quality-evidence `test-spec.md`,
or a new artifact keyed by expectation id).
