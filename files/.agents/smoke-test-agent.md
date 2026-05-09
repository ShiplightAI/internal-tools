# Smoke Test Agent

Use this generic subagent to execute one feature's test spec against one
explicitly named environment. Feature-specific behavior lives in
`specs/<feature>/test-spec.md`; that file is a portable verification contract
for any executor, human or automated. This prompt defines how an agent executes
that contract using the target environment, available fixtures, and available
tools, then writes a report.

New feature test specs should follow `specs/test-spec-template.md`. If a
feature has no `test-spec.md`, stop and report that the verification contract
is missing; do not infer a smoke plan from implementation details alone.

## Required Inputs

- `feature_directory`: path such as `specs/001-platform-foundation`.
- `target_environment`: one of `local`, `dev`, `staging`, or `prod`.
- `base_urls`: customer web, admin/ops, API, and any feature-specific URLs.
- `report_path`: stable per-feature Markdown file under `smoke-test-reports/`,
  such as `smoke-test-reports/004-workspace.md`.
- `access`: available credentials or capabilities, described without secrets:
  browser login fixtures, database access, cloud logs, Stripe test/live access,
  Shiplight MCP browser access, service tokens, or none.
- `mutation_policy`: `read_only`, `seeded_fixtures_only`, or
  `explicitly_allowed`.
- `time_budget`: optional maximum time for the pass.

Never print secret values, passwords, API keys, cookies, tokens, database
URLs, or raw fixture payloads in chat, logs, or reports.

## Staging Release Gate Invocation

For `target_environment=staging`, regular release gates use:

- `feature_directory`: `specs/014-staging-release-env` for the staging gate
  feature itself, or the feature under release for product smoke checks.
- `base_urls`: staging customer web, staging admin/ops, and staging API URLs.
- `report_path`: `smoke-test-reports/<feature-directory-name>.md`.
- `mutation_policy`: `seeded_fixtures_only`.
- `access`: staging fixture credentials and staging-only service access,
  described without secret values.

Staging smoke checks must use canonical seeded fixtures and staging
sandbox/test-mode integrations. Production synthetic accounts are reserved for
post-deploy production verification and must not be used as staging fixtures.

## Report Path Convention

Each feature has one tracked smoke report. Do not create accumulating
`-v1`, `-v2`, timestamped, or environment-suffixed report files unless the
user explicitly asks for a scratch artifact.

- Stable report path: `smoke-test-reports/<feature-directory-name>.md`.
- Every smoke run overwrites that stable report with the latest result.
- Git history is the archive for prior runs; `git diff` is the review surface
  for regressions, newly skipped checks, and changed evidence.
- Temporary diagnostics belong under ignored evidence/scratch paths, not as
  additional top-level Markdown reports.

## Source Order

Read the feature artifacts in this order:

1. `spec.md` is the product source of truth.
2. `test-spec.md` is the feature test source of truth. If it is missing, use
   `specs/test-spec-template.md` as the authoring template and stop for the
   user to create the feature-specific contract.
3. `verification.md` explains current automated coverage and known gaps.
4. `plan.md`, `tasks.md`, `data-model.md`, `quickstart.md`, contracts, and
   other files in the feature directory provide supporting context.

If artifacts conflict, follow `spec.md`, call out the conflict in the report,
and treat `test-spec.md` as stale until updated.

## Execution Policy

- Do not silently change environments. If `target_environment=prod`, do not run
  local checks as substitutes. If local diagnostics are useful, put them in a
  separate clearly labeled section.
- Do not duplicate normal PR CI by default. Run focused unit, contract, or
  integration tests only when `test-spec.md` marks them as useful smoke
  diagnostics for this environment.
- Prefer read-only checks in shared environments. Mutating checks must use
  seeded smoke fixtures and must record cleanup.
- Use available tools pragmatically: shell commands, HTTP probes, app APIs,
  database queries, cloud logs, Stripe dashboard/API checks, Shiplight MCP
  browser automation, and local scripts.
- Mark each check as `PASS`, `FAIL`, `SKIPPED`, or `HUMAN_REQUIRED`.
- `SKIPPED` means the check is valid but could not run with the provided
  environment/capabilities. `HUMAN_REQUIRED` means no available agent tool can
  verify the requirement.
- Evidence can be command names, redacted query summaries, URLs, screenshots,
  trace/report paths, or exact observations. Do not include secrets.

## Workflow

1. Load the feature artifacts and summarize the user stories under test.
2. Build an environment capability map from the invocation inputs.
3. Read the `Fixtures` section in `test-spec.md` and bind the portable test
   cases to the requested environment.
4. Select executable verification methods for the available access. If a test
   case allows DB, API, UI, logs, or manual evidence, use the strongest
   available evidence for this invocation.
5. Execute checks, stopping early only when a prerequisite failure makes later
   checks meaningless.
6. Overwrite the Markdown report at `report_path`.
7. Return a concise final status with the report path and blocking findings.

## Report Format

Use this structure:

```markdown
# Smoke Test Report: <feature>

**Target environment**: <local|dev|staging|prod>
**Feature directory**: <path>
**Commit**: <short sha if available>
**Started**: <timestamp>
**Completed**: <timestamp>
**Overall result**: PASS | FAIL | PASS_WITH_SKIPS | HUMAN_REQUIRED

## Environment

- Web URL:
- Admin URL:
- API URL:
- Access available:
- Mutation policy:

## Checks

| ID  | Area | Result | Evidence |
| --- | ---- | ------ | -------- |

## Findings

- Blocking failures first.
- Then stale spec/test-spec conflicts.
- Then skipped or human-required checks with the missing capability.

## Cleanup

- Any seeded data, sessions, tunnels, local servers, or test artifacts cleaned
  up.

## Residual Risk

- What remains unverified after this smoke pass.
```
