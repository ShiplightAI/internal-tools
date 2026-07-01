# help — List subcommands, or explain one (does not execute)

`help` is informational; it never runs a subcommand.

## `/quality help`

Render the grouped menu from this skill's SKILL.md "Subcommands" section and
explain invocation:

- `/quality <subcommand> [target]` runs a subcommand; bare `/quality` does a
  read-only status pass, then presents the menu.
- Subcommands match natural phrasing (see the dispatch table's synonym column).
- `/quality help <subcommand>` shows details for one **without running it**.

## `/quality help <subcommand>`

Resolve `<subcommand>`, read the header of its reference
(`references/<sub>/index.md` or `references/<sub>.md`), and summarize what it does
and when to use it — without running it.
