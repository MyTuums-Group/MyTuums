# Matrice de conformite - projet fil rouge

Statut : matrice complete cote ElCabrii, a enrichir avec les captures et logs finaux.

Source des attendus : `G:/RNCP/Autres/UF_DEV_B3.pdf`.

Legende :

- `Couvert` : preuve deja disponible dans le depot ou dans les livrables fil rouge.
- `Partiel` : preuve structuree, mais capture, log ou validation finale a joindre.
- `A produire` : preuve attendue par une issue encore dependante d'un livrable externe.
- `Bloque` : preuve dependante d'une issue bloquante non terminee.

## Exigences produit et fonctionnelles

| Attendu projet fil rouge | Preuve MyTuums | Statut | Responsable | Issue liee | Action restante |
| --- | --- | --- | --- | --- | --- |
| Concevoir une solution adaptee a un besoin metier reel | [Document fonctionnel jury](document-fonctionnel-jury.md), [PRD v1](../prd/v1-prd.md) | Couvert | ElCabrii | #153 | Relire avec le discours final. |
| Choisir un sujet libre mobilisant les memes competences que Smart Cafe | [Document fonctionnel jury](document-fonctionnel-jury.md), [Scripts oraux](scripts-oraux.md) | Couvert | ElCabrii | #153 | Dire explicitement le choix du sujet libre en introduction. |
| Produire une documentation fonctionnelle | [Document fonctionnel jury](document-fonctionnel-jury.md), [Scope v1](../prd/v1-scope.md) | Couvert | ElCabrii | #153 | Ajouter captures finales si utiles. |
| Produire une documentation technique | [Architecture scope](../prd/v1-scope/architecture.md), [Azure deployment](../deployment/azure.md), [RNCP data exchanges](../rncp/bc04-echanges-donnees.md) | Partiel | AcryTeryx | #154 | Ajouter schema architecture jury et schema DB simplifie. |
| Presenter et valoriser le projet a l'oral | [Scripts oraux](scripts-oraux.md), [Diaporama fil rouge](diaporama-fil-rouge.md), [Questions reponses jury](questions-reponses-jury.md) | Partiel | ElCabrii | #161 | Exporter le diaporama final, chronométrer les scripts et enrichir avec captures finales si disponibles. |

## Web, UI et experience utilisateur

| Attendu projet fil rouge | Preuve MyTuums | Statut | Responsable | Issue liee | Action restante |
| --- | --- | --- | --- | --- | --- |
| Concevoir une application web avec un framework moderne | React 19, Vite, TanStack Router dans [README](https://github.com/MyTuums-Group/MyTuums/blob/main/README.md), application `apps/web` | Couvert | Equipe | #153 | Selectionner 2 captures web pour l'oral. |
| Developper des interfaces compatibles desktop, tablette et smartphone | Web responsive, [DESIGN](https://github.com/MyTuums-Group/MyTuums/blob/main/DESIGN.md), captures a collecter | Bloque | AcryTeryx | #155 | Joindre captures desktop/tablette/mobile. |
| Concevoir des interfaces UI/UX | [DESIGN](https://github.com/MyTuums-Group/MyTuums/blob/main/DESIGN.md), parcours dans [Document fonctionnel jury](document-fonctionnel-jury.md) | Partiel | Equipe | #153, #155 | Completer par captures de feed, composer, profile, moderation. |
| Respecter les normes d'accessibilite | Page accessibilite produit, `pnpm axe:smoke`, rapport manuel attendu | Bloque | AcryTeryx | #156 | Joindre resultat axe et audit clavier/focus/contraste. |
| Optimiser les temps de chargement et performances frontend | Build Vite, smoke Playwright, Lighthouse ou mesure equivalente attendue | Bloque | AcryTeryx | #156 | Ajouter mesure performance et conclusion. |
| Fournir des feedbacks clairs : erreurs, validations, succes/echec/chargement | Auth, onboarding, composer, report sheet, notifications UI | Partiel | Equipe | #153, #155 | Illustrer avec captures des etats erreur/loading/succes. |
| Accompagner l'utilisateur avec des interactions fluides | Parcours demo web et mobile dans [Runbook de demo](runbook-demo.md) | Partiel | ElCabrii | #160 | Valider en smoke local avant oral. |

## Backend, securite et base de donnees

| Attendu projet fil rouge | Preuve MyTuums | Statut | Responsable | Issue liee | Action restante |
| --- | --- | --- | --- | --- | --- |
| Implementer une architecture backend orientee services | `apps/api/src/services/**`, [Architecture scope](../prd/v1-scope/architecture.md) | Couvert | Equipe | #154 | Selectionner 2 modules a montrer : media et moderation. |
| Structurer le code selon les bonnes pratiques d'architecture logicielle | Services/adapters, `pnpm arch:check`, [Coding practices](../context/coding-practices/CONTEXT.md) | Couvert | Equipe | #154 | Joindre sortie `pnpm lint` ou `pnpm arch:check`. |
| Suivre SOLID, DRY, KISS et bonnes pratiques de code | Modules profonds, tests services, refactors traces par PR | Partiel | Equipe | #159 | Citer une PR/refactor representative dans le dossier pilotage. |
| Gerer les appels vers une base relationnelle ou NoSQL | PostgreSQL + Drizzle, migrations, adapters DB | Couvert | Equipe | #154 | Ajouter schema DB simplifie. |
| Concevoir un modele de donnees pour les entites | `packages/db/src/schema.ts`, [Core data entities](../prd/v1-scope/data-entities.md) | Couvert | Equipe | #154 | Joindre schema lisible jury. |
| Ecrire des requetes SQL ou operations NoSQL entre API et DB | Drizzle adapters, migrations, search Postgres, feed queries | Couvert | Equipe | #154 | Selectionner un flux donnees a expliquer. |
| Optimiser l'utilisation de la base de donnees | Index, contraintes, `pg_trgm`, pagination cursor, denormalisations controlees | Couvert | Equipe | #154 | Citer migrations et tests search/feed. |
| Implementer authentification et autorisation securisees | BetterAuth, sessions, roles owner/admin/moderator/user, guards API | Couvert | Equipe | #153, #154 | Montrer login + moderation/admin uniquement si necessaire. |
| Proteger les endpoints contre vulnerabilites courantes | Rate limits, CORS, validation schemas, roles, blobs prives, erreurs transport | Partiel | Equipe | #154, #156 | Relier aux preuves securite/accessibilite. |

## Mobile

| Attendu projet fil rouge | Preuve MyTuums | Statut | Responsable | Issue liee | Action restante |
| --- | --- | --- | --- | --- | --- |
| Developper une application Android et/ou iOS | Flutter MVP dans `apps/mobile`, ADR mobile REST facade, PR #164 mergee le 2026-07-02 | Partiel | AcryTeryx | #157 | Rejouer `flutter analyze`, `flutter test`, build/debug sur le poste de demo. |
| Fournir une version mobile du projet initial | MVP mobile auth, onboarding, feed, discover, composer, post detail, like, report, logout | A produire | AcryTeryx | #157, #158 | Capturer demo emulateur ou video courte. |
| Documenter setup et API URL mobile | [Runbook de demo](runbook-demo.md), `apps/mobile/README.md` | Partiel | ElCabrii | #160 | Verifier commande finale Android/iOS avant oral. |

## Collaboration, Git et gestion projet

| Attendu projet fil rouge | Preuve MyTuums | Statut | Responsable | Issue liee | Action restante |
| --- | --- | --- | --- | --- | --- |
| Versionner son code avec Git | Historique Git, branches, PR, commits | Couvert | Equipe | #159 | Selectionner 3 commits/PR representatifs. |
| Collaborer et communiquer avec GitHub/Trello/Notion/Teams ou equivalent | GitHub Issues, Project Tasks, PR, CI, repartition ElCabrii/AcryTeryx | Couvert | ElCabrii | #159 | Capturer board Tasks et issues fil rouge. |
| Gerer un projet informatique : planification et suivi | [Pilotage et collaboration](pilotage-collaboration.md) | Partiel | ElCabrii | #159 | Completer dates reelles et ecarts. |
| Montrer une note transverse pendant oral intermediaire 10 minutes | [Scripts oraux](scripts-oraux.md) | Partiel | ElCabrii | #161 | Chronometrer le script 10 minutes. |
| Montrer une note technique pendant oral final 20 minutes | [Scripts oraux](scripts-oraux.md) | Partiel | ElCabrii | #161 | Chronometrer le script 20 minutes. |

## Synthese des dependances

| Issue | Objet | Dependances | Impact fil rouge |
| --- | --- | --- | --- |
| #151 | Matrice projet fil rouge | Aucune | Debloque le cadrage et la priorisation. |
| #153 | Document fonctionnel jury | #151 | Debloque le recit produit et l'oral. |
| #159 | Pilotage/collaboration | #151 | Debloque les preuves transverses. |
| #160 | Runbook demo | #152, #155, #157, #158 | Peut etre prepare, validation finale apres preuves web/mobile. |
| #161 | Scripts oraux et diaporama | #153, #154, #156, #159, #160 | Peut etre redige, finalisation apres architecture/accessibilite/demo. |
| #162 | Readiness finale | #151 a #161 | Derniere passe uniquement quand toutes les preuves sont disponibles. |
