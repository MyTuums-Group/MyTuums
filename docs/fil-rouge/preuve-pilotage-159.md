# Preuve pilotage #159

Statut : preuve textuelle prete pour revue ; une capture graphique du board peut rester utile pour le support oral.

## Objectif

Montrer le pilotage du projet fil rouge : decoupage en issues, suivi dans le project board `Tasks`, branches/PR, CI et repartition ElCabrii/AcryTeryx.

## Snapshot Tasks

Snapshot releve le 2026-07-02 via :

```powershell
gh project item-list 3 --owner MyTuums-Group -L 200 --format json
```

| Issue | Titre | Statut | Priorite | Assignee |
| --- | --- | --- | --- | --- |
| #151 | Fil rouge: create the UF DEV B3 compliance map | Done | P0 | ElCabrii |
| #152 | Fil rouge: prove the local full-stack smoke path | Done | P0 | AcryTeryx |
| #153 | Fil rouge: document the functional product scope for jury review | Done | P0 | ElCabrii |
| #154 | Fil rouge: document the technical architecture and data model | Done | P0 | AcryTeryx |
| #155 | Fil rouge: collect responsive web evidence across desktop tablet mobile | Needs review | P1 | AcryTeryx |
| #156 | Fil rouge: complete accessibility and frontend performance evidence | Blocked | P1 | AcryTeryx |
| #157 | Fil rouge: harden the Flutter mobile MVP for live demo | In progress | P0 | AcryTeryx |
| #158 | Fil rouge: capture Flutter mobile demo evidence | Blocked | P1 | AcryTeryx |
| #159 | Fil rouge: prepare project management and collaboration evidence | In progress | P1 | ElCabrii |
| #160 | Fil rouge: assemble the final demo runbook and fallback pack | In progress | P0 | ElCabrii |
| #161 | Fil rouge: write the oral scripts and build the slide deck | In progress | P0 | ElCabrii |
| #162 | Fil rouge: final readiness pass and repository cleanup | In progress | P0 | ElCabrii |

## PR et CI representatives

| PR | Objet | Etat | CI |
| --- | --- | --- | --- |
| [#164](https://github.com/MyTuums-Group/MyTuums/pull/164) | MVP Flutter + facade REST mobile | Merged 2026-07-02 | Typecheck, lint, docs, db, tests, build, smoke, axe : SUCCESS |
| [#165](https://github.com/MyTuums-Group/MyTuums/pull/165) | Dossier fil rouge dedie | Merged 2026-07-02 | Typecheck, lint, docs, db, tests, build, smoke, axe : SUCCESS |
| [#167](https://github.com/MyTuums-Group/MyTuums/pull/167) | Preuve smoke local #152 | Merged 2026-07-02 | Typecheck, lint, docs, db, tests, build, smoke, axe : SUCCESS |
| [#168](https://github.com/MyTuums-Group/MyTuums/pull/168) | Architecture et data model fil rouge | Merged 2026-07-02 | Typecheck, lint, docs, db, tests, build, smoke, axe : SUCCESS |
| [#169](https://github.com/MyTuums-Group/MyTuums/pull/169) | Captures responsive web #155 | Open 2026-07-02 | Checks principaux verts au relevement ; smoke/axe encore en cours au snapshot |

## Repartition constatee

| Responsable | Lots fil rouge |
| --- | --- |
| ElCabrii | #151, #153, #159, #160, #161, #162 |
| AcryTeryx | #152, #154, #155, #156, #157, #158 |

## Decision de pilotage

- Les preuves `#151` a `#154` et `#152` ont ete finalisees avant la readiness finale.
- Les lots finaux restent ordonnes par dependances : `#155/#157` avant `#156/#158`, puis `#160`, `#161`, `#162`.
- Les captures manuelles restent separees des preuves code pour eviter de fermer artificiellement des tickets sans artefact exploitable.
