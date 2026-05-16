## Agent skills

### Merge policy

All pull requests must pass CI checks before merging. Agents must not merge PRs until the full check suite (typecheck, lint, build, tests, smoke) is green. If CI fails, investigate the root cause, push a fix, and wait for the next run to complete before merging. The **`solve-an-issue`** skill encodes this loop with `gh pr checks --watch` and merge only after green CI.

### Issue tracker and org board

Issues and PRDs live in **GitHub Issues** (`gh` CLI). **Workflow state** (Backlog → Ready → In progress → …) lives on the **MyTuums-Group** org GitHub Project **Tasks** only — see `docs/agents/issue-tracker.md`.

Detailed commands, project ids, and **claim → In progress** rules are defined in the installed **`mytuums-org-setup`** skill (`issue-tracker-github.md`). Do not rely on a checkout of the AgentSkills repository in the workspace; use the **skill** content from your Cursor skills install (`npx skills add mytuums-group/agentskills`).

**When starting work on an issue:** set the project item **Status** to **In progress** first, before implementation, so parallel agents do not duplicate effort.

**When finishing:** close the GitHub issue and set project **Status** to **Done** in the same pass. If completion unblocks other items, update their **Status** (**Ready** or **In progress**) in the same pass.

### Issue labels (kind + priority)

Use **kind** (`bug`, `enhancement`, `feature`) and **`priority:P0` / `priority:P1` / `priority:P2`** on issues; keep **`priority:P*`** in sync with the **Tasks** project **Priority** field. Optional: `needs-info`, `wontfix`. See `docs/agents/issue-classification-labels.md` and the **`mytuums-org-setup`** skill (`issue-classification-labels.md`).

**Triage, end-to-end delivery, and breakdown:** use the installed **`triage`**, **`solve-an-issue`**, **`to-issues`**, and **`to-prd`** skills — **`solve-an-issue`** covers pick → claim → branch → PR → CI → merge → board **Done**; the others cover intake and splitting work.

### Domain docs

This repo uses a multi-context domain-doc layout: root `CONTEXT-MAP.md`, root `CONTEXT.md`, focused `docs/context/**/CONTEXT.md` docs, root `DESIGN.md`, and root `docs/adr/`. See `docs/agents/domain.md`.

### Frontend theme

The v1 visual theme is defined in `DESIGN.md`. Do not override or replace that theme unless the product scope explicitly changes.
