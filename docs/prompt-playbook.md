# Prompt Playbook

Copy-paste prompts that drive a coding agent (with the Shiplight skills + MCP
installed) to build the quality backbone and push it to high coverage and
confidence — automatically where it can, and stopping for you where it must.

> **Read [`ARCHITECTURE.md`](../ARCHITECTURE.md) and [`POSITION.md`](../POSITION.md)
> first** if you want the why. This file is the how.

## The model these prompts encode

Two structural maps form the backbone:

- **`project-map.yaml`** — owned by `quality-project` (the orchestrator):
  project graph, release areas, features, dependencies.
- **`quality-map.yaml`** (one per feature) — owned by `quality-evidence`:
  risk-weighted checks plus their proof definitions.

Quality Center reports **four scores, shown side by side and never blended**:

| Score | Kind | Raised by | Automatable? |
| --- | --- | --- | --- |
| **Coverage** | structural | mapping proof for more checks | ✅ agent |
| **Evidence confidence** | structural | stronger / more direct proof | ✅ agent |
| **Quality score** | runtime | green observations from real runs | ✅ agent (wire + run) |
| **Structure confidence** | structural | **human ratification** of the check list (the `structure_provenance` ladder) | ❌ **human-gated** |

The one constraint behind every prompt below: **an agent can drive coverage,
evidence, and the runtime quality score to the ceiling on its own, but it must
stop at the structure-confidence ratification gate.** It may author maps at
`inferred_brownfield` and *propose* checks; it must never self-promote
provenance to `user_authored` / `spec`. Self-verification is not verification.

Prereqs for all scenarios: the Shiplight skills + MCP installed for your agent.
Spec Kit is optional — only the greenfield / spec-driven paths use it; the
spec-less path is first-class.

---

## 1. Brownfield repo (established code, no project/quality maps)

Order matters: reconstruct the backbone → assess one priority feature →
**ratify** → drive evidence → wire runtime. Don't let the agent reconstruct the
whole repo unsupervised — you steer scope and priority.

**Prompt 1 — Reconstruct the backbone (read-only, you steer scope):**

```text
Use quality-project in brownfield reconstruction mode. This repo has no
project map or quality maps yet. Discover the docs, routes, APIs, schemas,
jobs, tests, and CI, group observed behavior into candidate features, and
produce a PROVISIONAL project-map.yaml. Mark every reconstructed fact as
IMPLEMENTATION / INFERRED / LEGACY — do not promote anything to SOURCE.
Start with [NAME YOUR HIGHEST-VALUE OR HIGHEST-RISK AREA]. Here are my intent
sources: [PRD/design-doc paths, Jira/Linear/GitHub Issues pointers].
When done, present the candidate feature list with source types and open
questions for me to ratify.
```

**Prompt 2 — Cold-start quality pass on the priority feature:**

```text
Use quality-evidence on <NNN-feature-slug>. Reconstruct the testing-what,
write quality-map.yaml with structure_provenance: inferred_brownfield, and
map every EXISTING test/check to its proof definition. Risk-weight each check
(1–5), size the gaps as required-proof-minus-actual, and record proof_gap
next-steps. Do not invent requirements; mark inferred checks INFERRED. Do not
claim anything passed without command output.
```

**Prompt 3 — The human ratification gate (you, not the agent):**

```text
Show me the candidate features and the high-risk checks you reconstructed,
worst structure-confidence first. For each, tell me what's SOURCE vs inferred
and your open questions. I'll accept / split / merge / rename / reject so you
can raise structure_provenance. Do NOT self-promote provenance — wait for my
ratification on each.
```

After you ratify, the agent updates provenance to `agent_generated` (you
reviewed it) or you mark `user_authored` / `spec`.

**Prompt 4 — Drive coverage + evidence automatically (the automatable loop):**

```text
For the ratified checks in <feature>, run quality-evidence: generate
fix-prompts for the highest-risk gaps, author the unit/contract/integration
tests inline, and delegate browser/e2e/agent tests to create-tests /
create-agent-tests. Honor the non-negotiable floors (unit coverage on
core/changed logic; at least one gate on every weight-5 check). Run the tests,
update quality-map.yaml + test-report.md, and record any residual gap you
knowingly accept. Keep edits scoped to tests and test support.
```

**Prompt 5 — Wire runtime review so the quality score lights up:**

```text
Use quality-center. Inventory the existing CI workflows and result artifacts,
then wire .quality-center/observation-sources.yaml and evaluation-sets.yaml so
runtime results join to my quality-map evidence paths (Runtime Join Contract).
Run `quality-tools analyze`, then triage the recommendations by fix domain
(source/config, artifact, producer, join, real evidence gap, scope). Fix what's
automatable and re-run analyze until recommendations converge. Hand any deep
per-feature rework back to quality-evidence.
```

Repeat Prompts 2–5 per feature in priority order, then move to the continuous
prompts (§3).

---

## 2. Greenfield repo (new project from scratch)

Structure confidence starts **high** because checks derive from a spec/PRD you
author — no reconstruction, no ratification campaign. Spec Kit is optional.

**Prompt 1 — Initialize the backbone:**

```text
Use quality-project init. Help me write docs/prd.md, then docs/
feature-breakdown.md with numbered features (001-*, 002-*), dependencies, and
MVP/release areas, then create project-map.yaml. Establish specification
authority: specs are source of truth, code is an artifact, tests/reviews are
evidence. If using Spec Kit, ensure the constitution enforces this.
```

**Prompt 2 — Plan the active feature (intent contract):**

```text
Use quality-project lifecycle on 001-<feature>. Plan it: if Spec Kit is
installed run specify → clarify → checklist → plan → tasks → analyze; otherwise
take the spec-less path — author and let me ratify the project-map entry plus
the quality-evidence test-spec and quality-map SOURCE checks
(structure_provenance: user_authored / spec). Stop for my input on product
judgment.
```

**Prompt 3 — Implement + map quality from authored truth:**

```text
Implement 001-<feature> against the ratified plan. Then run quality-evidence:
derive checks from the spec (structure_provenance: spec), risk-weight them, and
choose the cheapest proof CAPABLE of closing each gap — spending the scarce
e2e/agent budget where risk is highest. Author the tests (delegate browser/e2e
to create-tests / create-agent-tests), run them, and write quality-map.yaml +
test-report.md. Honor the non-negotiable floors.
```

**Prompt 4 — Wire runtime review (once a few features exist):**

```text
Use quality-center to wire .quality-center observation sources + evaluation
sets against my CI, run `quality-tools analyze`, and triage/fix recommendations
so the runtime quality score reflects real passing observations. Optionally
author saved views for release-area readiness.
```

Loop Prompts 2–4 per feature in dependency order. Because checks are
spec-derived from the start, structure confidence stays high — just keep specs
current when behavior changes.

---

## 3. Continuous (either §1 or §2 already done)

Steady state: drive the three automatable scores to the ceiling, stop at the
ratification gate, and keep the backbone aligned as code/specs/tickets change.

**Prompt A — The convergence loop (run repeatedly / on a schedule):**

```text
Run the quality improvement loop. Use quality-center: `quality-tools analyze`
across the project (or the <view/evaluation-set>), then work down the
recommendations by fix domain. For real evidence gaps, generate fix-prompts and
author/strengthen tests via quality-evidence + create-tests / create-agent-tests.
For join problems fix evidence.path/test_case; for artifact problems add a
workflow observation-emit step. Re-run analyze after each fix and continue until
remaining recommendations are low-return, blocked, or need my judgment. Drive
coverage, evidence confidence, and the runtime quality score up — but NEVER
touch structure_provenance to lift structure confidence, and never weaken
checks or trim scope to make recommendations disappear.
```

**Prompt B — Maintenance / drift (when code changes land):**

```text
Use quality-project maintenance mode. Classify this change: if it's a bug fix
or cross-cutting refactor of EXISTING features, don't create a new feature
branch — identify every feature it touches, reconcile each through drift
resolution (a pure bug fix usually realigns code to the existing spec), refresh
their quality-evidence, and update the touched project-map entries. Promote to a
new feature only if it's a genuinely new capability.
```

**Prompt C — Periodic structure-confidence review (the human gate):**

```text
Use quality-center to list every feature whose structure confidence is low
(inferred_brownfield / unspecified) or whose check list may miss real
requirements, worst first. Surface the specific checks for me to ratify. Show
me, don't promote — I'll decide what becomes user_authored / spec.
```

Division of labor: **Prompts A and B are fully automatable** — you can put A on
a `/loop` or a scheduled cloud agent. **Prompt C is the one thing that requires
you**: the deliberate ratification gate that keeps structure confidence honest.
The agent generates proof cheaply; trust comes from intent and verification held
*independently* of the agent. You own the check list; the agent owns making it
pass.
