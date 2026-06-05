# When Generation Is Cheap, Verification Is the Work
### A position on building software in the age of agentic development

**The shift.** For most of software's history, the binding constraint was writing
the code. That constraint is dissolving. Coding agents now produce focused,
working implementations quickly and cheaply, and they keep improving. As
generation becomes abundant, the bottleneck moves — away from producing code and
toward knowing whether the code we produced is the code we wanted.

**The new scarce resource is trust.** When a person could read every line, review
was the mechanism of trust. That mechanism does not survive the volume and pace
of agentic development; no one can reason line-by-line through everything agents
write, and soon there will be little reason to try. Two questions remain, and they
are the whole game: does the implementation do what it is meant to do, and is it
correct? Everything else — speed, cost, even cleverness — is subordinate to
answering those two with justified confidence.

**The human's role does not shrink; it moves up.** Humans remain the source of
intent: what the product is, what problem it solves, what "right" means. The
human's job becomes expressing that intent clearly — and independently of the
implementation, so it serves as a reference rather than a rationalization of
whatever was built — and judging whether the result has earned trust, not
reasoning through the implementation that produced it.

**The trap: you cannot verify a system against itself.** This is the oldest
problem in testing, and agentic development makes it acute. To judge whether a
program is correct you need an oracle — an independent statement of what correct
means. If that oracle is derived from the same understanding that produced the
program, it is not an oracle; it is an echo. When the same agent writes the code,
writes the tests, and pronounces the result good, the confidence it reports is
circular. **Self-verification is not verification.** A system that grades its own
homework will always pass.

**The principle: independence.** Trust in agentic software must rest on
independence, deliberately engineered at every layer:

- **Intent is held independently of implementation** — owned by humans and
  recorded apart from the code, so it acts as a reference, not a rationalization
  of whatever got built.
- **Verification is independent of generation** — the checks that establish
  correctness must not share the blind spots of the process that wrote the code:
  different perspective, adversarial intent, ideally different agents tasked with
  trying to break it, not bless it.
- **Trust is grounded outside the generating system** — real-world behavior,
  adversarial probing, and periodic human calibration anchor the loop to reality,
  so confidence is measured against the world and not against the system's own
  opinion of itself.
- **Evidence over assertion; uncertainty stays legible** — confidence is earned
  by evidence whose independence can be defended, and what remains unproven is
  named honestly. A measure of quality must never become the target it is meant to
  describe, or it stops describing anything.

**Why maintainability persists.** It is tempting to conclude that, since humans no
longer read the code, its quality no longer matters. It matters more. Clean,
well-bounded code is what keeps agents able to change it correctly, and what makes
any behavior provable at all. Maintainability is not a courtesy to human readers;
it is a precondition for both continued generation and credible verification.

**What this asks of us.** The task ahead is not better code generation — that is
arriving on its own. It is to build the discipline and the systems *around*
generation that let humans own intent, hold verification independent of the agents
that write the code, and earn confidence through evidence we can actually defend.
The teams that win the agentic era will not be the ones that generate the most
code. They will be the ones that can say, with grounds, that their software does
what it should — and prove it without having read it.
