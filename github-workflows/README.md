# GitHub Actions

## Claude PR review

The `claude-review` composite action submits a formal review: CRITICAL, HIGH,
and MEDIUM findings request changes; no such findings allows approval; uncertainty
produces a comment. Model reviews supplement human review. Do not use a bot
approval as the sole authorization to merge untrusted changes.

1. Copy `claude-code-review.yml` to your repository's `.github/workflows/` directory.
2. Install the Claude GitHub App and configure `CLAUDE_CODE_OAUTH_TOKEN` as a
   repository secret or an organization secret available to the repository.
3. Replace `@v1` in the copied file with the full commit SHA of the version you
   have reviewed. Resolve it with:

   ```bash
   git ls-remote https://github.com/ShiplightAI/internal-tools.git refs/tags/v1
   ```

   `v1` is a moving compatibility tag, not an immutable security boundary.
4. Optionally add trusted repository-specific guidance to `review-focus`.
5. Require credential-free tests and human code-owner approval in branch protection.

The workflow uses `pull_request` and deliberately skips fork and Dependabot PRs,
which do not receive the review secret. Run tests without credentials for all
contributors and have maintainers review outside contributions. Do not change
this to `pull_request_target` while checking out or executing PR-controlled code.
Only give same-repository branch access to trusted contributors.

The trigger and permissions belong in the caller workflow. The review prompt and
third-party action pins belong in the composite action. The upstream review
action has a workflow-tampering guard, so changes to the caller workflow need
human review. This repository loads its own composite action from the PR's base
commit before the action checks out the code under review.

While this repository has internal visibility, callers also need access under
Settings → Actions → General → Access. Publication removes that private-action
access requirement; it does not supply Claude credentials to callers.

## Release notes

`release-notes` reuses the caller's checkout, fetches history, installs the Claude
CLI, and sends commit messages and a diffstat to Claude. Use a GitHub-hosted Linux
runner with Git, Node.js/npm, and `timeout`. Pin the action to a reviewed full
commit SHA just as for `claude-review`.

The inputs are documented in [action.yml](../release-notes/action.yml). Provide
`to-ref`, normally a release tag, and `from-ref`, normally the previous tag.
With no `from-ref`, the current implementation starts after the first commit.
Use either `claude_code_oauth_token` or `anthropic_api_key` for authentication.
Keep `notes-focus` and `output-file` under maintainer control; use a single-line
absolute output path.

The generator disables model tools, project/user settings, and configured MCP
servers, and bounds model attempts. Model failure produces no notes. Fetch,
installation, and prompt-building failures can still fail the action: set
`continue-on-error: true` on the caller step if release notes must never block a
release. Use `gh release create --notes-file` only when `generated` is `true`;
otherwise fall back to `--generate-notes`.

Generated notes are untrusted prose. Review them before publication. The CLI
package version is pinned in the action; review and test changes to that pin
alongside the action's security controls.
