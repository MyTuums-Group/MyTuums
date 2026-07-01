# Matrice de conformite UF DEV B3

Statut : version de travail du 2026-07-01, etablie depuis `UF_DEV_B3.pdf`.

Cette matrice est specifique au fil rouge UF DEV B3. Elle ne remplace pas la
[matrice de preuves RNCP](matrice-preuves.md) : une meme preuve peut etre
reusee, mais les criteres UF DEV B3 et RNCP restent separes.

## Sujet libre retenu

MyTuums est presente comme sujet libre : une plateforme web sociale pour joueurs,
avec backend, base de donnees, media, moderation, recherche et documentation
technique. Le sujet ne reprend pas le Smart Cafe du PDF, mais doit demontrer les
memes competences techniques et transverses.

## Exigences explicites du PDF

| Exigence UF DEV B3 | Preuve MyTuums | Statut | Action restante |
| --- | --- | --- | --- |
| Concevoir une application web avec un framework moderne | React, Vite, TanStack Router dans `apps/web` | Couvert | Ajouter captures finales de l'application |
| Interfaces compatibles desktop, tablette et smartphone | Layout responsive web-first, routes publiques et app | Partiel | Capturer desktop/tablette/mobile apres stack locale verte |
| Respecter les normes d'accessibilite | `pnpm axe:smoke`, page accessibilite, ShadCN/Radix | Partiel | Audit manuel clavier/focus/labels/contraste |
| Optimiser temps de chargement et performances frontend | Vite build, pages statiques, protocole Lighthouse | A produire | Capturer Lighthouse ou equivalent |
| Interfaces intuitives avec feedbacks clairs | Formulaires auth/contact/post, erreurs, toasts, etats de chargement | Partiel | Captures UX des principaux parcours |
| Backend oriente services | `apps/api/src/services/**` et routeurs tRPC fins | Couvert | Illustrer avec un extrait service |
| Code structure selon bonnes pratiques d'architecture | Monorepo, packages, boundaries, `pnpm arch:check` | Couvert | Joindre sortie CI ou locale |
| Appels vers base relationnelle ou NoSQL | PostgreSQL + Drizzle + adapters | Couvert | Joindre schema simplifie et migrations |
| Authentification et autorisation securisees | BetterAuth, sessions, roles, policies, guards | Couvert | Capturer flow login/onboarding |
| Protection endpoints contre vulnerabilites courantes | rate limits, CORS, validations, roles, blobs prives | Couvert | Relier preuves securite au code |
| SOLID, DRY, KISS et maintenabilite | Services profonds, value objects, tests, seams DB | Couvert | Selectionner 2 extraits courts de code |
| Modele de donnees pour les entites | Drizzle schema : user, profile, post, media, moderation, notification | Couvert | Ajouter diagramme DB jury |
| Requetes SQL ou operations NoSQL entre API et DB | Drizzle adapters et migrations | Couvert | Montrer une migration et un adapter |
| Optimiser l'utilisation de la base de donnees | index, contraintes uniques, trigram/unaccent search | Partiel | Expliquer indexes et limites de charge |
| Developper une application Android et/ou iOS | Issue #157/#158 demandent Flutter | Bloque | Aucun projet Flutter dans le repo ; decision humaine requise |
| Versionner son code avec Git | GitHub repo, branches, PR, CI | Couvert | Captures branch/PR/CI finales |
| Collaborer et communiquer en equipe | GitHub Issues, Project Tasks, PRs | Partiel | Captures GitHub Tasks et repartition equipe |
| Gerer un projet informatique | Issues, statuts, journal, planning | Partiel | Completer planning previsionnel/reel |
| Concevoir des interfaces UI/UX | DESIGN.md, ShadCN theme, routes web | Couvert | Captures parcours principaux |
| Documentation fonctionnelle et technique | `docs/prd`, `docs/context`, `docs/rncp` | Partiel | Finaliser pack fil rouge et annexes |
| Presenter et valoriser le projet a l'oral | `preparation-oral.md` | A produire | Deck et scripts #161 |

## Ecarts et decisions a porter a l'oral

| Ecart | Risque jury | Position defendable |
| --- | --- | --- |
| Le PDF demande Android/iOS, mais le scope v1 MyTuums est web-only | Manque sur la competence mobile | Assumer un sujet libre web responsive seulement si l'equipe pedagogique valide ; sinon fournir un MVP Flutter separe |
| Docker absent sur le poste local au 2026-07-01 | Smoke local non demontrable immediatement | Installer/ouvrir Docker Desktop puis rejouer `pnpm infra`, `pnpm smoke:setup`, `pnpm smoke` |
| Accessibilite automatique verte mais audit manuel incomplet | Preuve RGAA/WCAG partielle | Completer la grille manuelle et capturer les pages critiques |
| Performance frontend non mesuree | Optimisation non prouvee | Capturer Lighthouse ou Playwright performance apres build local |

## Captures utiles pour le dossier

- GitHub Project Tasks avec les issues fil rouge et leurs statuts.
- Terminal montrant `pnpm infra`, `pnpm smoke:setup`, `pnpm smoke`,
  `pnpm axe:smoke`.
- Vue desktop, tablette et mobile du feed, du composer, de la recherche, du
  profil et du report.
- Lighthouse ou panneau Performance avec score et metriques.
- Si Flutter est conserve : emulator Android/iOS sur login, feed, composer,
  post detail, report et logout.
