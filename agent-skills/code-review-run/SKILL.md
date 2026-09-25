---
name: code-review-run
description: Run a multi-lens local code review (correctness, security, performance, test coverage, conventions); blocks on MEDIUM+, optionally saves a ranked report, supports multi-round reviews that reconcile prior findings, and can mirror the CI claude-review gate to clear all blockers before opening/updating a PR.
user_invocable: true
---

# Code Review Run

Run a multi-lens review of a change (correctness, security, performance, test coverage, conventions) and (optionally) save a ranked report file. This is a **standalone local review** of local changes, a feature area, or a commit range.

For the full PR lifecycle (create PR → review → merge), use the `auto-pr` skill instead — this skill is the deep local review step you run before or inside that flow, not a replacement for it.

## Required Claude Code version

Before running a local or headless review, check `claude --version`. It must be Claude Code `2.1.150` or newer — the minimum that ships the effort-based `/code-review` skill (with `--effort`) that powers the correctness lens. If Claude Code is missing, older than `2.1.150`, or the version output is not Claude Code, stop and ask the user to update Claude Code.

## The correctness engine (`/code-review`)

The **correctness lens** is powered by the `/code-review` skill, which scans the diff for correctness bugs (plus reuse/simplification/efficiency) at a chosen effort level. The other four lenses are separate passes (see below); this section is only about the correctness engine.

- Effort: `low` | `medium` | `high` | `max`. Default to `medium`; use `max` only when the user explicitly asks for the most thorough, recall-oriented correctness pass (more finder angles + verification + a gap sweep).
- It returns findings as a ranked list and only writes a file if you ask it to.
- Disambiguation: `/code-review` (effort-based, reviews the current diff) is a **different** skill from `code-review:code-review` (a plugin that reviews a change by PR number). This skill uses the effort-based `/code-review`.

## Review lenses & blocking bar

This skill reviews five dimensions and treats any **MEDIUM-or-higher** finding as a blocker to resolve. `/code-review` is correctness-scoped by design (bugs + reuse/simplification/efficiency), so it only covers the correctness lens. Run the other four lenses as **parallel subagents** alongside it, then merge their findings.

### The five lenses

Run the four non-correctness lenses as read-only subagents launched in a single batch (one message, multiple subagent calls) so they review the **same scope** concurrently. Run the correctness lens via `/code-review` in the main session. Each lens returns a ranked finding list in the unified severity scale below.

| Lens | How it runs | Looks for |
|---|---|---|
| **Correctness** | `/code-review` in the main session (effort-based internal fan-out) | logic bugs, edge cases, reuse/simplification/efficiency |
| **Security** | subagent, prompt-driven (covers the same ground as `/shiplight review security`) | secret handling, injection, authz/least privilege, input validation, unsafe deserialization |
| **Performance** | subagent, prompt-driven | N+1 queries, hot-path allocations, sync-in-async, unbounded work, redundant I/O |
| **Test coverage** | subagent, prompt-driven | untested new/changed paths, missing edge cases, a regression test for each bug fixed |
| **Conventions** | subagent, prompt-driven | CLAUDE.md adherence, style, API design, best practices |

Give each subagent a focused instruction rather than a skill name to invoke — a subagent can't reliably call a skill, which is also why the correctness lens stays at the top level (running `/code-review` there reuses its tuned pass). The security subagent should cover what `/shiplight review security` covers; if you'd rather use that command directly, run it at the top level too instead of inside a subagent.

### Optional focus

Accept an optional focus string (e.g. "weight injection, secret handling, and least privilege" for high-trust tooling) and pass it into the relevant lenses (the subagents, and appended to the `/code-review` scope where it applies) so the review emphasizes what matters most for this change.

### Scope: the change's diff only

Every lens reviews only what the change touches — the diff against the base branch, plus the immediately-surrounding code needed to judge it. Do **not** report pre-existing issues in files the change doesn't modify: they're out of scope for the review and "fixing" them balloons the change.

### Unified severity scale

Normalize every lens's findings to one scale:

- **CRITICAL** / **HIGH** / **MEDIUM** → **blocking** (must be resolved)
- **LOW** → non-blocking

Map legacy labels onto it: **BUG** / **🔴** → CRITICAL or HIGH; **MINOR** / **NIT** / **SUGGESTION** → LOW; **LOGIC LOOKS CORRECT** → cleared.

### Merge + apply the bar

After the lenses return, in the main session:
1. **Merge & dedupe** — pool all five lenses' findings; if two flag the same `file:line`, keep one entry at the highest severity (note which lenses raised it).
2. **Apply the bar** — anything **MEDIUM or higher** is a blocker that must be resolved (see the review-fix loop).

(This within-round merge is distinct from the cross-round *reconcile* in "Multi-round reviews", which tracks each finding's lifecycle across rounds.)

## Running it

### In an agent session
Run the multi-lens pass (see "Review lenses & blocking bar"): launch the security / performance / test-coverage / conventions subagents in one batch, and run the correctness lens via:

```
/code-review medium <scope>
```

With no scope, all five lenses review the current branch diff. Then merge, apply the MEDIUM+ bar, and enter the review-fix loop. To save a report, also tell it the path (see "Saving a report"). For a quick correctness-only spot check, running `/code-review medium <scope>` alone is fine — just don't treat it as the full multi-lens review.

### Headless / scripted
One self-contained command:

```bash
claude -p "/code-review medium <scope>. Write the findings to \
code-reviews/<feature-slug>/code-review-$(date +%F)-round-1.md as a ranked markdown \
report: severity, file:line, the bug, a concrete failure scenario, and a fix \
direction. Add a 'verified-and-cleared' section." \
  --effort medium --model opus --permission-mode bypassPermissions \
  --output-format stream-json --include-partial-messages --verbose
```

- `<scope>`: a feature/dir, a set of files, or a commit range. Omit to review the current branch diff. `<scope>` becomes one shell arg — keep it in a single quoted string; `$(...)` expands in your shell first (handy for dates).
- `--permission-mode bypassPermissions` is required for unattended runs (the review uses Bash/git, spawns subagents, and writes the report) — use only in a repo you trust, or scope access with `--allowedTools`.
- `--output-format stream-json --include-partial-messages --verbose` is the default for headless runs so long reviews emit realtime JSON events and partial assistant chunks before any external timeout. It only works with `--print` / `-p`. If logs are too noisy, drop `--include-partial-messages`.
- Optional: `--max-budget-usd <n>` (spend cap).
- **Lens note:** the one-liner above runs the **correctness lens only**. For the full multi-lens review headless, spell out the lenses in the prompt rather than naming this skill (a headless session can't reliably invoke a skill by name) — e.g. `claude -p "Review <scope> across five lenses — correctness, security, performance, test coverage, conventions — scoped to the diff only; normalize to CRITICAL/HIGH/MEDIUM/LOW and treat MEDIUM+ as blocking; write a ranked report to <path>."` so the session spawns the lens subagents and merges their findings.

## Mirroring the CI claude-review gate (pre-PR)

When you run this skill **before opening or updating a PR**, align it to the same gate the CI review bot will apply, so a clean local pass predicts a bot approval and you clear every blocker before spending a GitHub Actions round-trip. (This complements the `auto-pr` skill, which owns the full create → review → merge lifecycle; use this section when you want the local pass to mirror that flow's CI gate.)

Many repos wire a required GitHub review bot via a thin caller workflow under `.github/workflows/` whose step does `uses: ShiplightAI/internal-tools/claude-review@<ref>`. That bot classifies findings CRITICAL/HIGH/MEDIUM/LOW and **requests changes on any CRITICAL, HIGH, or MEDIUM** — the *same* MEDIUM+ bar this skill already enforces. So the only repo-specific thing to source is the emphasis the bot is told to weight. Do NOT copy that emphasis into this skill or a script — derive it from the canonical config at review time:

1. **Detect the gate.** Look for a workflow in `.github/workflows/` with a step `uses: ShiplightAI/internal-tools/claude-review@<ref>` (grep the workflows dir). If none is wired, skip this section and run the normal multi-lens review.
2. **Adopt the repo's review-focus.** That caller workflow passes a `review-focus:` input — the repo's own invariants the bot weights (e.g. data-access boundaries, identity segregation, migration safety, UI rules). Read it directly from the workflow file and use it as this skill's focus string (see "Optional focus"), merged with any focus the user passed. This is the single source of truth for the focus — it updates automatically when the workflow changes.
3. **Match the scope.** The bot reviews the PR diff against its base branch; scope all lenses to the same diff (base = the PR's target branch, defaulting to `main`).
4. **(Optional) verbatim base prompt.** The bot's base prompt + severity wording live in the action at the pinned ref. The five lenses and the MEDIUM+ bar already match it, so this is rarely needed — fetch it only if you want the exact wording:
   ```bash
   gh api "repos/ShiplightAI/internal-tools/contents/claude-review/action.yml?ref=<ref>" \
     --jq '.content' | base64 -d
   ```

Then run the normal review-fix loop and report the outcome in the bot's terms: **PASS** (no CRITICAL/HIGH/MEDIUM — the bot would approve) or **BLOCKED** (list each blocker with `file:line`). Reaching PASS locally is the state to be in before you push.

## Saving a report

The skill writes a file only when the prompt asks for it. Default convention:

- Path: `code-reviews/<feature-slug>/code-review-<YYYY-MM-DD>-round-<N>.md`
  - `<feature-slug>`: a short kebab-case slug for the change under review (feature / branch / area), so each change gets its own subdirectory.
  - `<YYYY-MM-DD>`: the review date (`$(date +%F)`).
  - `<N>`: the review round, starting at 1 and incrementing per re-review of the same change.
  - Example: `code-reviews/enterprise-billing-reconciliation/code-review-2026-05-23-round-1.md`.
- Per finding: **lens** (correctness/security/performance/test-coverage/conventions), severity, `file:line`, the issue, a concrete failure scenario, and a fix direction. Plus a short "verified-and-cleared" section for things checked that are NOT issues.
- Severity scale: use the unified **CRITICAL** / **HIGH** / **MEDIUM** / **LOW** scale from "Review lenses & blocking bar". CRITICAL/HIGH/MEDIUM are blockers; LOW is non-blocking.

## Review-fix loop

By default, this skill is an active review-and-remediation loop, not a report-only pass. The bar: **MEDIUM or higher is blocking.** Unless the user explicitly asks for review-only output:

1. Run the full multi-lens pass on the current diff (the five lenses, then merge + dedupe — see "Review lenses & blocking bar").
2. Address every blocking finding — anything **CRITICAL**, **HIGH**, or **MEDIUM** — across all lenses. Keep fixes within the requested scope.
3. Run the relevant targeted verification for the fixes.
4. Run a fresh multi-lens pass on the updated diff.
5. Repeat this review -> fix -> verify -> fresh review loop until the latest pass has no **CRITICAL**, **HIGH**, or **MEDIUM** findings in any lens.

Treat **LOW** items as optional; fix them only when the fix is cheap and low-risk. Do not stop after the first review if blocking findings remain. Stop only when blockers are gone, the user asked for review-only output, or a blocking finding cannot be resolved safely; in that case, explain the blocker clearly.

## Multi-round reviews

A change usually needs more than one pass. Treat each round as a **fresh full multi-lens pass** over the whole current diff — do NOT assume prior conclusions still hold (a later commit can introduce a bug into previously-cleared code). Seed each new round with the previous report so it tracks finding lifecycle:

1. Read the previous round's report in `code-reviews/<feature-slug>/` (`...-round-<N-1>.md`).
2. Reconcile each prior finding as **Fixed** / **Still-open** / **Regressed**.
3. Then surface any **New** findings from the fresh pass.
4. Write the result to the next file in the same directory (`...-round-<N>.md`).

Prefer this "fresh + reconcile" pattern over resuming a session: a resumed session anchors on its own prior conclusions and grows expensive, whereas seeding from the report file gives continuity without anchoring or context bloat.

## After the review

Inspect the output, fix blockers (**CRITICAL** / **HIGH** / **MEDIUM**) first, address cheap LOW nits, and keep fixes within the requested scope.
