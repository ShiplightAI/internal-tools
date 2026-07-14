---
name: quality
description: "Quality — assess and drive up the quality status of a project/product. A higher-level quality ORACLE, independent of test creation: it maintains feature maps (what must hold) and proof maps (how each is proven — tests are ONE evidence kind among manual checks, telemetry, static analysis), then computes the quality index (four scores) via the deterministic quality-tools engine over the checked-in .quality/ backbone. Quality Center is the optional web UI that displays that index; the skill and engine produce it without any UI. Use ONLY when the user explicitly says 'quality', 'quality center', 'qc', 'quality status/score/index/map/posture', or invokes /quality — NOT on a generic mention of the word 'quality' (e.g. 'improve code quality'). Routes to subcommands: project, evidence, analyze, help."
---

# Quality

The single entry point for assessing and improving a project's **quality status**:
*does the product do what it should, and is it proven, with justified confidence?*
This skill is a quality **oracle** — it sits **above** the tools that produce
evidence and consumes their output as one source among many. It does not create
tests; a project whose proof is plain unit tests, manual checks, or telemetry is
assessed the same way as one using Shiplight tests.

It computes a **quality index** — four scores (quality, coverage, evidence
confidence, structure confidence) — with the deterministic **`quality-tools`**
engine over the checked-in **`.quality/`** backbone (the project map, per-feature
quality maps, and config). **Quality Center** is the optional web UI that
*displays* that index; this skill and the engine produce it without any UI, so a
coding agent can measure a release's quality with the skill and engine alone.

**Read `references/_shared/independence.md` before doing anything** — it is the
load-bearing principle (you cannot verify a system against itself) and it governs
every subcommand.

## Relationship to evidence producers

Quality reads evidence and may hand gaps *down* to producers (e.g.
`/shiplight cover`, `/shiplight create-yaml-tests`,
`/shiplight create-agent-verification`) — top knows bottom. Those producer skills
do **not** know about Quality. The dependency is one-directional: producers
emit facts (e.g. `specs/<f>/test-report.md`); Quality reads/indexes/scores them and
never authors a test.

## Routing contract

1. **Identify the subcommand.** Match the argument against the dispatch table:
   exact canonical token first, then the longest synonym phrase, then overall
   intent. Bare `/quality` (no subcommand) runs a **read-only status pass** —
   inventory project-map, quality-maps, config, and recent results; report the
   current quality posture and the next step — then present the menu.
2. **Pass-through context.** Forward whatever the selector didn't consume as
   context (e.g. `/quality evidence checkout` → `evidence` + target `checkout`).
3. **Dispatch.** Read `references/<subcommand>/index.md` (or
   `references/<subcommand>.md`) and follow it.
4. **Stop at human gates.** Quality's construction is human-gated: an agent may
   *construct and propose* maps/checks/priorities but must **never self-promote
   `structure_provenance`** or ratify on the owner's behalf (see
   `_shared/independence.md`). Unlike action-oriented tools, these subcommands
   stop and ask for ratification.
5. **Never fabricate a score.** The four scores are computed by the deterministic
   `quality-tools` engine, never by you. Never blend, optimize, or reverse-engineer
   them; never weaken a check or scope to clear a recommendation (Goodhart).

## Shared layer

- `_shared/independence.md` — the principle + the four enforcement mechanisms.
- `_shared/layout.md` — the `.quality/` tree and per-artifact ownership.
- `_shared/vocabularies.md` — test type, source type, priority (P0–P3), and the
  "facts not verdicts" rule.

## Subcommands (menu)

Show this grouped menu when invoked bare or when clarifying.

- `project` — build/maintain `project-map.yaml`: features, release areas, change
  classification, brownfield reconstruction, drift, structure ratification (the *what*).
- `evidence` — build/maintain a feature's `quality-map.yaml`: enumerate checks,
  carry priority, map each proof (type + path), record proof gaps (the *how*).
- `analyze` — wire observation sources/sets/views, run `quality-tools analyze`,
  read the four scores, triage recommendations, and generate fix prompts for the
  open gaps (the *assessment*).
- `help` — list subcommands, or `help <subcommand>` for details (does not execute).

## Dispatch table

| Canonical | Synonyms / intents | Reference |
|-----------|--------------------|-----------|
| `project` | project map, feature map, release areas, what features exist, reconstruct features, classify change | `references/project/index.md` |
| `evidence` | quality map, map evidence, what proves this feature, proof gaps, evidence for <feature> | `references/evidence/index.md` |
| `analyze` | analyze, quality score, coverage score, confidence, run analysis, observations, recommendations, triage, what should I fix, close the gaps, fix prompts | `references/analyze/index.md` |
| `help` | what can quality do, list commands, usage, `?` | `references/help.md` |

## The four scores (what `analyze` reports, and the lever for each)

| Score | Measures | Raised by |
|-------|----------|-----------|
| Coverage | declared checks that have any proof | declare the check (`evidence`) + create proof (a producer) |
| Evidence confidence | strength of each proof (manual < single automated < gated) | upgrade modality on high-priority checks |
| Quality | the proving evidence actually holds at runtime | fix failing/flaky/stale proof |
| Structure confidence | how ratified the map is (inferred → user-authored → spec) | **human ratification** (only a human can raise it) |

You can never raise a score by editing Quality artifacts — only by genuinely
improving the underlying proof, which the engine then re-measures.
