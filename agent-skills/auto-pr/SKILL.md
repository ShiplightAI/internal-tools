---
name: auto-pr
description: Create a PR against the repo's base branch, run a local pre-review, then wait for the Claude bot review, fix critical issues, merge, and reflect on durable lessons into AGENTS.md
user_invocable: true
---

# Auto PR

Create a PR against the appropriate base branch, run a fast local pre-review, then wait for the GitHub `claude[bot]` review (still required), fix critical issues from both, and merge.

The local `/code-review:code-review` skill is a **pre-pass**, not a replacement for the bot. It returns findings in-conversation in seconds, so we can fix obvious issues before the GHA-based bot review picks up the diff — saving expensive GHA round-trips. The bot review is still authoritative and must be addressed.

## Resolving the base branch

Before doing anything else, decide what branch the PR will target. Use the **first** that resolves:

1. **Explicit argument** — if the skill was invoked with a branch name (e.g. `/auto-pr staging`), use it.
2. **Repo CLAUDE.md** — if the repo's `CLAUDE.md` (or `.claude/CLAUDE.md`) names a base branch for PRs (look for phrases like "PRs target X", "base branch is X", "cut PRs against X"), use that.
3. **Repo default branch** — fall back to `gh api repos/{owner}/{repo} --jq .default_branch`.

Store this as `<BASE>` and use it for the rest of the run. Mention which source you used in your first status message so the user can correct you if wrong.

## Instructions

1. **Check for uncommitted changes**: Run `git status`. If there are uncommitted changes, **ask the user** to review and commit them first. Do NOT auto-commit — the user should decide what to stage.

2. **Rebase on latest base**:
   - `git fetch origin <BASE>`
   - `git rebase origin/<BASE>`
   - If there are conflicts, **resolve them yourself**: read both sides of each conflict, understand what the upstream change and this branch's change each intend, and produce a resolution that preserves both intents. Then `git add` the resolved files and `git rebase --continue` until the rebase completes.
   - After resolving, **verify the result**: run the repo's build/tests (or at minimum the checks relevant to the conflicted files) before pushing — a syntactically clean resolution can still be semantically wrong.
   - **Escalate instead of guessing**: if a conflict's correct resolution is genuinely unclear — the two sides make incompatible design choices, the upstream change is large or unfamiliar, or verification fails after your best attempt — run `git rebase --abort` to restore the branch to its pre-rebase state, then **stop and ask the user** for help, describing the conflicting files and what each side is trying to do. Never push a resolution you are unsure about.
   - This is not a one-time step: **repeat the fetch + rebase immediately before every push in this flow** (steps 3, 6, and 8). Review rounds take minutes and upstream keeps moving — rebasing before each push surfaces conflicts locally instead of at merge time.

3. **Push to remote**: `git push -u origin <branch-name>` (use `--force-with-lease` if the rebase rewrote history)

4. **Create or update PR against `<BASE>`**:
   - Check if a PR already exists: `gh pr list --head <branch-name> --json number`
   - If exists, update with `gh pr edit`
   - If not, create with `gh pr create --base <BASE>`
   - Generate PR title and body from `git log origin/<BASE>..HEAD --oneline` and `git diff origin/<BASE>...HEAD --stat`
   - Use this format:

   ```
   gh pr create --base <BASE> --title "<type>: <description>" --body "$(cat <<'EOF'
   ## Summary
   <bullet points from commit history>

   ## Test plan
   - [ ] <test items>
   EOF
   )"
   ```

5. **Local pre-review** (fast pass, optional but preferred):
   - If `code-review:code-review` is in the available skills list, invoke it via the Skill tool: `Skill(skill="code-review:code-review", args="<PR_NUMBER>")`
   - Do NOT pass `--comment` — we read findings in-conversation; the bot will post its own review on the PR
   - Findings come back directly in the conversation, no polling
   - If the skill is unavailable or errors out, skip this step and proceed to step 6 — the bot review in step 7 still runs
   - **Act on local findings before waiting for the bot** (max 2 local iterations):
     - Fix items labeled **BUG**, **CRITICAL**, or **🔴**
     - Fix trivial **MINOR**/**NIT**/**SUGGESTION** items if cheap
     - Commit, rebase on `origin/<BASE>` (step 2), push, and re-invoke the local skill on the updated HEAD
     - Treat each re-invocation as a **fresh** review and reconcile prior findings (Fixed / Still-open / Regressed) before acting — a fix can regress previously-clean code
     - Stop iterating locally once no blocking issues remain or after 2 passes — diminishing returns; the bot will catch what's left

6. **Push any pre-review fixes** to the PR branch (if step 5 made changes), rebasing on `origin/<BASE>` first (step 2). The PR auto-updates; the bot picks up the latest HEAD.

7. **Wait for Claude bot review** (required if the bot is installed in this repo):
   - The Claude bot posts as an **issue comment** (not a PR review)
   - Poll with: `gh api repos/{owner}/{repo}/issues/<PR_NUMBER>/comments --jq '[.[] | select(.user.login == "claude[bot]")] | last | .body'`
   - Wait 60 seconds between checks, up to 10 minutes
   - A review is ready when the **latest** claude[bot] comment is NOT the text `[This comment was superseded by a more complete review posted below.]` — superseded comments are placeholders for in-progress re-reviews
   - If the 10-minute timeout expires without **any** claude[bot] comment, the bot is likely not installed in this repo. **Ask the user** whether to skip the bot wait and proceed to merge, or to stop.
   - If at least one claude[bot] comment exists but the latest is still a superseded placeholder after 10 minutes, **stop and tell the user** — the review is in-flight but slow.
   - If pre-review fixes (step 5) were pushed, make sure you're reading a bot comment that landed **after** the latest push — older comments may reflect a stale diff

8. **Read and act on the bot review** (max 3 iterations):
   - **Always read the full review text** — do NOT just check the `claude-review` check status. A check may pass even when the review lists BUG or critical issues that should be fixed.
   - Look for items labeled **BUG**, **CRITICAL**, or **🔴** in the review body — these must be fixed before merging
   - Items labeled **MINOR**, **NIT**, **SUGGESTION**, or **LOGIC LOOKS CORRECT** are informational and do not block merging, but fix them if the fix is trivial
   - For each blocking issue: fix it, commit, rebase on `origin/<BASE>` (step 2), push, and wait for the bot to post a new review (the old review will be superseded)
   - Optionally re-run the local pre-review (step 5) on the updated diff to validate fixes before waiting on the bot again — speeds up iteration (treat each re-run as a fresh review that reconciles prior findings)
   - Repeat until no blocking issues remain or 3 iterations are exhausted
   - If still blocking after 3 iterations, **stop and tell the user**

9. **Merge**:
   - Verify all required checks pass: `gh pr checks <PR_NUMBER>`
   - Merge with: `gh pr merge <PR_NUMBER> --rebase`
   - If the merge fails because the branch is behind `<BASE>`, redo the fetch + rebase from step 2, push with `--force-with-lease`, wait for checks, and retry the merge once
   - If merge fails due to branch protections, inform the user
   - Return the merged PR URL

10. **Reflect** (post-merge, optional but preferred):
    - If `reflect` is in the available skills list, invoke it via the Skill tool after a successful merge: `Skill(skill="reflect")`
    - It harvests durable knowledge from this session — user corrections, rejected approaches, review findings — reconciles it against the relevant `AGENTS.md` files by scope, and presents proposed updates for the user to approve
    - Most PRs teach nothing worth recording; a "nothing to capture" result is normal and fine
    - The reflect skill owns the user-approval gate for any `AGENTS.md` change — do not apply edits here
    - If the skill is unavailable or errors out, skip it — the merge already succeeded

## Important

- The base branch is resolved once at the start (see "Resolving the base branch") — use the resolved `<BASE>` consistently for `git fetch`, `git rebase`, `gh pr create --base`, and the diff/log commands. Never assume `main` or `staging`.
- **Every push must be preceded by a fresh `git fetch origin <BASE>` + `git rebase origin/<BASE>`** — not just the first one. After a rebase that rewrote history, push with `--force-with-lease` (never plain `--force`). Resolve rebase conflicts yourself and verify before pushing; if a resolution is genuinely unclear, `git rebase --abort` and ask the user, per step 2.
- Use `repos/{owner}/{repo}` placeholders in `gh api` calls — `gh` substitutes the current repo, so the skill works in any repo without hardcoding the owner/name.
- Do not add Co-Authored-By or generation metadata to commits
- The local `/code-review:code-review` skill is a pre-pass to reduce GHA round-trips — it does NOT replace the bot review; the bot review in step 7 is required before merge **when the bot is installed**. If the bot never posts, ask the user before merging without it.
- For a deeper **standalone** review outside the PR flow (effort levels, saving a ranked round-N report, multi-round reconciliation), use the `code-review-run` skill.
- When invoking the local skill, do NOT pass `--comment`; act on findings in-conversation rather than duplicating comments on the PR (the bot does that)
- The Claude bot posts as issue comments, NOT PR reviews — use `/issues/` API not `/pulls/.../reviews`
- Reflection (step 10) runs only after a successful merge and never blocks it; it proposes `AGENTS.md` updates but applies none without user approval
- Keep commit messages clean and professional
- Never auto-commit uncommitted changes — ask the user first
