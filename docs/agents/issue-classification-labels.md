# Issue labels (kind, priority, coordination)

**Workflow stage** is **not** expressed with legacy workflow labels (`ready-for-agent`, `needs-triage`, …). It lives on org project **Tasks** — **Status** field. See `issue-tracker.md`. The **`mytuums-org-setup`** skill (installed from `mytuums-group/agentskills`) contains the same classification rules in **`issue-classification-labels.md`** for agents that only have skills open.

## Kind (exactly one)

| Label | Meaning |
|-------|--------|
| `bug` | Incorrect or broken behaviour |
| `enhancement` | Improves something that already exists |
| `feature` | Adds a meaningful new capability or surface |

## Priority (exactly one, mirrored on project **Tasks**)

| Label | Project **Priority** |
|-------|----------------------|
| `priority:P0` | P0 |
| `priority:P1` | P1 |
| `priority:P2` | P2 |

Update labels whenever you change project **Priority**.

## Coordination (optional)

| Label | Use |
|-------|-----|
| `needs-info` | Waiting on reporter / external detail |
| `wontfix` | Won’t fix; close issue, set **Done** on board |

Remove stale workflow labels when you touch an issue that still carries them.
