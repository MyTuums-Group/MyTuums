## Agent skills

### Merge policy

All pull requests must pass CI checks before merging. Agents must not merge PRs until the full check suite (typecheck, lint, build, tests, smoke) is green. If CI fails, investigate the root cause, push a fix, and wait for the next run to complete before merging.

### Issue tracker

Issues and PRDs are tracked in GitHub Issues using the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the default Matt Pocock triage labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

This repo uses a multi-context domain-doc layout: root `CONTEXT-MAP.md`, root `CONTEXT.md`, focused `docs/context/**/CONTEXT.md` docs, root `DESIGN.md`, and root `docs/adr/`. See `docs/agents/domain.md`.

### Frontend theme

The v1 visual theme is defined in `DESIGN.md`. Do not override or replace that theme unless the product scope explicitly changes.
