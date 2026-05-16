# Issue tracker: GitHub + org **Tasks** project

Issues and PRDs for this repo live as **GitHub Issues**. **Pipeline state** lives on the **MyTuums-Group** organization project **[Tasks](https://github.com/orgs/MyTuums-Group/projects/3)** — field **Status** is the **only** source of truth for whether work is pickable, in flight, blocked, etc.

Canonical `gh` commands, node ids, Status/Priority option ids, and listing patterns are **not duplicated here** — they live in the installed **`mytuums-org-setup`** skill file **`issue-tracker-github.md`** (from `mytuums-group/agentskills`). Agents should follow that skill; this file records repo-local expectations.

## Repo expectations

- **Pickable by AFK agents:** project **Status** = **Ready** only (see **`solve-an-issue`** and **`triage`** skills for ranking; **`solve-an-issue`** for full ship loop).
- **Claim before coding:** set **Status** to **In progress** as the **first** action after choosing an issue, then implement.
- **Done:** close the issue and set **Status** to **Done**; unblock dependents to **Ready** or **In progress** as appropriate.
- **Labels:** **kind** + **`priority:P*`** for humans scanning issue lists — see `issue-classification-labels.md` and the same skill’s **`issue-classification-labels.md`**.

## Quick references (see skill for full detail)

```bash
gh project item-list 3 --owner MyTuums-Group --query "status:Ready" -L 50 --format json
gh issue view <N> --json number,title,body,labels,assignees,comments,projectItems,state,url
```

Infer `REPO` from `git remote -v` when using `gh issue` / `gh pr` commands (`MyTuums-Group/MyTuums` for this clone).

## Naming

The GitHub column for dependencies is **Blocked** (not “Locked”).
