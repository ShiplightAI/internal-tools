# Contributing

Open an issue for substantial changes before implementation. Submit focused pull
requests with the problem, resulting behavior, and verification evidence.

Run these checks from the repository root with Bash and Python 3:

```bash
bash scripts/check-release-notes.sh
python3 scripts/check-action-output.py
```

The checks use a fake model CLI and need no credentials or paid model calls.
Install `timeout` (or `gtimeout` on macOS) to exercise the real timeout test;
otherwise the suite still tests the timeout invocation with a shim.

For workflow changes, also run `actionlint`. Pin third-party Actions to full
commit SHAs, keep credentials out of tests, and pass action inputs through
environment variables rather than interpolating them into shell source.

Treat skill instructions as executable behavior. Explain any new permissions,
destructive operations, network access, or changes to merge behavior. Human
code-owner review is required; fork PRs run the contract checks but skip the
credentialed AI review.
