# Préparation orale RNCP

Statut : trame initiale.

Objectif : tenir une présentation de 20 minutes, suivie de 10 minutes de questions, en montrant besoin, contexte, compétences et preuves.

## Trame 20 minutes

| Temps | Partie | Message clé |
| --- | --- | --- |
| 0:00 - 2:00 | Contexte | MyTuums, besoin utilisateur, rôle du candidat |
| 2:00 - 4:00 | Périmètre v1 | Ce qui est inclus, ce qui est volontairement exclu |
| 4:00 - 7:00 | Architecture | monorepo, web, API, DB, blob, email, docs app |
| 7:00 - 10:00 | Développement | modules profonds : média, modération, feed/visibility, account deletion |
| 10:00 - 13:00 | Qualité et sécurité | tests, CI, rate limits, sessions, rôles, blobs privés |
| 13:00 - 15:30 | DevOps | workflow issue -> PR -> CI -> staging -> production |
| 15:30 - 17:30 | Échanges de données | frontend/API/DB/blob, migrations, seed, smoke multi-tiers |
| 17:30 - 19:00 | Preuves RNCP | matrice par blocs et annexes |
| 19:00 - 20:00 | Limites et suite | legal/i18n restant, charge, audit manuel, améliorations |

## Démonstration conseillée

Démo courte, pas exhaustive :

1. montrer le scope et la matrice RNCP ;
2. lancer ou montrer la CI/smoke ;
3. montrer un parcours utilisateur : login/onboarding/post/feed ;
4. montrer un flux technique : upload média ou modération ;
5. montrer une preuve DevOps : workflow deploy ou GitHub project.

## Questions probables

| Question jury | Angle de réponse |
| --- | --- |
| Pourquoi cette architecture ? | Séparation des responsabilités, testabilité, déploiement Azure |
| Comment la sécurité est prise en compte ? | sessions, rôles, rate limits, blobs privés, modération, CORS |
| Comment prouvez-vous la qualité ? | CI, tests, smoke, axe, migrations, PAQ |
| Comment gérez-vous les données ? | Drizzle, migrations, adapters, validations, flux blob, rétention |
| Qu'est-ce qui reste à faire ? | legal/i18n, audit manuel, charge, dossier final, production gates |
| Comment avez-vous pilote le projet ? | issues, branches, PR, CI, planning, journal, recette |
| Quelle compétence était la plus difficile ? | BC04 à formaliser ou média/modération techniquement |

## Règles de présentation

- Ne pas commencer par la stack.
- Partir du besoin utilisateur.
- Relier chaque démonstration à une compétence RNCP.
- Montrer peu de code, mais bien choisi.
- Dire explicitement ce qui est prouvé par chaque document.
- Assumer les limites avec un plan d'action.
