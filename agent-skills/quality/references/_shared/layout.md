# Shared: The `.quality/` layout & ownership

All quality artifacts live under `.quality/` at the repo root,
separate from the producers' `specs/` + `tests/` + `.shiplight/`. Per-artifact
ownership and the edit contract:

```text
.quality/
├── project-map.yaml                         owned by `project`  (features, release areas)
├── evidence/<target-slug>/quality-map.yaml  owned by `evidence` (per-feature proof graph)
├── config/
│   ├── observation-sources.yaml             owned by `analyze`
│   ├── observation-sets.yaml                owned by `analyze`
│   └── views.yaml                           owned by `analyze`
├── fix-prompts.md                           TOOL OUTPUT — read-only, never hand-edit
└── generated/
    └── recommendations/<set>--<scope>.json  TOOL OUTPUT — read-only, never hand-edit
```

Rules:

- Each subcommand owns its own tree above and must not author another's — with
  one carve-out: the `analyze` subcommand may apply contract-conformant join-key
  and `proof_gap` fixes (`evidence.path`, `evidence.test_case`, `proof_gap`) to
  `evidence/**/quality-map.yaml`, following the `evidence` map contract and never
  authoring checks or structure (see the `analyze` Operating Rules).
- `fix-prompts.md` and `generated/*` are written by `quality-tools` only — treat
  them as read-only.
- Quality reads, but never writes, the **producer** artifacts it indexes:
  `specs/<feature>/test-spec.md`, `specs/<feature>/test-report.md`, `TESTING.md`,
  and the test files themselves (see `_shared/independence.md`).
- `<target-slug>` reuses the `specs/NNN-kebab-case` numeric prefix so artifacts
  join across the producer and Quality sides.
