# Scripts oraux

Statut : scripts et trame de deck prets pour repetition, chronometrage humain restant.

## Repartition speaker

| Partie | Speaker principal | Role |
| --- | --- | --- |
| Introduction, sujet libre, besoin | ElCabrii | Poser le contexte et relier au PDF UF DEV B3. |
| Fonctionnel et demo web | ElCabrii | Expliquer les parcours et la valeur produit. |
| Architecture, data model, mobile, validation technique | AcryTeryx | Appuyer les preuves techniques attendues par #154, #157, #158. |
| Pilotage, qualite, risques, conclusion | ElCabrii | Montrer organisation, CI, limites et prochaines etapes. |

## Script 10 minutes - oral intermediaire

| Temps | Script |
| --- | --- |
| 0:00 - 1:00 | "Nous avons choisi un sujet libre : MyTuums, une plateforme sociale pour joueurs. Le sujet ne reprend pas le Smart Cafe, mais il mobilise les memes competences : web, backend securise, base de donnees, mobile, Git, collaboration, documentation et oral." |
| 1:00 - 2:00 | "Le besoin est de proposer un espace simple pour publier des contenus courts lies aux jeux, decouvrir des profils et des jeux, interagir et signaler les abus. Nous avons volontairement limite la v1 : posts publics, flux chronologiques, catalogue de jeux seedes, moderation reactive." |
| 2:00 - 3:30 | "Le coeur fonctionnel couvre l'inscription, la verification email, l'onboarding, le profil, le feed, la recherche, la creation de post, les commentaires, les likes, les follows, les reports et la moderation." |
| 3:30 - 5:00 | "Cote architecture, le projet est un monorepo : web React/Vite, API Fastify/tRPC/BetterAuth, PostgreSQL avec Drizzle, stockage Azure Blob/Azurite, email Resend/Mailpit et MVP mobile Flutter." |
| 5:00 - 6:30 | "Nous avons decoupe le travail en issues GitHub et suivi le projet dans Tasks. Les livrables fil rouge sont separes dans `docs/fil-rouge/`, pour ne pas confondre UF DEV B3 et RNCP." |
| 6:30 - 8:00 | "Les preuves techniques reposent sur les tests, la CI, le smoke local, axe, les migrations et les docs d'architecture. Les preuves restantes concernent surtout les captures finales, le runbook demo et la validation mobile." |
| 8:00 - 9:30 | "Les limites sont assumees : pas de messagerie, pas de live streaming, pas de recommandations avancees, pas de parite mobile complete. Ces exclusions rendent la v1 plus realiste et mieux defendable." |
| 9:30 - 10:00 | "La prochaine etape est de finaliser les preuves : captures web/mobile, schema technique, accessibilite/performance, scripts oraux et index final." |

## Script 20 minutes - oral final

| Temps | Partie | Script |
| --- | --- | --- |
| 0:00 - 1:30 | Introduction | "Nous presentons MyTuums, notre sujet libre UF DEV B3. L'objectif n'est pas de copier Smart Cafe, mais de demontrer les memes competences sur un produit coherent : une plateforme sociale pour joueurs." |
| 1:30 - 3:00 | Besoin | "Les joueurs ont besoin d'un espace plus cible que les reseaux generalistes et moins lourd qu'une plateforme de streaming. MyTuums permet de publier, chercher, suivre, commenter et signaler autour des jeux." |
| 3:00 - 5:00 | Perimetre | "La v1 se concentre sur posts publics, profils, feed chronologique, recherche utilisateurs/jeux, interactions sociales, signalements et moderation. Le mobile Flutter couvre les parcours essentiels sans chercher la parite totale." |
| 5:00 - 8:00 | Demo web | "Nous montrons le parcours utilisateur : login, onboarding, feed, creation de post, recherche, interaction et signalement. Chaque etape correspond a une ligne de la matrice UF DEV B3." |
| 8:00 - 10:30 | Architecture | "Le monorepo separe web, API, DB, packages partages et mobile. Les routers restent minces, les services portent les regles metier, les adapters isolent la persistence. PostgreSQL et Drizzle structurent les donnees." |
| 10:30 - 12:00 | Securite | "La securite repose sur BetterAuth, sessions, roles, validation, rate limits, CORS, blobs prives, moderation et lancement progressif. Les endpoints sensibles verifient l'etat compte et le role." |
| 12:00 - 13:30 | Mobile | "Le mobile Flutter utilise une facade REST dediee avant oRPC/OpenAPI. Ce choix limite le risque et permet de prouver Android/iOS sur les parcours critiques." |
| 13:30 - 15:00 | Qualite | "La qualite est prouvee par typecheck, lint, tests Vitest, docs:validate, db:check, smoke Playwright, axe smoke et CI GitHub Actions." |
| 15:00 - 16:30 | Pilotage | "Le travail est suivi par GitHub Issues et Tasks. Nous distinguons les livrables ElCabrii et AcryTeryx, les dependances, les issues bloquees et les preuves a joindre." |
| 16:30 - 18:00 | Preuves | "Le dossier `docs/fil-rouge/` est la carte de lecture du jury : matrice, document fonctionnel, pilotage, runbook, scripts, Q/R et index final." |
| 18:00 - 19:15 | Limites | "Les limites sont explicites : legal launch gates, audit manuel final, performance a capturer, production a valider, pas de parite mobile complete." |
| 19:15 - 20:00 | Conclusion | "MyTuums prouve un produit coherent, une architecture maintenable et une demarche projet defendable. Le dossier relie chaque exigence UF DEV B3 a une preuve concrete." |

## Chronometrage a faire

| Script | Cible | Statut |
| --- | --- | --- |
| 10 minutes | 9:30 a 10:30 | A chronometrer |
| 20 minutes | 19:00 a 20:30 | A chronometrer |

## Acceptation de #161

| Critere | Statut | Preuve |
| --- | --- | --- |
| Script 10 min ecrit et time | Partiel | Script present, chronometrage a faire. |
| Script 20 min ecrit et time | Partiel | Script present, chronometrage a faire. |
| Speaker split documente | Couvert | Tableau ci-dessus. |
| Questions jury preparees | Couvert | [Questions reponses jury](questions-reponses-jury.md). |
| Deck pre-final prepare | Partiel | [Diaporama fil rouge](diaporama-fil-rouge.md), placeholders captures a remplacer. |
