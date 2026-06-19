---
name: reflect
description: After a unit of work completes (e.g. a merged PR), harvest durable knowledge from the session — user corrections, rejected approaches, review findings — reconcile it into the canonical agent-memory file (AGENTS.md) at the narrowest scope, bridge it to every other agent toolchain the repo uses by symlinking that toolchain's file to it (e.g. CLAUDE.md → AGENTS.md) so one source reaches all agents, and propose updates for the user to approve. A self-learning step, not self-verification.
user_invocable: true
---

# Reflect

Harvest durable knowledge from a just-completed unit of work and fold it into the
agent-memory files that future agents will read. The canonical store is
`AGENTS.md` (the cross-tool open standard); each *other* agent toolchain the repo
uses gets its file **symlinked** to `AGENTS.md`, so one literal source of truth
reaches every agent with zero drift — see step 3. The richest source is the
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
weak rule added dilutes the strong ones and burns context budget for every
future agent. **Treat "nothing to capture" as the expected default, not a
failure** — a typical PR fixes a specific bug or ships a specific feature and
teaches no reusable rule. Only a genuine convention, constraint, or root-caused
class-of-bug clears the bar; if you find yourself arguing a lesson up to the
line, it's below it.

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

3. **Route by scope, then make it reachable by every agent in the repo.** Writing
   to one filename leaves the repo's other agents blind — they each read a
   different file. So route in two parts:

   **(a) Pick the canonical home (narrowest scope).**
   - Find the changed files the lesson came from (`git diff --name-only` for the
     merged range).
   - The canonical store is **`AGENTS.md`** — the cross-tool open standard read
     natively by the most agents (Codex, Cursor, and others). Target the
     **nearest `AGENTS.md`** up the tree from those files (e.g. a front-end-only
     lesson → `frontend/AGENTS.md`); escalate to the repo-root `AGENTS.md` only
     if the lesson is genuinely cross-cutting.
   - If a repo has deliberately standardized on a *different* canonical file
     (e.g. `CLAUDE.md`-only, no `AGENTS.md` anywhere), match the repo — write to
     whatever its agents actually read. Match the repo, don't impose a new
     standard on it.

   **(b) Bridge the canonical file to every other agent toolchain present, by
   symlink.** Different agents read different files and **do not** read each
   other's: Claude Code reads `CLAUDE.md` (NOT `AGENTS.md`), Gemini CLI reads
   `GEMINI.md`, etc. At the **same directory scope** as the canonical `AGENTS.md`,
   ensure each agent convention the repo already uses has its file as a
   **relative symlink to `AGENTS.md`** — so it's the same literal file under
   another name, one source of truth, no drift and no duplicated content:
   - **Claude Code** → `CLAUDE.md` symlinked to `AGENTS.md`. Create with
     `ln -s AGENTS.md CLAUDE.md` run **in that directory** (keep it relative, not
     an absolute path, so it survives moves and POSIX clones). Verify with
     `readlink CLAUDE.md` → `AGENTS.md`.
   - **Other tools** → the same: `ln -s AGENTS.md GEMINI.md`, etc.
   - **Portability caveat:** git symlinks don't survive a Windows checkout with
     `core.symlinks=false` (Git's default there) — the file lands as plain text
     containing `AGENTS.md`, silently breaking the bridge. On repos with Windows
     contributors, prefer the import form below for Claude rather than a symlink.
   - **Portable alternative (import, Claude-specific):** instead of a symlink,
     make `CLAUDE.md` a real one-line file containing `@AGENTS.md` — Claude Code
     expands the import, and it survives any checkout. Use this when symlinks
     aren't viable, or when a repo genuinely needs Claude-only content that must
     NOT reach other agents (put it below the import line). The trade-off: it's
     Claude-only — tools like Gemini CLI don't honor `@` imports, so for those a
     symlink remains the one-source-of-truth bridge. Either way, all *shared*
     knowledge lives in `AGENTS.md`; never duplicate it into the bridge file.
   - **Detect, don't impose:** only bridge to toolchains the repo already uses —
     infer them from what exists (a root `CLAUDE.md`, `GEMINI.md`, `.cursor/`,
     `.github/copilot-instructions.md`, …). Do not introduce a new agent's file
     into a repo that never had one.
   - **If the bridge path already holds a real (non-symlink) file** with its own
     content (e.g. an existing `CLAUDE.md`), do NOT clobber it — surface it and
     let the user decide whether to fold its content into `AGENTS.md` and replace
     it with a symlink. Never silently overwrite a real file with a symlink.
   - Bridges are **one-time scaffolding**: once `CLAUDE.md` is a symlink to
     `AGENTS.md` at a scope, future runs touch only `AGENTS.md`. If the symlink
     already exists and points at `AGENTS.md`, don't re-create it.

   **Creating new files:** if the natural home has **no `AGENTS.md` yet**, or a
   needed bridge is missing, propose creating them — flag it explicitly so the
   user is deciding to start new files, not just amend existing ones.

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
   - the exact proposed diff to the canonical `AGENTS.md`,
   - plus any **bridge** symlinks you'd create (e.g. a new `CLAUDE.md` symlinked
     to `AGENTS.md`), called out separately so the user sees you're adding
     scaffolding, not knowledge.

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
- Route to the **narrowest** `AGENTS.md` that fits; root is the last resort.
- Knowledge lives in **one** canonical file (`AGENTS.md`); reach the repo's other
  agents by **symlinking** their file to it (`CLAUDE.md` → `AGENTS.md`, etc.),
  never by duplicating the content. Only bridge toolchains the repo already uses,
  and never overwrite an existing real file with a symlink without asking.
- The user approves every change — knowledge edits *and* new bridge files. No
  silent self-edits.
