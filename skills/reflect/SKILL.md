---
name: reflect
description: After a unit of work completes (e.g. a merged PR), harvest durable knowledge from the session — user corrections, rejected approaches, review findings — reconcile it against the relevant AGENTS.md files by scope, and propose updates for the user to approve. A self-learning step, not self-verification.
user_invocable: true
---

# Reflect

Harvest durable knowledge from a just-completed unit of work and fold it into the
`AGENTS.md` files that future agents will read. The richest source is the
**session conversation itself** — the user's corrections, the approaches they
rejected, the decisions they made mid-flight. That knowledge evaporates when the
session closes; this skill captures it before it does.

This is the post-merge step of `auto-pr`, but it stands alone: run it after any
session where real knowledge changed hands.

## Why this is not self-verification

The lessons come from signal that is **grounded outside the agent's own opinion
of its work**: what the user told you to do differently, what an independent
reviewer caught, what actually broke, and the **root cause you diagnosed** for a
real, reproduced failure. Diagnosis counts because it is anchored to evidence —
the failing behavior, the logs, the actual code — not to the agent's hunch about
whether its work was good. Weight inputs by how grounded they are:

- **Strong** — user corrections and decisions; external review findings;
  evidence-backed diagnosis (a root cause you confirmed against a real failure).
- **Weak** — after-the-fact "I think I should have…" with no failure, no
  reviewer, and no user behind it. That's speculation; treat it with suspicion.

The agent is a scribe and an investigator here, not a grader of its own homework.

## The bar: most PRs teach nothing, and that is the correct outcome

Do **not** manufacture a lesson to justify the run. Write something only when it
is all three of:

- **Durable** — still true next month, not an artifact of this one diff.
- **Generalizable** — a class of situation a future agent will hit again, not a
  one-off detail of this file.
- **Not already captured** — absent from the relevant `AGENTS.md` (or present but
  wrong/stale, in which case the lesson is the *correction*).

If nothing clears the bar, say so plainly and stop. Silence beats noise: every
weak rule added to an `AGENTS.md` dilutes the strong ones and burns context
budget for every future agent.

## What counts as a lesson

Knowledge that would change how the next agent acts:

- **Convention / pattern** — "auth in this codebase goes through `withSession`,
  never raw cookie reads" (because the user corrected a raw-cookie attempt).
- **Constraint / gotcha** — "migrations must be idempotent; the runner replays
  them" (because a reviewer caught a non-idempotent one).
- **Root cause from diagnosis** — "the race was caused by `cache` being read
  before `init()` resolves; treat the cache as cold until the ready signal
  fires" (because you root-caused a real, reproduced failure).
- **Rejected approach** — "do not reach for `X`; the user ruled it out for reason
  `Y`" — saves the next agent from re-proposing it.
- **Process / efficiency** — "this build needs `pnpm -w` at the root, not per
  package" (because the obvious path failed).

Skip: anything specific to this PR's logic, anything already obvious from the
code, anything you're only inferring from your own work without an external
signal behind it.

## Instructions

1. **Gather the signal** for the completed work:
   - **Session conversation** — scan for user corrections, rejected approaches,
     and decisions. This is the primary source.
   - **Diagnosis** — for any bug actually root-caused this session, capture *why
     it happened*: the wrong assumption, the hidden coupling, the missing
     invariant the failure exposed. The fix is local; the root cause is often
     general ("nothing enforces that callers of `X` hold the lock"). This is the
     knowledge that prevents the *class* of bug, not just this instance.
   - **Review thread** — what the `claude[bot]` review and any human comments
     flagged, and how it was fixed.
   - **The fix delta** — what changed between the first push and the merged
     state, and *why* (the diff between "what the agent first did" and "what was
     accepted" is where the lesson lives).

2. **Extract candidate lessons** and run each through the bar above. Expect to
   discard most. Phrase survivors as short, imperative rules — the way they'd
   read inside an `AGENTS.md` ("Do X", "Never Y", "Prefer Z because…").

3. **Route by scope.** For each lesson, decide the narrowest home:
   - Find the changed files the lesson came from (`git diff --name-only` for the
     merged range).
   - Target the **nearest `AGENTS.md`** up the tree from those files (e.g. a
     front-end-only lesson → `frontend/AGENTS.md`).
   - Escalate to the repo-root `AGENTS.md` only if the lesson is genuinely
     cross-cutting.
   - If the natural home has **no `AGENTS.md` yet**, propose creating one — but
     flag it explicitly so the user is deciding to start a new file, not just
     amend an existing one.
   - If the repo uses `CLAUDE.md` instead of `AGENTS.md`, target whichever file
     the agents in that repo actually read. Match the repo, don't impose.

4. **Reconcile — do not blindly append.** For each target file, read it first,
   then:
   - **Update / supersede** a rule the lesson contradicts or refines, rather than
     adding a competing bullet.
   - **Merge** into an existing rule if the lesson sharpens it.
   - **Drop** the lesson if, on reading the file, it turns out already covered.
   - Keep edits minimal and the file tight. Reconciliation is the point; an
     append-only log is the failure mode.

5. **Present, then ask.** Show the user, per target file:
   - what you learnt (the lesson, in one line) and **the source** ("you corrected
     X", "reviewer flagged Y") so they can sanity-check the provenance,
   - the exact proposed diff to that `AGENTS.md`.

   Then **ask whether to apply** — all, some, or none. This is the one gate that
   stays manual: the agent is editing the instructions that govern its own future
   behavior, so the human ratifies.

6. **Apply only what's approved.** Make the edits the user accepted, leave the
   rest. Do not open a PR or commit unless the user asks — surface the edited
   files and let them decide how to land them (their repo's branch/PR
   conventions apply).

## Important

- Lessons must be **grounded** — a user signal, a review finding, or an
  evidence-backed diagnosis of a real failure. After-the-fact theory with none of
  those behind it probably isn't a lesson.
- Writing nothing is a valid, common result. Report it and stop.
- Reconcile against existing content every time; never append a near-duplicate.
- Route to the **narrowest** AGENTS.md that fits; root is the last resort.
- The user approves every AGENTS.md change. No silent self-edits.
