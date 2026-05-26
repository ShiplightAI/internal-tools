---
name: code-review-run
description: Run a thorough, max-effort local code review (the /code-review skill) and optionally save a ranked report; supports multi-round reviews that reconcile prior findings.
user_invocable: true
---

# Code Review Run

Run a thorough correctness review of a change and (optionally) save a ranked report file.

This is for **standalone** reviews — reviewing local changes, a feature area, or a commit range outside the PR flow. For the full PR lifecycle (create PR → pre-review → Claude bot review → merge), use the `auto-pr` skill instead.

## Required Claude Code version

Before running a local or headless review, check `claude --version`. It must be Claude Code `2.1.150` or newer. If Claude Code is missing, older than `2.1.150`, or the version output is not Claude Code, stop and ask the user to update Claude Code.

## The underlying review skill

This wraps the `/code-review` skill, which scans the diff for correctness bugs at a chosen effort level.

- Effort: `low` | `medium` | `high` | `max`. Use `max` for thorough, recall-oriented passes (more finder angles + verification + a gap sweep).
- It returns findings as a ranked list and only writes a file if you ask it to.
- Disambiguation: `/code-review` (effort-based, reviews the current diff) is a **different** skill from `code-review:code-review` (a plugin that reviews a PR by number, used by `auto-pr`). This skill uses the effort-based `/code-review`.

## Running it

### In an agent session
Invoke the skill directly with effort + scope:

```
/code-review max <scope>
```

With no scope it reviews the current branch diff. To save a report, also tell it the path (see "Saving a report").

### Headless / scripted / CI
One self-contained command:

```bash
claude -p "/code-review max <scope>. Write the findings to \
code-reviews/<feature-slug>/code-review-$(date +%F)-round-1.md as a ranked markdown \
report: severity, file:line, the bug, a concrete failure scenario, and a fix \
direction. Add a 'verified-and-cleared' section." \
  --effort max --model opus --permission-mode bypassPermissions
```

- `<scope>`: a feature/dir, a set of files, or a commit range. Omit to review the current branch diff. `<scope>` becomes one shell arg — keep it in a single quoted string; `$(...)` expands in your shell first (handy for dates).
- `--permission-mode bypassPermissions` is required for unattended runs (the review uses Bash/git, spawns subagents, and writes the report) — use only in a repo you trust, or scope access with `--allowedTools`.
- Optional: `--output-format stream-json --verbose` (CI logs), `--max-budget-usd <n>` (spend cap), and `--comment` inside the skill args (`/code-review max <scope> --comment`) to post inline PR comments instead of writing a file.

## Saving a report

The skill writes a file only when the prompt asks for it. Default convention:

- Path: `code-reviews/<feature-slug>/code-review-<YYYY-MM-DD>-round-<N>.md`
  - `<feature-slug>`: a short kebab-case slug for the change under review (feature / branch / area), so each change gets its own subdirectory.
  - `<YYYY-MM-DD>`: the review date (`$(date +%F)`).
  - `<N>`: the review round, starting at 1 and incrementing per re-review of the same change.
  - Example: `code-reviews/enterprise-billing-reconciliation/code-review-2026-05-23-round-1.md`.
- Per finding: severity, `file:line`, the bug, a concrete failure scenario, and a fix direction. Plus a short "verified-and-cleared" section for things checked that are NOT bugs.
- Severity scale: to stay consistent with `auto-pr` and the Claude bot, label blockers **BUG** / **CRITICAL** / **🔴** and non-blockers **MINOR** / **NIT** / **SUGGESTION** / **LOGIC LOOKS CORRECT**.

## Multi-round reviews

A change usually needs more than one pass. Treat each round as a **fresh** review of the whole current diff — do NOT assume prior conclusions still hold (a later commit can introduce a bug into previously-cleared code). Seed each new round with the previous report so it tracks finding lifecycle:

1. Read the previous round's report in `code-reviews/<feature-slug>/` (`...-round-<N-1>.md`).
2. Reconcile each prior finding as **Fixed** / **Still-open** / **Regressed**.
3. Then surface any **New** findings from the fresh pass.
4. Write the result to the next file in the same directory (`...-round-<N>.md`).

Prefer this "fresh + reconcile" pattern over resuming a session: a resumed session anchors on its own prior conclusions and grows expensive, whereas seeding from the report file gives continuity without anchoring or context bloat.

## After the review

Inspect the output, fix blockers (**BUG** / **CRITICAL** / **🔴**) first, address cheap nits, and keep fixes within the requested scope.
