# Questions reponses jury

Statut : version initiale pour issue #161.

## Produit et sujet libre

| Question probable | Reponse courte |
| --- | --- |
| Pourquoi ne pas avoir fait le Smart Cafe ? | Le PDF autorise un sujet libre s'il mobilise les memes competences. MyTuums couvre web, backend securise, DB, mobile, docs, Git, gestion projet et oral avec un besoin reel dans un autre domaine. |
| Quel est le besoin utilisateur ? | Les joueurs ont besoin d'un espace cible pour publier, decouvrir et discuter de contenus courts lies aux jeux, sans la complexite d'une plateforme de streaming ou d'un reseau social generaliste. |
| Quelle est la valeur de la v1 ? | Prouver le coeur social : auth, profil, posts, feed, recherche, interactions, signalement, moderation et mobile cible. |
| Qu'avez-vous volontairement exclu ? | Messagerie, live streaming, recommandations avancees, OAuth, 2FA, hashtags, analytics, paiement et parite mobile complete. |

## Architecture et technique

| Question probable | Reponse courte |
| --- | --- |
| Pourquoi un monorepo ? | Pour partager types, UI, config, DB schema et contrats tout en gardant des apps separees : web, API, docs, mobile. |
| Pourquoi React/Vite ? | Pour une web app moderne, rapide a developper, testable et compatible avec la stack design Tailwind/ShadCN. |
| Pourquoi Fastify/tRPC/BetterAuth ? | Fastify pour l'API HTTP, tRPC pour le contrat type-safe web/API, BetterAuth pour reduire le risque sur les primitives auth. |
| Pourquoi Drizzle/PostgreSQL ? | PostgreSQL apporte contraintes, relations, index et transactions. Drizzle garde le schema versionne et lisible en TypeScript. |
| Pourquoi une facade REST mobile ? | Flutter consomme REST plus simplement que tRPC. L'ADR mobile formalise ce choix temporaire avant oRPC/OpenAPI. |

## Securite

| Question probable | Reponse courte |
| --- | --- |
| Comment protegez-vous les endpoints ? | Validation d'entrees, sessions, roles, account status, CORS, rate limits, guards staff, erreurs normalisees. |
| Comment gerez-vous les medias ? | Upload controle, stockage blob, URLs signees, visibility, cleanup, moderation hold. |
| Comment evitez-vous les abus ? | Signalements, moderation cases, roles staff, audit, suspensions, blocs, visibility policies. |
| Les secrets sont-ils dans le depot ? | Non. Les fichiers `.env*` locaux sont ignores, les secrets doivent passer par env GitHub/Azure. |

## Base de donnees et donnees

| Question probable | Reponse courte |
| --- | --- |
| Quelles entites principales ? | User, profile, game, post, media, comment, like, follow, block, notification, report, moderation case, audit, rate limit. |
| Comment gerez-vous les migrations ? | Migrations Drizzle versionnees, validation `db:check`, application explicite dans les workflows. |
| Comment prouvez-vous les echanges de donnees ? | Tables frontend -> API -> DB, flux media -> blob, smoke local, migrations, seeds et tests integration. |

## Qualite et validation

| Question probable | Reponse courte |
| --- | --- |
| Comment prouvez-vous la qualite ? | Typecheck, lint, tests, build, docs:validate, db:check, smoke Playwright, axe smoke, CI GitHub Actions. |
| Comment prouvez-vous l'accessibilite ? | Axe smoke est la preuve automatique ; l'audit manuel clavier/focus/contraste est a joindre via #156. |
| Comment prouvez-vous les performances ? | Mesure Lighthouse ou equivalente a joindre via #156, plus build/smoke pour verifier les parcours. |
| Que faites-vous si la demo live echoue ? | Runbook de reprise et fallback pack : captures, videos, logs, dernier smoke vert. |

## Pilotage

| Question probable | Reponse courte |
| --- | --- |
| Comment avez-vous travaille en equipe ? | Issues GitHub, board Tasks, PR, CI, repartition ElCabrii/AcryTeryx, decisions documentees. |
| Comment suivez-vous les dependances ? | Chaque issue fil rouge indique ses blockers ; #160, #161 et #162 attendent des preuves AcryTeryx. |
| Quel a ete l'arbitrage le plus important ? | Garder une v1 stricte et defendable plutot qu'ajouter trop de features. |
| Quelle limite reste la plus importante ? | Finaliser les preuves manuelles : captures responsive, accessibilite, performance, mobile et readiness finale. |
