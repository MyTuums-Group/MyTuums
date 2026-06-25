# Plan d'assurance qualité RNCP

Statut : socle initial.

## Objectif

Ce plan décrit comment MyTuums garantit la qualité du logiciel : conception en couches, validation automatique, tests, CI/CD, revue documentaire et non-régression.

## Principes qualité

- Les règles métier vivent dans des services testables.
- Les routeurs API restent fins.
- Les accès à la base passent par des adapters ou seams identifiés.
- Les validations API sont canoniques.
- Les constantes partagées encadrent les limites utilisateur.
- Les migrations de schéma sont explicites.
- Les tests vérifient le comportement observable.
- Les workflows CI bloquent les régressions avant intégration.

## Contrôles automatiques

| Contrôle | Commande ou preuve | Objectif RNCP |
| --- | --- | --- |
| Installation déterministe | `pnpm install --frozen-lockfile` | Reproductibilité |
| Architecture imports DB | `pnpm arch:check` | Respect des couches |
| TypeScript strict | `pnpm typecheck` | Robustesse et maintenabilité |
| Lint | `pnpm lint` | Qualité de code |
| Tests unitaires/intégration | `pnpm test` | Non-régression |
| Build | `pnpm build` | Intégrabilité |
| Schéma/migrations DB | `pnpm db:check` | Cohérence données |
| Smoke E2E | `pnpm smoke` | Parcours critique |
| Accessibilité auto | `pnpm axe:smoke` | Contrôle WCAG/RGAA initial |
| Documentation | `pnpm docs:validate` | Liens et manifest docs |

## Types de tests

- Tests de services API : posts, commentaires, média, modération, notifications, recherche, rôles, suppression de compte.
- Tests web : formulaires, routes, guards, présentation, recherche, pages statiques.
- Tests packages : value objects, policies, docs-content.
- Tests smoke Playwright : parcours applicatifs avec infrastructure locale.
- Axe smoke : vérification accessibilité automatisée.

## Non-régression

La non-régression repose sur trois niveaux :

1. tests rapides sur services et composants ;
2. tests d'intégration sur les flux critiques ;
3. smoke tests contre une stack locale proche production.

Les résultats à joindre en annexe RNCP :

- sortie `pnpm test` ;
- sortie `pnpm smoke` ;
- sortie `pnpm axe:smoke` ;
- capture GitHub Actions CI verte ;
- capture du workflow déploiement si disponible.

## Revue et recette

Avant intégration :

- vérifier que les critères d'acceptation sont couverts ;
- exécuter les checks pertinents ;
- relire les migrations si le schéma change ;
- vérifier les effets sur sécurité, données personnelles et accessibilité ;
- documenter les limites connues.

La recette formelle est détaillée dans [PV de recette et bon à intégrer](pv-recette-bon-integrer.md).

## Limites actuelles

- Le rapport de charge reste à produire.
- L'audit accessibilité manuel reste à produire.
- Les captures de CI et de smoke doivent être ajoutées au dossier final.
- La matrice de couverture de tests par compétence RNCP reste à consolider.
