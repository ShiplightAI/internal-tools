#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
skill_root="${repo_root}/agent-skills/quality"
failures=0

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  failures=$((failures + 1))
}

if rg -n 'npx( --yes)? @shiplightai/quality-tools( |$)' "${skill_root}"; then
  fail "quality-tools command examples must pin the 0.3 interface"
fi

if ! rg -q '@shiplightai/quality-tools@\^0\.3\.0 observations --help' \
  "${skill_root}/SKILL.md"; then
  fail "SKILL.md must verify the 0.3 observations interface before use"
fi

if ! rg -q 'remove both `auth` and `github`' \
  "${skill_root}/references/improve/assets/observation-sources.template.yaml"; then
  fail "the local-folder example must remove GitHub authentication and config"
fi

if ! rg -q 'If editing the producer is explicitly authorized' \
  "${skill_root}/references/improve/index.md"; then
  fail "producer mutation must have an explicit authorization branch"
fi

observation_schema="${skill_root}/references/improve/assets/quality-observations.schema.json"
if ! node - "${observation_schema}" <<'NODE'
const fs = require('node:fs');

const schema = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const observations = schema.properties?.observations;
const uniqueIdentity = observations?.['x-unique-by'];

if (
  observations?.minItems !== 1 ||
  observations?.uniqueItems !== true ||
  JSON.stringify(uniqueIdentity) !== JSON.stringify(['path', 'test_case'])
) {
  process.exit(1);
}
NODE
then
  fail "canonical observation schema must reject empty and duplicate identities"
fi

if ! git -C "${repo_root}" check-ignore -q .agents; then
  fail ".agents must be excluded as generated installation state"
fi

if ! git -C "${repo_root}" check-ignore -q skills-lock.json; then
  fail "the machine-local skills lock must be excluded"
fi

if [[ -e "${repo_root}/.agents/skills/quality" ]] &&
  ! diff -qr "${skill_root}" "${repo_root}/.agents/skills/quality" >/dev/null; then
  fail "the installed quality skill must match the canonical source"
fi

if ((failures > 0)); then
  exit 1
fi

printf 'Quality skill review contracts pass.\n'
