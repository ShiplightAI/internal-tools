---
name: auto-pr
description: Create a PR against the repo's base branch, wait for the Claude bot review, fix critical issues, merge, and reflect on durable lessons into AGENTS.md
user_invocable: true
---

# Auto PR

Create a PR against the appropriate base branch, wait for the GitHub `claude[bot]` review, fix critical issues, and merge.

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
   - This is not a one-time step: **repeat the fetch + rebase immediately before every push in this flow** (steps 3, 6, and 7). Review rounds take minutes and upstream keeps moving — rebasing before each push surfaces conflicts locally instead of at merge time.

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

5. **Wait for Claude bot review** (required if the bot is installed in this repo):

   **The bot posts to one of two surfaces, depending on how the repo's workflow is
   configured — check BOTH.** Some repos get an **issue comment**; others get a
   **PR review** (with a `state` of `APPROVED` / `CHANGES_REQUESTED` / `COMMENTED`).
   Polling only one surface makes a review that has already landed look like a bot
   that isn't installed, and burns the full timeout before you notice:

   ```bash
   # PR review surface
   gh api repos/{owner}/{repo}/pulls/<PR_NUMBER>/reviews \
     --jq '[.[] | select(.user.login == "claude[bot]")] | last | "\(.state)\n\(.body)"'
   # Issue-comment surface
   gh api repos/{owner}/{repo}/issues/<PR_NUMBER>/comments \
     --jq '[.[] | select(.user.login == "claude[bot]")] | last | .body'
   ```

   **Prefer the workflow run as the readiness signal** — it is unambiguous across
   re-reviews, where "is this the new review or the previous one?" otherwise needs
   timestamp comparison. Gate on the review workflow having completed *for the
   current HEAD sha*:

   ```bash
   gh run list --branch <branch-name> --limit 10 \
     --json name,status,conclusion,headSha \
     --jq "[.[] | select(.headSha==\"$(git rev-parse HEAD)\"
            and (.name | test(\"claude\"; \"i\")) and .status==\"completed\")] | length"
   ```

   - **Do not chain `sleep` calls to poll.** Run ONE backgrounded `until` loop that
     exits when the condition is true — e.g.
     `until [ "$(…count…)" != "0" ]; do sleep 30; done` with `run_in_background: true` —
     and keep working until it notifies you. Sleep-chaining is both slower and
     blocked by some harnesses.
   - Allow up to 10 minutes; a first review commonly takes 6+ minutes, and a
     re-review can take longer than the first.
   - On the issue-comment surface, a review is ready when the **latest** claude[bot]
     comment is NOT `[This comment was superseded by a more complete review posted below.]`
     — superseded comments are placeholders for in-progress re-reviews.
   - If the timeout expires with **no** claude[bot] comment **and** no claude[bot]
     review **and** no matching workflow run, the bot is likely not installed here.
     **Ask the user** whether to skip the bot wait and proceed to merge, or to stop.
   - If a review exists but is still a superseded placeholder after 10 minutes,
     **stop and tell the user** — it is in-flight but slow.

6. **Read and act on the bot review** (max 3 iterations):
   - **Always read the full review text** — do NOT just check the `claude-review` check status. A check may pass even when the review lists BUG or critical issues that should be fixed.
   - Look for items labeled **BUG**, **CRITICAL**, or **🔴** in the review body — these must be fixed before merging
   - Items labeled **MINOR**, **NIT**, **SUGGESTION**, or **LOGIC LOOKS CORRECT** are informational and do not block merging, but fix them if the fix is trivial
   - On the PR-review surface, the verdict is `.state` (`CHANGES_REQUESTED` blocks, `APPROVED` does not). Findings labelled **LOW** and explicitly marked "no action required" do not block — do not invent changes to clear them.
   - For each blocking issue: fix it, commit, rebase on `origin/<BASE>` (step 2), push, and wait for the bot to post a new review (on the issue-comment surface the old review is superseded; on the review surface a *new* review is appended, so compare `submitted_at` or gate on the workflow run for the new HEAD sha)
   - Repeat until no blocking issues remain or 3 iterations are exhausted
   - If still blocking after 3 iterations, **stop and tell the user**

7. **Merge**:
   - Verify all required checks pass: `gh pr checks <PR_NUMBER>`
   - Merge with: `gh pr merge <PR_NUMBER> --rebase`
   - If the merge fails because the branch is behind `<BASE>`, redo the fetch + rebase from step 2, push with `--force-with-lease`, wait for checks, and retry the merge once
   - If merge fails due to branch protections, inform the user
   - Return the merged PR URL

8. **Reflect** (post-merge, optional but preferred):
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
- The Claude bot posts as **either** an issue comment **or** a PR review, depending on the repo's workflow config — always check both `/issues/<n>/comments` and `/pulls/<n>/reviews`. Treating one as the only surface reports "bot not installed" for a review that already landed.
- A passing `claude-review` **check** does not mean the review approved: the check can pass while the review is `CHANGES_REQUESTED`. Read `.state` and the body, never the check alone.
- Reflection (step 8) runs only after a successful merge and never blocks it; it proposes `AGENTS.md` updates but applies none without user approval
- Keep commit messages clean and professional
- Never auto-commit uncommitted changes — ask the user first
