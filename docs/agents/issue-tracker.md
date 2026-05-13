# Issue tracker: GitHub + org project

Issues and PRDs for this repo live as GitHub issues. Use the `gh` CLI for issue operations, and keep the issue synced with the GitHub org project `Kanban board` through its `Status` field.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue for workflow decisions**: `gh issue view <number> --json number,title,body,labels,assignees,comments,projectItems`
- **Read an issue discussion**: `gh issue view <number> --comments`
- **List issues for workflow decisions**: `gh issue list --state open --json number,title,labels,assignees,projectItems,createdAt,updatedAt` with appropriate `--label` and `--state` filters.
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

Infer the repo from `git remote -v` — `gh` does this automatically when run inside a clone.

## GitHub project workflow

This repo also uses the GitHub org project `Kanban board`. Keep each issue's project item `Status` field aligned with the issue labels and blocking state.

For execution decisions, treat the project item's `Status` field as the source of truth. If labels, assignees, or issue body text disagree with the board status, choose work based on the board and then clean up the issue metadata afterward.

Status mapping:

- `ready-for-agent` with no blocking issue: `Ready` or `In progress`
- `ready-for-human` with no blocking issue: `Needs review`
- `needs-triage`: `Needs review`
- `needs-info`: `Needs review`
- `ready-for-agent` or `ready-for-human` with at least one blocking issue: `Blocked`
- `wontfix`: `Done`
- closed issues: `Done`

Use `Backlog` for new or unsorted work when no more specific workflow state applies yet.

When deciding between `Ready` and `In progress` for `ready-for-agent`, use `Ready` when no one has started and `In progress` when an agent or human is actively working it.

## Choosing the next issue

When the maintainer asks "What should I do next?" or "What issue could I do next?", use this selection order:

1. Open issues labeled `ready-for-agent`
2. Project `Status = Ready`
3. Unassigned issues
4. Oldest ready issue first, unless a newer ready issue clearly unlocks more downstream work

Do not recommend issues whose project `Status` is `Blocked`, `In progress`, `Needs review`, or `Done`, even if the label still says `ready-for-agent`.

If an issue body contains stale blocker text but the board says `Ready`, treat that as metadata drift. Flag it for cleanup, but do not let stale body text override the board status when selecting work.

Recommended listing command:

- `gh issue list --state open --label ready-for-agent --json number,title,labels,assignees,projectItems,createdAt`

## When a skill says "publish to the issue tracker"

Create a GitHub issue, then ensure it is added to the `Kanban board` project and given the correct `Status`.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --json number,title,body,labels,assignees,comments,projectItems`, and use `--comments` separately when you need the rendered discussion view.
