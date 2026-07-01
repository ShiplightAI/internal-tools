# Prompt Playbook

Copy-paste prompts that drive a coding agent (with the Shiplight skills + MCP
installed) to build features and tests, construct the quality backbone, and push
it to high coverage and confidence — automatically where it can, and stopping
for you where it must.

> **Read `ARCHITECTURE.md` and `POSITION.md` (in the Quality Center repo,
> `quality-center/docs/`) first** if you want the why. This file is the how.

## The model these prompts encode

One repo, two router skills that share an artifact interface but never call into
each other:

- **`/shiplight`** — the evidence-PRODUCER toolkit. `speckit-project` (a separate
  skill) drives the PRD, feature breakdown, specs, and the lifecycle; `/shiplight
  cover` picks strategy and drives the producers `/shiplight create-yaml-tests` /
  `/shiplight create-agent-verification` to write tests. It produces **Markdown
  and test code** and knows nothing about scoring.
- **`/quality`** — the quality ORACLE. `/quality project` (construct
  `project-map.yaml`), `/quality evidence` (construct each feature's
  `quality-map.yaml`), and `/quality analyze` (wire observation runs and read the
  scores). It **reads** the producer artifacts and **constructs the index**. Bare
  `/quality` does a read-only status pass, then presents the menu.

Two facts flow up from the producer side and govern everything; the oracle reads
them, never invents them:

- **`priority` (P0–P3)** — declared in the PRD / feature breakdown / spec. The
  effort lever. There is no 1–5 risk weight.
- **evidence `type`** — a fact about each test artifact. Evidence confidence is
  *derived* from it; there is no authored `depth` / `reliability` and no
  hand-written `HIGH/MEDIUM/LOW` verdict.

Quality Center reports **four scores, shown side by side and never blended**:

| Score | Kind | Raised by | Automatable? |
| --- | --- | --- | --- |
| **Coverage** | structural | mapping proof for more checks | ✅ agent |
| **Evidence confidence** | structural | stronger test **types** (manual < single automated < direct automated + gate) | ✅ agent |
| **Quality score** | runtime | green observations from real runs | ✅ agent (wire + run) |
| **Structure confidence** | structural | **human ratification** of the check list and its priorities (the `structure_provenance` ladder) | ❌ **human-gated** |

The one constraint behind every prompt below: **an agent can drive coverage,
evidence, and the runtime quality score to the ceiling on its own, but it must
stop at the structure-confidence ratification gate.** It may construct maps at
`inferred_brownfield` and *propose* checks and priorities; it must never
self-promote provenance to `user_authored` / `spec`. Self-verification is not
verification.

Prereqs: the Shiplight skills + MCP installed. Spec Kit is optional — only the
greenfield / spec-driven paths use it; the spec-less path is first-class.

---

## 1. Brownfield repo (established code, no project/quality maps)

Order matters: reconstruct the backbone → assess one priority feature →
**ratify** → drive evidence → wire runtime. Don't let the agent reconstruct the
whole repo unsupervised — you steer scope and priority.

**Prompt 1 — Reconstruct the project index (read-only, you steer scope):**

```text
Use /quality project in brownfield reconstruction mode. This repo has no
project map or quality maps yet. Discover the docs, routes, APIs, schemas,
jobs, tests, and CI, group observed behavior into candidate features, and
produce a PROVISIONAL project-map.yaml. Mark every reconstructed fact as
IMPLEMENTATION / INFERRED / LEGACY — do not promote anything to SOURCE.
Start with [NAME YOUR HIGHEST-VALUE OR HIGHEST-PRIORITY AREA]. Here are my
intent sources: [PRD/design-doc paths, Jira/Linear/GitHub Issues pointers].
When done, present the candidate feature list with source types and open
questions for me to ratify.
```

**Prompt 2 — Construct the quality index for the priority feature:**

```text
Use /quality evidence on <NNN-feature-slug>. Construct quality-map.yaml with
structure_provenance: inferred_brownfield by reading any test-spec/test-report
under specs/<feature>/, the test files, and the code. Enumerate the quality
checks and carry each check's declared priority (P0–P3) as a fact from the
PRD/spec — mark UNKNOWN, don't guess, when none is declared. Map every EXISTING
test to an evidence row of type + path, confirming the type against the
artifact. Record proof_gap next-steps. Do not invent requirements; do not claim
anything passed without command output.
```

**Prompt 3 — The human ratification gate (you, not the agent):**

```text
Show me the candidate features and the reconstructed checks, worst
structure-confidence first, highest-priority within each. For each, tell me
what's SOURCE vs inferred, the declared priority, and your open questions. I'll
accept / split / merge / rename / reject / re-prioritize so you can raise
structure_provenance. Do NOT self-promote provenance — wait for my ratification.
```

After you ratify, the agent updates provenance to `agent_generated` (you
reviewed it) or you mark `user_authored` / `spec`.

**Prompt 4 — Drive coverage + evidence automatically (the automatable loop):**

```text
For the ratified checks in <feature>, drive the gaps closed. Use /shiplight
cover to pick strategy and author tests: unit/contract/integration inline, and
delegate browser/e2e/agent tests to /shiplight create-yaml-tests / /shiplight
create-agent-verification. Honor the non-negotiable floors (unit coverage on
core/changed logic; at least one gate on every P0 check). Record what was tested
and by what type in specs/<feature>/test-report.md. Then run /quality evidence to
update quality-map.yaml from the new artifacts. Keep edits scoped to tests and
test support.
```

**Prompt 5 — Wire observation runs so the quality score lights up:**

```text
Use /quality analyze. Inventory the existing CI workflows and result artifacts,
then wire .quality-center/config/observation-sources.yaml and config/observation-sets.yaml so
runtime results join to my quality-map evidence paths (Runtime Join Contract).
Run `quality-tools analyze`, then triage the recommendations by fix domain
(source/config, artifact, producer, join, real evidence gap, scope). Fix what's
automatable and re-run analyze until recommendations converge. Hand any deep
per-feature rework back to /quality evidence (mapping) or /shiplight cover (tests).
```

Repeat Prompts 2–5 per feature in priority order, then move to the continuous
prompts (§3).

---

## 2. Greenfield repo (new project from scratch)

Structure confidence starts **high** because checks derive from a spec/PRD you
author — no reconstruction, no ratification campaign. Spec Kit is optional.

**Prompt 1 — Set the intent and index the project:**

```text
Use speckit-project init. Help me write docs/PRD.md, then docs/
feature-breakdown.md with numbered features (001-*, 002-*), dependencies,
declared priorities (P0–P3), and MVP/release areas. Establish specification
authority: specs are source of truth, code is an artifact, tests/reviews are
evidence. If using Spec Kit, ensure the constitution enforces this. Then hand
off to /quality project to construct project-map.yaml from these artifacts.
```

**Prompt 2 — Plan the active feature (intent contract):**

```text
Use speckit-project lifecycle on 001-<feature>. Plan it: if Spec Kit is
installed run specify → clarify → checklist → plan → tasks → analyze; otherwise
take the spec-less path — author and let me ratify the specs/<feature>/
test-spec.md and the accepted behavior. Carry each behavior's declared priority.
Stop for my input on product judgment.
```

**Prompt 3 — Implement, test, then index:**

```text
Implement 001-<feature> against the ratified plan with speckit-project. Then use
/shiplight cover: choose the cheapest proof CAPABLE of closing each gap —
spending the scarce e2e/agent budget where priority is highest — author the tests
(delegate browser/e2e to /shiplight create-yaml-tests / /shiplight
create-agent-verification), run them, and record types and results in
specs/<feature>/test-report.md. Honor the non-negotiable floors. Then run
/quality evidence to construct quality-map.yaml with structure_provenance: spec
from the spec and the test artifacts.
```

**Prompt 4 — Wire observation runs (once a few features exist):**

```text
Use /quality analyze to wire .quality-center observation sources + evaluation
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
Run the quality improvement loop. Use /quality analyze: `quality-tools analyze`
across the project (or the <view/observation-set>), then work down the
recommendations by fix domain. For real evidence gaps, use /shiplight cover to
author/strengthen tests (/shiplight create-yaml-tests / /shiplight
create-agent-verification) and /quality evidence to re-map them. For join
problems fix evidence.path/test_case; for artifact
problems add a workflow observation-emit step. Re-run analyze after each fix and
continue until remaining recommendations are low-return, blocked, or need my
judgment. Drive coverage, evidence confidence, and the runtime quality score up
— but NEVER touch structure_provenance to lift structure confidence, and never
weaken checks or trim scope to make recommendations disappear.
```

**Prompt B — Maintenance / drift (when code changes land):**

```text
Use speckit-project maintenance mode. Classify this change: if it's a bug fix or
cross-cutting refactor of EXISTING features, don't create a new feature branch —
identify every feature it touches, reconcile each through drift resolution (a
pure bug fix usually realigns code to the existing spec), and refresh their
tests via /shiplight cover. Then ask /quality project to update the touched
project-map entries and /quality evidence to re-map the changed features. Promote
to a new feature only if it's a genuinely new capability.
```

**Prompt C — Periodic structure-confidence review (the human gate):**

```text
Use /quality analyze to list every feature whose structure confidence is low
(inferred_brownfield / unspecified) or whose check list or priorities may miss
real requirements, worst first. Surface the specific checks for me to ratify.
Show me, don't promote — I'll decide what becomes user_authored / spec.
```

Division of labor: **Prompts A and B are fully automatable** — you can put A on
a `/loop` or a scheduled cloud agent. **Prompt C is the one thing that requires
you**: the deliberate ratification gate that keeps structure confidence honest.
The agent generates proof cheaply; trust comes from intent and verification held
*independently* of the agent. You own the check list and its priorities; the
agent owns making it pass.
