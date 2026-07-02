# Pilotage et collaboration

Statut : version prete pour revue pour issue #159, preuves board/CI indexees.

## Objectif

Montrer que MyTuums a ete pilote comme un projet informatique : cadrage, priorisation, repartition, implementation, validation, revue, CI et preparation de demo.

## Workflow de travail

1. Besoin ou preuve manquante identifiee.
2. Issue GitHub creee avec acceptance criteria.
3. Issue ajoutee au projet org `Tasks`.
4. Statut `Backlog`, puis `Ready` ou `In progress`.
5. Branche de travail.
6. Implementation ou documentation.
7. Validation locale.
8. Commit et PR.
9. CI GitHub Actions.
10. Revue, merge ou correction.
11. Preuve indexee dans le dossier fil rouge.

## Repartition ElCabrii / AcryTeryx

| Domaine | Responsable principal | Preuves attendues |
| --- | --- | --- |
| Matrice projet fil rouge | ElCabrii | #151, matrice, index preuves. |
| Document fonctionnel jury | ElCabrii | #153, recit produit, perimetre, limites. |
| Pilotage et collaboration | ElCabrii | #159, planning, board, PR/CI. |
| Demo runbook et fallback | ElCabrii | #160, sequence, commandes, supports de repli. |
| Scripts oraux | ElCabrii | #161, scripts 10/20 min, Q/R. |
| Readiness finale | ElCabrii | #162, coherence, liens, git status. |
| Smoke local full stack | AcryTeryx | #152, logs infra/smoke. |
| Architecture et data model | AcryTeryx | #154, [architecture technique](architecture-technique-jury.md), [modele de donnees](modele-donnees-jury.md). |
| Captures responsive web | AcryTeryx | #155, [preuve responsive web](preuve-responsive-web-155.md). |
| Accessibilite et performance | AcryTeryx | #156, axe, audit manuel, Lighthouse. |
| Mobile MVP live demo | AcryTeryx | #157, analyze/test/build/demo. |
| Mobile evidence fallback | AcryTeryx | #158, screenshots/video/setup. |

## Planning previsionnel et reel

| Phase | Objectif | Prevu | Reel | Ecart | Preuve |
| --- | --- | --- | --- | --- | --- |
| Cadrage | Clarifier sujet libre et scope v1 | Avant dev principal | 2026-05 a 2026-06 | Scope affine apres implementation | [PRD v1](../prd/v1-prd.md), [Scope v1](../prd/v1-scope.md) |
| Architecture | Monorepo, API, DB, stockage, docs app | Avant features coeur | 2026-05 a 2026-06 | Architecture stabilisee par lots successifs | [Architecture scope](../prd/v1-scope/architecture.md), ADR |
| Features coeur | Auth, profils, posts, feeds, search, social | Sprint principal | 2026-05 a 2026-06 | Plusieurs PR produit mergees avant dossier final | Issues/PR produit |
| Securite/moderation | Roles, reports, cases, audit, visibility | Sprint principal | 2026-05 a 2026-06 | Preuves a consolider cote architecture/security | Tests moderation/staff |
| Mobile | Facade REST et MVP Flutter | Fin de projet | 2026-07-02 | MVP merge via PR #164, captures a produire | [ADR 0004](../adr/0004-mobile-rest-facade-before-orpc.md), #157, #158 |
| Validation | CI, tests, smoke, axe, mobile | Avant oral final | 2026-07-02 en cours | CI verte sur PR #164/#165/#166, preuves manuelles restantes | #152, #156 |
| Dossier fil rouge | Matrice, docs, demo, oral, preuves | Avant rendu | 2026-07-02 en cours | Socle ElCabrii pret, attente preuves AcryTeryx | #151, #153, #159, #160, #161, #162 |

## Traces GitHub a capturer

| Trace | Pourquoi | Statut |
| --- | --- | --- |
| Projet `Tasks` avec issues fil rouge | Prouve suivi d'avancement et repartition | Couvert par [preuve #159](preuve-pilotage-159.md) |
| Liste des issues #151 a #162 | Prouve decoupage du travail | Couvert par GitHub |
| PR representative backend/service | Prouve implementation et revue technique | A selectionner dans les PR service/API mergees |
| PR representative frontend/UI | Prouve interface et tests web | A selectionner dans les PR web mergees |
| PR docs fil rouge | Prouve dossier projet fil rouge separe de RNCP | Cette branche/PR |
| PR mobile #164 | Prouve MVP Flutter et facade REST mobile | Couvert par PR #164 et [preuve mobile](preuve-mobile-157-158.md), captures a joindre via #158 |
| CI verte | Prouve qualite continue | Couvert par [preuve #159](preuve-pilotage-159.md) pour PR #164/#165/#167/#168 |
| Historique Git local | Prouve versioning | Couvert |

## Decisions et arbitrages

| Decision | Contexte | Arbitrage | Preuve |
| --- | --- | --- | --- |
| Sujet libre MyTuums | Le PDF autorise un sujet libre si les memes competences sont mobilisees | Conserver une plateforme sociale gaming plutot que Smart Cafe | [Document fonctionnel jury](document-fonctionnel-jury.md) |
| Web-first puis Flutter MVP | Le web est le produit principal, le mobile doit prouver Android/iOS sans parite totale | MVP mobile cible sur parcours critiques | [ADR 0004](../adr/0004-mobile-rest-facade-before-orpc.md) |
| Backend par services/adapters | Besoin de testabilite et d'evolutivite | Routers minces, services profonds, adapters DB | [Coding practices](../context/coding-practices/CONTEXT.md) |
| Documentation fil rouge separee RNCP | Les criteres du projet fil rouge et du RNCP ne sont pas les memes | `docs/fil-rouge/` dedie, `docs/rncp/` reutilisable comme preuve secondaire | [README fil rouge](README.md) |
| Demo courte avec fallback | Risque de service local, navigateur ou emulateur instable le jour J | Runbook + captures/video + procedures de reprise | [Runbook de demo](runbook-demo.md) |

## Acceptation de #159

| Critere | Statut | Preuve |
| --- | --- | --- |
| Planning previsionnel/reel ecrit | Couvert | Tableau ci-dessus. |
| GitHub Issues/Tasks/PR/CI evidence capturee | Couvert | [Preuve pilotage #159](preuve-pilotage-159.md). |
| Roles ElCabrii/AcryTeryx clairs | Couvert | Repartition ci-dessus. |
| Decisions et tradeoffs resumes | Couvert | Tableau decisions et arbitrages. |
