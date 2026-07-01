# Annexes RNCP

Statut : index initial.

Ce document liste les annexes à collecter pour le dossier final. Les fichiers lourds ou captures peuvent être stockés hors dépôt si nécessaire ; ce fichier sert alors d'index.

## A1 - Preuves projet et cadrage

- [Cahier des charges](cahier-des-charges.md).
- [Spécifications fonctionnelles](specifications-fonctionnelles.md).
- [Scope v1](../prd/v1-scope.md).
- [PRD v1](../prd/v1-prd.md).
- [Matrice de conformite UF DEV B3](uf-dev-b3-conformite.md).
- Captures du projet GitHub Tasks.
- Liste des issues représentatives.

## A2 - Preuves architecture et conception

- Schéma architecture web/API/DB/blob/email.
- [Architecture technique fil rouge](architecture-technique-fil-rouge.md).
- Schéma des packages du monorepo.
- Extrait du schéma de base de données.
- ADR principaux : [identités supprimées](../adr/0001-release-deleted-usernames-after-30-days.md), [médias publics sans scan automatique](../adr/0002-launch-public-media-without-automated-scanning.md), [application de documentation](../adr/0003-custom-developer-documentation-app.md).
- [Documentation de déploiement Azure](../deployment/azure.md).

## A3 - Preuves qualité

- Sortie `pnpm typecheck`.
- Sortie `pnpm lint`.
- Sortie `pnpm test`.
- Sortie `pnpm build`.
- Sortie `pnpm db:check`.
- Sortie `pnpm docs:validate`.
- Capture CI GitHub Actions verte.

## A4 - Preuves E2E et accessibilité

- Sortie `pnpm smoke`.
- Sortie `pnpm axe:smoke`.
- [Preuves de demo locale](preuves-demo-locale.md).
- [Preuves responsive web](preuves-responsive.md).
- [Audit accessibilite et performance](audit-accessibilite-performance.md).
- Capture Playwright report si utile.
- Grille d'audit clavier/focus/contraste.
- Capture pages critiques.

## A5 - Preuves DevOps

- Workflow CI.
- Workflow deploy staging/production.
- Workflow de nettoyage média.
- [Checklist bon à intégrer](pv-recette-bon-integrer.md).
- [PV de recette](pv-recette-bon-integrer.md).
- Plan de rollback.
- [Journal de bord](journal-de-bord.md).

## A6 - Preuves échanges de données

- [Tables de correspondance données](bc04-echanges-donnees.md).
- Schéma flux média.
- Schéma flux feed/notifications/modération.
- Migrations Drizzle.
- Seed catalogue jeux.
- Logs `smoke:setup`.
- Description environnement multi-tiers.
- [Statut mobile Flutter](mobile-flutter-statut.md), tant que #157/#158 restent bloques.

## A7 - Preuves développement

- Extraits courts de code source commenté.
- Fiche technique cycle de vie média.
- Fiche technique modération.
- Fiche technique feed/visibility/search.
- Fiche technique suppression de compte.
- Exemple de correction de bug ou refactor sans régression.

## Règle d'utilisation

Chaque annexe doit être référencée depuis la [matrice de preuves](matrice-preuves.md). Une annexe non reliée à une compétence ne doit pas encombrer le dossier final.
