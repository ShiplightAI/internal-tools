---
name: auto-pr
description: Create a PR against staging, run a local pre-review, then wait for the Claude bot review, fix critical issues, and merge
user_invocable: true
---

# Auto PR

Create a PR against staging, run a fast local pre-review, then wait for the GitHub `claude[bot]` review (still required), fix critical issues from both, and merge.

The local `/code-review:code-review` skill is a **pre-pass**, not a replacement for the bot. It returns findings in-conversation in seconds, so we can fix obvious issues before the GHA-based bot review picks up the diff — saving expensive GHA round-trips. The bot review is still authoritative and must be addressed.

## Instructions

1. **Check for uncommitted changes**: Run `git status`. If there are uncommitted changes, **ask the user** to review and commit them first. Do NOT auto-commit — the user should decide what to stage.

2. **Rebase on latest staging**:
   - `git fetch origin staging`
   - `git rebase origin/staging`
   - If there are conflicts, **stop and tell the user** — do not attempt to resolve conflicts automatically

3. **Push to remote**: `git push -u origin <branch-name>` (use `--force-with-lease` if the rebase rewrote history)

4. **Create or update PR against staging**:
   - Check if a PR already exists: `gh pr list --head <branch-name> --json number`
   - If exists, update with `gh pr edit`
   - If not, create with `gh pr create --base staging`
   - Generate PR title and body from `git log origin/staging..HEAD --oneline` and `git diff origin/staging...HEAD --stat`
   - Use this format:

   ```
   gh pr create --base staging --title "<type>: <description>" --body "$(cat <<'EOF'
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
     - Commit, push, and re-invoke the local skill on the updated HEAD
     - Stop iterating locally once no blocking issues remain or after 2 passes — diminishing returns; the bot will catch what's left

6. **Push any pre-review fixes** to the PR branch (if step 5 made changes). The PR auto-updates; the bot picks up the latest HEAD.

7. **Wait for Claude bot review** (always required — not skippable):
   - The Claude bot posts as an **issue comment** (not a PR review)
   - Poll with: `gh api repos/ShiplightAI/shipyard/issues/<PR_NUMBER>/comments --jq '[.[] | select(.user.login == "claude[bot]")] | last | .body'`
   - Wait 60 seconds between checks, up to 10 minutes
   - A review is ready when the **latest** claude[bot] comment is NOT the text `[This comment was superseded by a more complete review posted below.]` — superseded comments are placeholders for in-progress re-reviews
   - If the 10-minute timeout expires without a review, **stop and tell the user** — do not proceed to merge
   - If pre-review fixes (step 5) were pushed, make sure you're reading a bot comment that landed **after** the latest push — older comments may reflect a stale diff

8. **Read and act on the bot review** (max 3 iterations):
   - **Always read the full review text** — do NOT just check the `claude-review` check status. A check may pass even when the review lists BUG or critical issues that should be fixed.
   - Look for items labeled **BUG**, **CRITICAL**, or **🔴** in the review body — these must be fixed before merging
   - Items labeled **MINOR**, **NIT**, **SUGGESTION**, or **LOGIC LOOKS CORRECT** are informational and do not block merging, but fix them if the fix is trivial
   - For each blocking issue: fix it, commit, push, and wait for the bot to post a new review (the old review will be superseded)
   - Optionally re-run the local pre-review (step 5) on the updated diff to validate fixes before waiting on the bot again — speeds up iteration
   - Repeat until no blocking issues remain or 3 iterations are exhausted
   - If still blocking after 3 iterations, **stop and tell the user**

9. **Merge**:
   - Verify all required checks pass: `gh pr checks <PR_NUMBER>`
   - Merge with: `gh pr merge <PR_NUMBER> --rebase`
   - If merge fails due to branch protections, inform the user
   - Return the merged PR URL

## Important

- Always create PRs against the `staging` branch
- Do not add Co-Authored-By or generation metadata to commits
- The local `/code-review:code-review` skill is a pre-pass to reduce GHA round-trips — it does NOT replace the bot review; the bot review in step 7 is always required before merge
- When invoking the local skill, do NOT pass `--comment`; act on findings in-conversation rather than duplicating comments on the PR (the bot does that)
- The Claude bot posts as issue comments, NOT PR reviews — use `/issues/` API not `/pulls/.../reviews`
- Keep commit messages clean and professional
- Never auto-commit uncommitted changes — ask the user first
