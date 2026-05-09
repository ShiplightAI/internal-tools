---
name: speckit-verify
description: After implementing a spec, audit the test coverage against FRs/SCs, log manual verification, list untested areas, and write the result to specs/<n>/verification.md for future release sweeps
user_invocable: true
---

# Speckit Verify

Coverage audit + manual-verification log + deferred-areas tracker that runs after `/speckit-implement`. Produces `specs/<n>/verification.md` so anyone preparing a release can grep for `NOT MEASURED` or unchecked manual items across all features and know exactly what to retest.

This skill is **NOT** a replacement for the project's UI-verification tool (whatever drives a real browser end-to-end). That tool is one input; this skill produces a wider audit doc that can reference its output.

## Goal

For a feature whose `spec.md` + `plan.md` + `tasks.md` already exist (and ideally where `/speckit-implement` has run), produce a `verification.md` that has these sections:

1. **Tests added** — counts by type (contract / integration / unit / e2e / script-based), with file paths and per-file test counts.
2. **Coverage matrix** — every FR-### and SC-### from spec.md mapped to a test, with statuses: `COVERED` / `PARTIAL` / `IMPLICIT` / `NOT COVERED` / `NOT MEASURED` / `MANUAL`.
3. **Agent verification** — what the implementing agent (Claude) did during `/speckit-implement` that ISN'T in the test suite: typecheck, migrations applied, smoke-runs, schema verifications, lint passes, etc. This is verification activity that happened but isn't reproducible from CI alone.
4. **Manual / human verification** — what the human personally clicked / curl'd / observed in a real environment. Captured interactively. Distinct from agent verification because some checks (browser UI rendering, real-environment latency, third-party-integration sanity) require a human or a deployed environment.
5. **Untested / deferred areas** — explicit checklist of what the release-sweep agent must run before shipping. Each item has a "how to retest" hint.

The doc is written for a future "before-release sweep" agent, not for implementation. It should be machine-readable enough that grep can find blockers (look for `[ ]`, `NOT MEASURED`, `NOT COVERED`).

This repo also expects every actionable feature to have a `test-spec.md`
portable verification contract. That artifact is repo-local, not part of
upstream Spec Kit. Use `specs/test-spec-template.md` as the template when a new
feature needs one.

## Three verification buckets

Critical convention: keep these three buckets distinct.

| Bucket                          | What it captures                                                                                                                                                                                                                                          | Reproducible from?                                                                              | Evidence requirement                                                                                                                                                                    |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Automated tests**             | Anything in the project's test directories that the test runner executes                                                                                                                                                                                  | CI                                                                                              | CI run output                                                                                                                                                                           |
| **Agent verification**          | What the implementing agent did during implementation that isn't a test: typecheck, migration apply + verify, dry-runs, smoke probes against the real backend, **browser walk-throughs the agent itself drove via the project's UI-verification tooling** | Re-running the implementation skill would do most of this; not currently captured anywhere else | **Browser walks: a watchable evidence artifact (video / trace / report) — mandatory, see "Agent browser-walk evidence" below. Non-browser checks: command output pasted into the doc.** |
| **Manual / human verification** | Browser UI walk-throughs, real-environment curls, third-party-integration sanity (webhooks, OAuth callbacks against real domains) — all **performed by the human**, not the agent                                                                         | Only by a human (or by a future agent that reproduces the steps)                                | Optional — the human is the witness; if a UI-verification tool was used, link its report                                                                                                |

The release-sweep agent treats the buckets differently:

- Automated tests → re-run them on the release commit; all green = green.
- Agent verification → re-run the listed steps; any failure blocks. The evidence artifact is what the human reviews to confirm the prior run was valid.
- Manual / human verification → schedule a human sweep using the project's UI-verification tool for browser flows and ad-hoc curls for everything else.

## Agent browser-walk evidence (mandatory)

When the agent itself drives a browser as part of verification, it **MUST** produce a watchable evidence artifact. The user has no other way to audit whether the agent's "verified ✅" claim is real — text claims and stepwise screenshots are not auditable.

The exact tooling depends on the project, but the contract is:

1. Open the session in **recording mode** so the run produces a video and (if the tool supports it) an interaction trace.
2. After the walk, generate a viewer-friendly **report** (HTML or equivalent) that lists each pass-criterion the agent asserts it verified, with the recording embedded or linked.
3. Save the report inside the repo's evidence directory (or upload it and capture the cloud URL).
4. Link the report path / URL from the `## Agent verification` section of `verification.md`.

If a browser walk happened _without_ recording, the agent **must re-run it with recording on** before writing `verification.md`. Inline per-step screenshots are not a substitute — they cover the agent's own observation points, not the full sequence the user needs to audit.

For projects without a built-in evidence-recording tool, document the gap in `## Untested / deferred areas` and route the affected checks to the **Manual / human verification** bucket instead of claiming agent verification. Don't fabricate the evidence requirement away.

## Pre-execution checks

Same as the rest of the speckit family — check `.specify/extensions.yml` for `hooks.before_verify` (optional). If none exist, skip silently.

## Execution

### 1. Resolve the active feature

- Read `.specify/feature.json` to get `feature_directory`. If missing, abort and tell the user to be on a feature branch (the same precondition as `/speckit-tasks` / `/speckit-analyze`).
- Confirm `spec.md`, `plan.md`, and `tasks.md` exist. If `tasks.md` doesn't exist, recommend `/speckit-tasks` first.
- Check whether `<feature_directory>/test-spec.md` exists.
  - If it exists, read it after `verification.md` context is gathered and use
    it as the feature's verification-contract context when identifying
    deferred areas.
  - If it is missing, call this out in `verification.md` under
    `## Untested / deferred areas`:
    `- [ ] Test spec: create test-spec.md from specs/test-spec-template.md so future smoke agents/humans have an executable verification contract.`
  - Do not auto-create `test-spec.md` from this skill unless the user
    explicitly asks to draft test specs. This skill's normal write target
    remains `verification.md`.

### 2. Inventory tests added in this feature's branch

- Compute the merge base: `git merge-base HEAD origin/main` (or whatever the repo default branch is — derive via `gh repo view --json defaultBranchRef --jq .defaultBranchRef.name` if `gh` is available, otherwise default to `main`).
- List files added or modified since the merge base with paths matching:
  - `tests/contract/**/*.test.ts` → contract
  - `tests/integration/**/*.test.ts` → integration
  - `tests/e2e/**` → e2e (note: also check `tests/e2e/test-specs` for Playwright specs)
  - `**/*.test.ts` outside `tests/` (i.e. inline next to source) → unit
  - `scripts/*.test.ts` or scripts that contain test logic → script-based
- For each test file, count `it(...)` and `test(...)` declarations to get an aggregate test count.

### 3. Build the coverage matrix

- Extract all FR-### identifiers from `spec.md` (lines matching `^- \*\*FR-[0-9]+[a-z]?\*\*` and `^- \*\*SC-[0-9]+\*\*`).
- For each FR / SC, search the test files (added in step 2) for:
  - The literal identifier string (`FR-001`, `SC-002`).
  - The story tag from `tasks.md` if present (`[US1]` etc.) — use `tasks.md` to resolve which user story each FR belongs to, then check that tests for that user story exist.
- A test "covers" an FR / SC if either:
  - The identifier appears in the file (comment or string).
  - The user story the FR belongs to has at least one test, AND the test's `describe` / `it` strings reference the FR's behavior keyword.
- Mark each FR / SC as **COVERED** (with the matching test file) or **NOT COVERED**.
- Special handling: SCs that name a measurement (e.g., "p95 < 50 ms", "within 60 s") that no automated test asserts → mark **NOT MEASURED**, distinct from NOT COVERED. Look for keywords: latency, p50, p95, p99, sec, ms, throughput, RPS, "within X" timing.

### 3.5. Confirm agent-driven browser walks have evidence

Before prompting the human, decide whether the agent itself drove any browser walks for this feature. Sources:

- The implementing agent's own session log (the implementation run that just finished, or a recent UI-verification invocation by the agent).
- Any browser-driving tool calls in the recent transcript that hit a domain related to this feature.

If yes, locate the evidence artifact (the report path or URL the recorded session produced).

If the agent drove a browser walk but **no recorded evidence exists** (recording was off, or the report-generation step was skipped), STOP and re-run the walk with recording on before proceeding:

```
The agent ran a browser walk for this feature without recording evidence.
The user has no way to audit whether the verification was correct.
Re-running the walk now with recording on. After it completes I'll
generate the report and link it from verification.md.
```

Then re-execute the walk in a single recorded session (cover everything the un-recorded run covered), close the session, generate the report, and capture its path / URL. Only then proceed to step 4.

### 4. Prompt the user interactively for manual verification

Ask the user (one block, free-form):

```
What manual verification did you do for this feature? Drop a few lines:
- which scenarios you walked through (use Scenario N from quickstart.md if applicable)
- which env you ran it in (local / dev / staging / prod)
- any anomalies you noted

If none, type "skipped" — the doc will record that the manual sweep was skipped.
```

Capture the response verbatim.

### 5. Prompt for known-untested / deferred areas

Ask:

```
What's NOT tested that we should retest before release? Examples:
- perf SC numbers (e.g., a load-test run for an SC with a measurable threshold)
- behavior across multiple Cloud Run instances
- the real-environment HTTP path (deployed apps/web vs local route handler tests)
- third-party-integration hooks (Stripe webhooks, OAuth callbacks)
- browser UI rendering not covered by Playwright

For each, give a one-line "how to retest" hint.

If you've thought of nothing, type "none".
```

Combine the user's response with the **NOT MEASURED** items from the coverage matrix.

### 6. Write `verification.md`

Layout:

```markdown
# Verification: <feature title from spec.md>

**Spec**: [spec.md](./spec.md)
**Branch**: <git rev-parse --abbrev-ref HEAD>
**Created**: <today, YYYY-MM-DD>
**Last updated**: <same>
**Verifier**: <git config user.name>

## Tests added

| Type         | Files     | Tests     |
| ------------ | --------- | --------- |
| Contract     | <count>   | <count>   |
| Integration  | <count>   | <count>   |
| Unit         | <count>   | <count>   |
| E2E          | <count>   | <count>   |
| Script-based | <count>   | <count>   |
| **Total**    | **<sum>** | **<sum>** |

### File list

- `tests/contract/foo.test.ts` (8 tests)
- ...

## Coverage matrix

### Functional requirements

| FR      | Status      | Test                                          |
| ------- | ----------- | --------------------------------------------- |
| FR-001  | ✅ COVERED  | tests/contract/foo.test.ts                    |
| FR-007a | ✅ COVERED  | tests/contract/bar.test.ts                    |
| FR-024  | ⚠️ IMPLICIT | (negative-action rule, no explicit assertion) |

### Success criteria

| SC     | Status          | Test / Measurement                                       |
| ------ | --------------- | -------------------------------------------------------- |
| SC-001 | ✅ COVERED      | quickstart.md Scenario 1 (manual)                        |
| SC-002 | ❌ NOT MEASURED | <perf threshold> — needs <load-test command> pre-release |
| SC-003 | ✅ COVERED      | tests/integration/foo-flow.test.ts                       |

## Agent verification (during implementation)

Non-test checks the implementing agent ran. The release-sweep agent should re-run these.

- Typecheck: `<command run>` — `<outcome>`
- Migrations / schema apply: `<commands>` — `<outcome>` (note any manual DB inspection)
- Smoke probes: `<what was hit, what was asserted>`
- ...

### Browser walks driven by the agent (mandatory evidence)

For each browser session the agent itself drove, link the recorded evidence artifact (report path or URL). **If a session ran without recording, re-run it before publishing this doc.** Format each entry:

- **<scenario name>** — <one-line description of the round-trip>. Evidence: `<report path or URL>`. Checks asserted: <bulleted or comma-separated list of pass-criteria the agent claims it observed>.

## Manual verification log

<verbatim user input from step 4>

## Untested / deferred areas

- [ ] **<SC or FR id>**: <what wasn't measured>. Retest: `<exact command, with thresholds>`. Pass criterion: <observable signal>.
- [ ] ...

## Coverage summary

- Total FRs: <n>
- COVERED: <n>
- NOT COVERED: <n>
- IMPLICIT (no assertion): <n>
- Total SCs: <n>
- NOT MEASURED: <n>
```

### 7. Append to git-tracked file

The doc is committed alongside the rest of the spec. Re-running this skill with the same feature should:

- Increment `Last updated` date.
- Preserve the historical `Manual verification log` (append a new dated section under the existing one — never overwrite).
- Refresh the coverage matrix (re-scan tests, in case more were added since).
- Refresh `Untested / deferred areas` only if the user provides new input — otherwise keep the existing list.

## Operating rules

- **STRICTLY READ for tests, WRITE only `verification.md`** — this skill never modifies source code, tests, or other spec artifacts during normal verification. If the user separately asks to draft missing test specs, use `specs/test-spec-template.md` and treat that as a separate explicit authoring task.
- **Agent-driven browser walks require recorded evidence.** If the agent invoked any UI-verification tooling for this feature, link the resulting evidence artifact (path or URL) from the `## Agent verification` section. If no recording exists, re-run with recording on before proceeding (see step 3.5).
- The test-discovery heuristics in step 3 are best-effort; when a match is ambiguous, mark IMPLICIT and let the user override during step 5.
- When more than one test file covers an FR, list them all (not just the first). Multiple tests = stronger coverage.

## When NOT to use

- **Pre-implementation**: `/speckit-analyze` is the right tool — it audits the spec/plan/tasks for drift before code is written.
- **Browser UI walk-through only**: the project's UI-verification tool is the right entry point — it drives the UI and produces a screen-by-screen report. `/speckit-verify` consumes that report's path; it does not replace it.
- **Across all features**: this skill is per-feature. A future "release sweep" tool would aggregate `verification.md` files from every active spec.

## Post-execution checks

Check `.specify/extensions.yml` for `hooks.after_verify` (optional). If none, skip silently. The convention from other speckit-\* skills is an optional `git.commit` hook to capture the new `verification.md`.

## Example: typical first-run output

A first run after `/speckit-implement` should produce sections like:

```
## Tests added
| Type | Files | Tests |
|---|---|---|
| Contract | 4 | 17 |
| Integration | 2 | 7 |
| Unit | 0 | 0 |
| E2E | 0 | 0 |
| Total | 6 | 24 |

### Coverage gaps surfaced
- SC-<n> (perf threshold) → NOT MEASURED
- SC-<n> (blast-radius / negative scenario) → IMPLICIT (covered by adjacent tests, no explicit assertion)
- FR-<n> (negative-action invariant) → IMPLICIT (no assertion the side-effect is absent)
```

The user then logs manual verification (e.g., "ran quickstart Scenarios 1, 2, 4 against local dev; deployment-env walks deferred until staging is up"), and the deferred list captures the perf and deployment items.
