# improve — Improve the underlying quality posture and reassess

`improve` starts from an engine-produced assessment, diagnoses which underlying
condition is weak, changes that condition honestly, and runs `assess` again.
The objective is better project behavior and proof—not a larger number.

## Contents

- Assessment contract and scope
- Improvement loop
- Observation configuration and runtime joins
- Fix prompts and edit boundaries
- Report

## Read first

- [independence](../_shared/independence.md)
- [layout](../_shared/layout.md)
- [vocabularies](../_shared/vocabularies.md)
- [map-feature](../map-feature/index.md) → "Runtime Join Contract" before
  touching a feature map

## Assessment contract

The quality graph joins structural declarations to current observations:

```text
.quality/project-map.yaml
        ↓ feature id / quality_map_path
.quality/evidence/<target>/quality-map.yaml
        ↓ evidence.path + optional evidence.test_case
.quality/config/observation-sources.yaml
        ↓ profile id
.quality/config/observation-sets.yaml
        ↓ joined within whole-project or saved-view feature scope
quality-tools analyze
        ↓
.quality/generated/recommendations/<set>--<scope>.json
```

The engine reports four separate scores:

| Score | Diagnose | Honest improvement |
| --- | --- | --- |
| Coverage | A declared check has no mapped proof | Create appropriate proof through a producer, then map it |
| Evidence confidence | Proof exists but its modality or gate is too weak for the check | Strengthen proof at the system boundary that matters |
| Quality | Proof is failing, stale, unavailable, or unobserved | Fix the implementation/proof or repair acquisition and graph joins, then rerun |
| Structure confidence | Features, checks, or priorities are inferred or unreviewed | Ask a human to correct or ratify them through `map-project` or `map-feature` |

No command may directly author a score. Never improve a number by removing
scope, weakening checks, relabeling evidence, accepting risk, or changing
provenance without the real-world event the field records.

## Scope

Resolve all assessment dimensions:

- project from `.quality/project-map.yaml`
- feature scope: whole project or one saved view from
  `.quality/config/views.yaml`
- observation set from `.quality/config/observation-sets.yaml`
- observed revision/run from source artifacts, when available
- generated recommendations baseline, when named by the user

`improve` works across an existing graph. If no project map or feature quality
maps exist, use `start`. If one feature needs its checks reconstructed, use
`map-feature <target>`.

## Improvement loop

### 1. Establish the baseline

Follow `assess` and retain:

- feature scope, observation set, and observed revision/run
- generated recommendation path
- all four scores
- acquisition and resolution diagnostics
- recommendations in priority order

Do not change anything until the low score or recommendation has been traced to
a concrete graph node, graph edge, proof artifact, or implemented behavior.

### 2. Classify the root cause

Classify each gap before editing:

1. **Structure:** wrong/missing feature, check, priority, provenance, or human
   review.
2. **Coverage:** no proof is mapped for a valid check.
3. **Evidence strength:** mapped proof cannot establish the full claim or lacks
   the required execution context/gate.
4. **Source acquisition:** credentials, repository/workflow selection, artifact
   names, or local-folder path prevent results from loading.
5. **Artifact emission:** the workflow emits no machine-readable result or emits
   the wrong file.
6. **Parser/producer:** report format, statuses, timestamps, or parser choice are
   invalid.
7. **Graph join:** results load but `test_file`/`test_case` do not match
   `evidence.path`/`evidence.test_case`, or the match is ambiguous.
8. **Real failure:** current proof joins correctly and reports a failing/error
   state.
9. **Scope:** the observation set contains the wrong profiles or the saved view
   contains the wrong features.

Use `runtime_review.execution_diagnostics` for acquisition/parser problems and
`runtime_review.resolution_diagnostics` plus `resolution_audit` for graph-join
problems. Do not call an unobserved check a missing test until acquisition and
resolution have been ruled out.

### 3. Apply the smallest honest improvement

#### Structure confidence

- Follow `map-project` for feature boundaries, status, and priority provenance.
- Follow `map-feature` for the check list, proof definitions, origin provenance,
  and whole-list review.
- Propose corrections highest priority first.
- Never flip a human gate or write `accepted_gaps` for the owner.

#### Coverage

- Confirm the check is valid before buying proof for it.
- Use existing proof when it genuinely establishes the check and map it through
  `map-feature`.
- Otherwise hand a precise proof gap to an appropriate producer. Quality does
  not author the test.
- Confirm the resulting artifact and type before adding it to the graph.

#### Evidence confidence

- Match proof strength to the claim. Unit proof may fully establish a small,
  deterministic code contract; it does not establish a cross-boundary user
  workflow by itself.
- Add a meaningful integration, browser, smoke, telemetry, or release-gate
  layer only when the claim requires that boundary.
- Never relabel the same artifact as a stronger type.

#### Quality

- For acquisition/config problems, repair
  `.quality/config/observation-sources.yaml`.
- For artifact-emission problems, add or repair an authorized workflow emit
  step, or propose it when workflow changes are not authorized.
- For producer/parser problems, fix the producer or choose the adapter matching
  its actual format.
- For join problems, align emitted `test_file`/`test_case` with
  `evidence.path`/`evidence.test_case`. There is no second mapping table.
- For a real failure, fix the implementation or proof through its owning workflow and
  rerun it.
- For stale/unavailable proof, refresh it or report the external blocker.

#### Scope

- Fix observation-set profile membership or saved-view feature membership.
- Never remove a valid high-risk feature merely to improve the result.

### 4. Validate the changed layer

- Feature map:

  ```bash
  npx --yes @shiplightai/quality-tools validate <quality-map-path>
  ```

- Current quality-map schema:

  ```bash
  npx --yes @shiplightai/quality-tools schema
  ```

- Observation config: compare with the schemas in `assets/` and run the
  relevant assessment. Engine diagnostics are the runtime contract check.
- Implementation/proof changes: run their owning verification command before
  reassessment.

Never report a fix as verified without command output or an auditable
observation.

### 5. Reassess

Run the same observation set and scope through `assess`. Compare like with like:

- acquisition/resolution state before and after
- each of the four scores before and after
- recommendations closed, changed, or still open
- new evidence and the command that proved it

Repeat until remaining work is low-return, deferred, blocked by external state,
or requires a human decision.

## Observation configuration

`improve` may create or repair:

- `.quality/config/observation-sources.yaml`
- `.quality/config/observation-sets.yaml`
- `.quality/config/views.yaml`

Use the templates and schemas under `assets/`.

### Sources

One profile represents one acquisition integration, such as one GitHub Actions
workflow or one local result folder. Each adapter only describes how to parse an
artifact:

- `junit`
- `playwright-json`
- `manifest`

Prefer an existing structured artifact. Use a manifest for smoke/health gates
that have no native report. Do not create a source profile until the artifact
exists or its emit step is being added in the same authorized change.

### Observation sets

An observation set names profiles reviewed together, in precedence order. Use a
single-profile set to debug one source. Feature filtering belongs to saved views,
not observation sets.

### Saved views

Views are saved assessment scopes over exact `features[].id` values from
`.quality/project-map.yaml`. They answer only "which features are included?"
They may overlap when independently releasable scopes share features. Do not
infer ids from evidence-directory names and do not create a saved
`whole-project` view; whole project is built in.

A view does not select observation sources, copy feature data, change scoring,
or identify a build. The observation set answers "which runtime sources?" and
the observed revision/run identifies a concrete release candidate.

## Runtime Join Contract

- `evidence.path` is the canonical repo-relative proof identity.
- `evidence.test_case` optionally pins one case within the path; matching is
  trimmed and case-insensitive.
- An unpinned row matches any observed case for its path.
- A pinned row matches only that case.
- Never mix pinned and unpinned evidence rows for the same path.
- JUnit supplies testcase file + name; Playwright JSON supplies spec file +
  title; manifest supplies `test_file` + `test_case`.

If one observation matches both a file-level and pinned row, remove the overlap:
keep the proof file-level or pin every distinct row.

## Workflow-emitted observations

For a CI smoke or health gate:

1. Map the workflow file as `evidence.path`.
2. Use the step/check name as `evidence.test_case`.
3. Emit a manifest record with the same `test_file` and `test_case`.
4. Configure a manifest adapter for the artifact.

Without a machine-readable artifact, record a proof gap rather than pretending
the workflow is observed.

## Generate fix prompts

For agent-ready proof-gap prompts:

```bash
npx @shiplightai/quality-tools fix-prompts \
  --project-path <repo-root> \
  --output .quality/fix-prompts.md
```

Options include:

- `--format json`
- `--target <target-id>`
- `--limit <n>`
- `--include-covered`

Use the package command, not a custom prompt generator. Generated prompts are
tool output. A producer creates any required tests; `map-feature` confirms and
maps the result.

## Edit boundaries

`improve` may:

- edit observation config
- edit an authorized workflow observation-emission step
- apply contract-conformant `evidence.path`, `evidence.test_case`, and
  `proof_gap` repairs after reading the `map-feature` contract
- invoke `map-project` or `map-feature` for deeper graph changes

It must not:

- author tests, fixtures, or producer-owned reports
- write run outcomes into quality maps
- hand-edit generated recommendations or fix prompts
- mint a feature slug for project-wide work
- self-ratify structure or accept risk
- include secrets or private customer data in artifacts

## Report

Report:

- baseline and final feature scope, observation set, and observed revision/run
- root-cause class for each addressed recommendation
- graph, proof, implementation, or wiring changes made
- verification commands and auditable outcomes
- all four scores before and after
- remaining work split into agent-actionable, external blocker, deferred, and
  human decision
