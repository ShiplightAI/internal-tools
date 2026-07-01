# Quality Center Agent Skills

`/quality` is the **quality oracle** for a repository: it reads the evidence a
project already produces — Shiplight test reports, unit tests, manual checks,
telemetry — indexes it into backbone YAML, and scores overall quality with a
deterministic engine. It answers "how well is this system verified, and where
are the gaps?" without ever writing the code or the tests it judges.

The governing principle is **independence of verification**: you cannot verify a
system against itself. `/quality` therefore never produces the evidence it
scores. It is enforced by (1) a one-directional artifact interface (below),
(2) the deterministic [`@shiplightai/quality-tools`](https://www.npmjs.com/package/@shiplightai/quality-tools)
engine computing every score — never an LLM, (3) a judge that re-confirms each
evidence `type` against the artifact itself rather than trusting the producer's
self-claim, and (4) a human ratification gate for `structure_provenance`.

> **Architecture & principle:** see `ARCHITECTURE.md` (how the producers,
> `project`, `evidence`, `analyze`, and the observation layer compose) and
> `POSITION.md` (the independence principle behind the boundaries) — both in the
> Quality Center repo, `quality-center/docs/`.
>
> **Usage prompts:** see [`prompt-playbook.md`](./prompt-playbook.md) for
> copy-paste prompts that drive a coding agent through brownfield, greenfield,
> and continuous quality workflows.

## Subcommands

Bare `/quality` runs a status pass. The three working subcommands are:

| Subcommand | Purpose |
| --- | --- |
| `/quality project` | Construct and maintain `project-map.yaml` from whatever artifacts exist — spec-driven inputs yield high structure confidence, inference yields low until ratified. Owns release areas, feature graph, change classification. |
| `/quality evidence` | Construct and maintain per-feature `quality-map.yaml` from `test-spec.md`, `test-report.md`, and the test artifacts. Reads `priority` as a governed fact; derives evidence confidence from test `type`. Feature-scoped. |
| `/quality analyze` | Improve quality across features: wire observations (sources + sets), author saved reader views, run `quality-tools analyze` to compute the four scores, and triage the resulting recommendations. Repo-scoped. |

## Relationship to `/shiplight`

`/quality` sits one layer above `/shiplight`, the **evidence producer**.
`/shiplight` (subcommands: `cover`, `create-yaml-tests`,
`create-agent-verification`, `fix`, `verify`, `review`, `init`, `auth`, `ci`,
`cloud`) writes facts — test code plus `specs/<feature>/test-report.md` and
friends. `/quality` treats those facts as **one evidence source among many**
(alongside unit tests, manual checks, and telemetry) and indexes and scores
them.

The interface is **one-directional**: `/quality` knows about `/shiplight`;
`/shiplight` knows nothing about `/quality`. This is what keeps verification
independent — and it means a project with no Shiplight tests at all can still be
fully assessed by `/quality` from whatever other evidence exists.

## Artifact flow

```
producers (/shiplight, unit tests, manual, telemetry)
        │  facts: test-report.md, test code, observations
        ▼
/quality project  → project-map.yaml   (release areas, feature graph)
/quality evidence → quality-map.yaml   (per-feature evidence + type)
        ▼
/quality analyze  → quality-tools analyze
        ▼
four deterministic scores:
  quality · coverage · evidence-confidence · structure-confidence
        ▼
triaged recommendations
```

## Install & usage

`@shiplightai/quality-tools` — the deterministic scoring engine — is a **public
npm package**; the local `analyze` runs entirely off it. Each skill bundles its
own starter assets (`project`, `evidence`, and `analyze` templates and schemas,
including the `.quality-center/` runtime-review config) and copies them into a
target repo on demand, so there is nothing extra to install.

The commercial surface is **Nova cloud** — hosted observations, history, and
dashboards — not the local `analyze`, which is fully self-contained.

## Other skills in this repo

`speckit-project` (spec-driven development), `auto-pr`, `reflect`, and
`code-review-run` are separate standalone skills that live alongside `/quality`
and `/shiplight` but are not part of the oracle. The test producers driven by
`/shiplight` — `create-yaml-tests` (deterministic YAML E2E tests),
`create-agent-verification` (coding-agent-driven Markdown cases), and `verify`
(browser/live verification) — are referenced by name and are standalone-safe
when absent.
