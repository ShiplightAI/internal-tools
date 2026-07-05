# github-workflows

Copy-in GitHub Actions workflows for **internal** Shiplight repos. These can't be
applied org-wide via "required workflows" — `anthropics/claude-code-action`'s
anti-tampering guard requires the review workflow to live on the *target repo's*
own default branch.

## `claude-code-review.yml` (+ the `claude-review` action)

A PR review that classifies findings by severity and submits a **formal** review:
**approve** when there are no CRITICAL/HIGH issues, **request-changes** for any
CRITICAL/HIGH, **comment** when it can't confidently classify. The approval is
submitted by the Claude GitHub App (via OIDC), a non-author identity, so it
satisfies a "require 1 approving review" branch ruleset. Pairs with the `auto-pr`
skill.

The substance lives in the **`claude-review` composite action** (`../claude-review`)
— prompt, approval logic, and the pinned `checkout` / `claude-code-action` refs.
The per-repo workflow is just the trigger + permissions + one `uses:`, so updating
the prompt or bumping the pinned action is a one-line change here, not a sweep
across every repo.

### Adopt it in a repo

1. Copy `claude-code-review.yml` to `.github/workflows/claude-code-review.yml`.
2. Ensure the repo has the `CLAUDE_CODE_OAUTH_TOKEN` secret (org-level is fine)
   and the Claude GitHub App installed.
3. Pin the action ref (`claude-review@main` → a tag) for production.
4. (Optional) set `review-focus:` for a repo-specific emphasis.
5. (Optional) add a branch ruleset requiring 1 approving review so the bot's
   approval gates merge.

### Notes

- **The PR that adds or edits the per-repo `claude-code-review.yml` self-skips its
  own review** (the guard sees the workflow change), so that one PR is a manual
  merge. Every PR after it lands gets auto-reviewed. Editing only the
  `claude-review` action does NOT trip the guard in consumer repos — that's the
  point of the split.
- `internal-tools` must allow its Actions to be used by other org repos
  (Settings → Actions → Access → "Accessible from repositories in the
  organization"), or callers fail to resolve the action.
