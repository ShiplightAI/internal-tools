# github-workflows

Canonical GitHub Actions workflows for **internal** Shiplight repos. These are
**copy-in templates**, not org-applied: GitHub's org-level "required workflows"
can't be used here because `anthropics/claude-code-action`'s anti-tampering guard
requires the workflow to live on the *target repo's* own default branch.

## `claude-code-review.yml`

A PR review that classifies findings by severity and submits a **formal** review:
**approve** when there are no CRITICAL/HIGH issues, **request-changes** for any
CRITICAL/HIGH, **comment** when it can't confidently classify. The approval is
submitted by the Claude GitHub App (via OIDC), a non-author identity, so it
satisfies a "require 1 approving review" branch ruleset.

### Adopt it in a repo

1. Copy this file to `.github/workflows/claude-code-review.yml` in the target repo.
2. Ensure the repo has the `CLAUDE_CODE_OAUTH_TOKEN` secret (org-level is fine)
   and the Claude GitHub App installed.
3. (Optional) add a branch ruleset requiring 1 approving review, so the bot's
   approval gates merge. Pairs with the `auto-pr` skill.
4. Customize the `prompt:` for the repo's domain if useful (e.g. a security focus
   for high-trust CI tooling).

### Notes

- Third-party actions are pinned to commit SHAs (with `# v6`/`# v1` comments).
  Re-pin when bumping.
- **The PR that adds or edits this file self-skips its own review** (the guard
  sees the workflow change), so that one PR is a manual merge. Every PR after it
  lands gets auto-reviewed.
- It can't be centralized further (reusable workflow / org required-workflow)
  without the guard skipping — keep it as a per-repo copy.
