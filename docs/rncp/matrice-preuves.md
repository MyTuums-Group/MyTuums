# Matrice de preuves RNCP

Statut : version initiale à consolider avec les captures, liens de PR et références finales du dossier.

Cette matrice est la colonne vertébrale du dossier RNCP. Elle relie les activités du référentiel aux preuves MyTuums disponibles ou à produire.

Légende :

- Fort : preuve déjà solide dans le dépôt.
- Moyen : preuve présente mais à formaliser.
- À compléter : preuve à produire avant rendu.

## BC01 - Concevoir des applications numériques avec sécurité

| Activité RNCP | Preuve principale | Preuve secondaire | Statut | Commentaire dossier |
| --- | --- | --- | --- | --- |
| Étude du cahier des charges et rédaction des spécifications fonctionnelles | [Cahier des charges](cahier-des-charges.md) | [Scope v1](../prd/v1-scope.md), [PRD v1](../prd/v1-prd.md) | Moyen | Le besoin et le périmètre sont bien documentés ; il faut conserver une version "client/jury" plus narrative. |
| Conception d'une application logicielle | [Scope architecture](../prd/v1-scope/architecture.md) | [Contexte coding practices](../context/coding-practices/CONTEXT.md), [README](https://github.com/MyTuums-Group/MyTuums/blob/main/README.md) | Fort | Le monorepo, les couches, les packages et la séparation web/API/DB sont explicites. |
| Conception de services métiers réutilisables | Services API sous `apps/api/src/services` | Tests services API | Fort | Les règles métier sont majoritairement encapsulées dans des services testables. |
| Conception de services d'accès aux données | Adapters sous `apps/api/src/services/**` | [DB import seam](../agents/db-import-seam.md), `pnpm arch:check` | Fort | L'accès DB direct est encadré ; la persistance passe par des adapters et des seams. |
| Préparation et contrôle des tests unitaires | `pnpm test`, tests Vitest | [Plan d'assurance qualité](plan-assurance-qualite.md) | Fort | Les tests existent ; le dossier doit inclure un extrait de résultat et la stratégie de couverture. |
| Estimation de charge et robustesse | [Sécurité, accessibilité et charge](securite-accessibilite-charge.md) | `pnpm smoke`, API health checks | À compléter | Il faut produire un protocole de charge léger et des résultats mesurables. |
| IHM adaptative et accessibilité | `pnpm axe:smoke`, pages statiques accessibilité | [Rapport accessibilité](securite-accessibilite-charge.md) | Moyen | Axe est une bonne preuve automatique ; l'audit manuel clavier/focus/contraste reste à produire. |
| Identification des risques de sécurité | [Analyse de risques](securite-accessibilite-charge.md) | Auth, rôles, rate limits, blobs privés, CORS, modération | Moyen | Les contrôles existent dans le code ; la matrice de risques doit être finalisée. |
| Amélioration de la qualité du logiciel et du code | TypeScript strict, ESLint, Prettier, CI | [Plan d'assurance qualité](plan-assurance-qualite.md) | Fort | Le dossier doit expliquer les choix qualité et montrer les commandes vertes. |
| Programmation sécurisée de l'accès aux données | Schéma Drizzle, migrations, contraintes, index | Tests de services et intégration PostgreSQL | Fort | Prouver la sécurité par contraintes, validation API et gestion d'erreurs. |

## BC02 - Piloter un projet DevOps

| Activité RNCP | Preuve principale | Preuve secondaire | Statut | Commentaire dossier |
| --- | --- | --- | --- | --- |
| Étude des procédures existantes | [Pilotage DevOps](bc02-pilotage-devops.md) | [README](https://github.com/MyTuums-Group/MyTuums/blob/main/README.md), scripts package | Moyen | Formaliser l'existant : dev local, CI, smoke, deploy, maintenance. |
| Contrôle de conformité à la gouvernance | [Team conventions](../team-conventions.md) | [AGENTS](../../AGENTS.md), workflows GitHub | Moyen | Les conventions existent ; ajouter décision de validation/réingénierie. |
| Reconfiguration de processus | [Pilotage DevOps](bc02-pilotage-devops.md) | Évolution docs : scope split, manifest docs | À compléter | Documenter un avant/après : docs monolithiques -> scope split et docs app. |
| Cartographie de circulation des documents | Workflow besoin -> issue -> PR -> CI -> merge -> staging | GitHub Issues/Projects | Moyen | Produire un schéma textuel ou Mermaid dans le dossier final si autorisé hors docs app. |
| Conception d'une base de données | Schéma Drizzle + migrations | [BC04 données](bc04-echanges-donnees.md) | Fort | Le modèle relationnel est riche ; ajouter un schéma simplifié pour le jury. |
| Conception de l'architecture applicative | [Scope architecture](../prd/v1-scope/architecture.md) | [Azure deployment](../deployment/azure.md) | Fort | Prouver la structure en couches et l'urbanisation web/API/DB/blob/docs. |
| Choix de réutilisation ou code neuf | [Plan d'assurance qualité](plan-assurance-qualite.md) | ADR, package boundaries | Moyen | Expliquer ShadCN, BetterAuth, tRPC, Drizzle, adapters maison. |
| Planification des tâches | [Pilotage DevOps](bc02-pilotage-devops.md) | GitHub Issues, historique Git | À compléter | Produire planning prévisionnel/réel et écarts. |
| Coordination Agile | GitHub Issues + projet Tasks | Branches/PR/labels | Moyen | Les traces existent ; exporter/capturer backlog et statuts. |
| Recettage du logiciel | [PV de recette](pv-recette-bon-integrer.md) | Smoke tests, axe smoke, CI | À compléter | Rédiger un PV de validation des parcours critiques. |
| Démonstration et validation client | [Préparation orale](preparation-oral.md) | Captures application, démo locale | À compléter | Préparer support de démo et feedback fictif/mentor si disponible. |
| Validation de mise en exploitation | [Bon à intégrer](pv-recette-bon-integrer.md) | [Deploy workflow](https://github.com/MyTuums-Group/MyTuums/blob/main/.github/workflows/deploy.yml) | Moyen | Compléter go/no-go, rollback, variables, migrations, smoke. |
| Réunions et interviews utilisateurs | Journal de bord à produire | PRD, cahier des charges | À compléter | Ajouter compte rendu de cadrage et reformulation du besoin. |
| Communication professionnelle FR/EN | Docs repo + README anglais | Issue/PR en anglais si disponible | Moyen | Le dépôt contient beaucoup d'anglais technique ; ajouter une preuve ciblée. |

## BC03 - Développer des applications numériques

| Activité RNCP | Preuve principale | Preuve secondaire | Statut | Commentaire dossier |
| --- | --- | --- | --- | --- |
| Lever les doutes techniques | Fiches techniques à produire | Cycle de vie média, modération, visibility | À compléter | Rédiger une fiche "problème, options, décision, résultat". |
| Transcrire les spécifications en algorithmes | Services feed/search/media/moderation | Tests associés | Moyen | Ajouter pseudo-code ou décomposition d'un module complexe. |
| Traduire les algorithmes en code source | Code TypeScript services/API/web | Typecheck/build | Fort | Sélectionner extraits courts et expliquer les interfaces. |
| Modifier un code existant sans régression | Historique Git + tests | Exemple : media, staff, auth rate limits | Moyen | Choisir une PR/commit et documenter avant/après. |
| Compiler et déverminer | `pnpm typecheck`, `pnpm build`, `pnpm lint` | `pnpm test` | Fort | Garder logs ou captures d'une exécution verte. |
| Intégrer des éléments logiciels hétérogènes | Web, API, DB, Azure Blob, Mailpit/Resend, Sentry | Smoke tests | Fort | Prouver l'intégration multi-composants par smoke local. |
| Intégrer des fonctionnalités préprogrammées | BetterAuth, tRPC, Drizzle, ShadCN/Radix | Package manifests | Fort | Expliquer la réutilisation et l'adaptation aux contraintes MyTuums. |
| Réaliser les tests unitaires | Vitest API/web/packages | [Plan assurance qualité](plan-assurance-qualite.md) | Fort | Mettre en annexe la liste des suites représentatives. |
| Mettre à jour planning et compte rendu d'activité | [Pilotage DevOps](bc02-pilotage-devops.md) | Git log, issues, [journal de bord](journal-de-bord.md) | À compléter | Produire un suivi personnel estimé/réel/écarts. |

## BC04 - Réaliser une interface d'échange de données informatisées

| Activité RNCP | Preuve principale | Preuve secondaire | Statut | Commentaire dossier |
| --- | --- | --- | --- | --- |
| Rétro-documenter logiciels et bases de données | [BC04 échanges de données](bc04-echanges-donnees.md) | Schéma Drizzle, migrations | Moyen | La rétro-documentation initiale est créée ; ajouter un schéma visuel final. |
| Tables de correspondance de données | Tables frontend -> API -> DB, média -> blob | Schémas de validation, services | Moyen | Formaliser au moins deux flux : inscription/onboarding et upload média. |
| Consolidation et agrégation de données | Feeds, notifications, moderation cases, counts | Services feed/notification/moderation | Moyen | Décrire les dénormalisations et critères RGPD/visibilité. |
| Contrôle des flux de données entre logiciels | tRPC, REST auth/upload, Azure Blob, Mailpit/Resend | Smoke tests, logs | Fort | Le projet a plusieurs interfaces effectives ; les rendre visibles dans le dossier. |
| Environnement de tests multi-tiers | Docker Compose, Postgres, Azurite, Mailpit, Playwright | `pnpm infra`, `pnpm smoke` | Fort | Ajouter logs/captures d'exécution et schéma d'environnement. |

## Prochaines preuves à produire

1. Captures ou exports GitHub Actions verts.
2. Logs `pnpm test`, `pnpm smoke`, `pnpm axe:smoke`, `pnpm db:check`.
3. Schéma d'architecture simplifié jury.
4. Schéma de flux de données média et feed.
5. Rapport de charge avec protocole et résultats.
6. PV de recette signé ou validé par le porteur du projet.
7. Journal de bord et planning prévisionnel/réel.
8. Matrice fil rouge dediee : [UF DEV B3](uf-dev-b3-conformite.md).
9. Pack preuves fil rouge : [demo locale](preuves-demo-locale.md), [responsive](preuves-responsive.md), [accessibilite/performance](audit-accessibilite-performance.md), [mobile Flutter](mobile-flutter-statut.md).
