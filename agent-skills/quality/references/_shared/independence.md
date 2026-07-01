# Shared: Independence — the load-bearing principle

Quality Center exists because **you cannot verify a system against itself**. When
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
   write a backbone YAML or touch `.quality-center/`.
2. **The engine scores, never the LLM.** The four scores are computed by the
   deterministic `quality-tools` engine from declared facts + runtime observations
   + human ratification — never an agent's opinion. Never blend, optimize, or
   reverse-engineer a score. A measure of quality must never become the target it
   describes, or it stops describing anything (Goodhart).
3. **The judge re-confirms, never copies the claim.** When a producer records an
   evidence `type`, Quality confirms it against the artifact at `evidence.path`
   rather than trusting the report's self-claim — the judge does not copy the
   generator's label.
4. **Human ratification gate.** `structure_provenance` (inferred_brownfield →
   user_authored → spec) is the only human-gated axis. An agent may **construct at
   `inferred` and propose** checks/priorities/structure, but must **never
   self-promote provenance** or ratify on the owner's behalf. Self-verification of
   structure is disallowed by design.

## Layering rule

Quality may know about and drive the producers (top knows bottom — it can hand a
proof gap to `/shiplight cover` or a producer). The producers must **not** know
about Quality. Keep the dependency one-directional and the file interface the only
coupling.
