# Shared: Independence — the load-bearing principle

Quality exists because **you cannot verify a system against itself**. When
the same understanding writes the code, writes the tests, and pronounces the result
good, the confidence it reports is circular — *self-verification is not
verification; a system that grades its own homework will always pass.* As code
generation becomes cheap and abundant, the scarce resource is **trust**: does the
software do what it should, and is it correct, with justified confidence?

Quality answers that only if its judgment is independent of whatever produced the
code and the tests. That independence is engineered, not assumed, and it is the
reason Quality is a **separate skill at a higher altitude** than the evidence
producers — never a subcommand of them.

## The four enforcement mechanisms (never weaken these)

1. **One-directional artifact flow.** Producers emit facts (`test-spec.md`,
   `test-report.md`, test code, run results); Quality reads/indexes/scores them.
   Quality **never authors a test** or edits a producer artifact. Producers never
   write a backbone YAML or touch `.quality/`.
2. **The engine scores, never the LLM.** The four scores are computed by the
   deterministic `quality-tools` engine from declared facts + runtime observations
   + human ratification — never an agent's opinion. Never blend, optimize, or
   reverse-engineer a score. A measure of quality must never become the target it
   describes, or it stops describing anything (Goodhart).
3. **The judge re-confirms, never copies the claim.** When a producer records an
   evidence `type`, Quality confirms it against the artifact at `evidence.path`
   rather than trusting the report's self-claim — the judge does not copy the
   generator's label.
4. **Human ratification gate.** Structure confidence is the only human-gated
   axis, ratified through four gates (see below). An agent may **construct at the
   untrusted default and propose** checks/priorities/structure, but must **never
   self-advance a gate** or ratify on the owner's behalf. Self-verification of
   structure is disallowed by design.

## Structure confidence: the ratification gates

Mechanism 4 is enforced through **four ratification gates** — each a separate
field the deterministic `quality-tools` engine reads, never an agent's edit. The
engine composes them into the structure-confidence score; the numbers below are
the current rubric, not a target to optimize toward or reverse-engineer.

| Gate | Field | Artifact / owner | What it ratifies |
| --- | --- | --- | --- |
| 1 | `structure_provenance` | `quality-map.yaml` / `evidence` | the check list *and its priorities* **originated** from a trusted source — `spec`/`user_authored` = 1.0, `agent_generated` = 0.7, `inferred_brownfield` = 0.4, `unspecified` = 0 (counted, earns no trust). This is *origin*, not review — review is gate 4 and never overwrites it |
| 2 | feature `status` | `project-map.yaml` / `project` | the feature is real product truth — a `candidate` (agent-proposed, unratified) feature soft-caps its checks' structure confidence at 0.7 until a human ratifies it (e.g. `active`) |
| 3 | `priority_provenance` | `project-map.yaml` / `project` | the declared priority is human-set (`human`) rather than agent-guessed (`agent`); the agent must not overwrite a human-set priority on rebuild |
| 4 | `checks_reviewed` | `quality-map.yaml` / `evidence` | a human reviewed and **approved the whole check list**. Combined with a confirmed feature (gate 2), it lifts that feature's checks to HIGH structure confidence (1.0), overriding the gate-1 provenance ladder. Orthogonal to `structure_provenance` (origin) — `agent_generated` means "an agent produced the checks," *not* "a human reviewed them"; that is what this gate records |

`evidence` owns gates 1 & 4; `project` owns gates 2–3. When either subcommand says it
"owns structure confidence," it means *its* gate(s) — the score is the engine's
join of all four and is never owned end-to-end by one subcommand. An agent may
construct at the untrusted end of every gate (`inferred_brownfield`, `candidate`,
`agent`, `checks_reviewed: false`) and propose, but must never self-advance any gate
on the owner's behalf — including flipping `checks_reviewed` to true or accepting a
gap risk (`accepted_gaps`) for the owner.

## Layering rule

Quality may know about and drive the producers (top knows bottom — it can hand a
proof gap to `/shiplight cover` or a producer). The producers must **not** know
about Quality. Keep the dependency one-directional and the file interface the only
coupling.
