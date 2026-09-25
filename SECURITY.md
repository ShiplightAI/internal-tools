# Security policy

Report vulnerabilities privately to feng@shiplight.ai. Include the affected
commit, reproduction steps, impact, and a minimal example without live secrets.
Do not put credentials or an unpatched exploit in a public issue.

Security fixes target the latest version on `main`. Older commits do not receive
backports. Update pinned action references after reviewing a fix.

Skills execute with the invoking agent's permissions, and actions run within the
caller's GitHub job. Restrict credentials and token scopes, require human review
for changes to automation, and pin action versions to full commit SHAs. Model
output, commit messages, and PR content are untrusted input.
