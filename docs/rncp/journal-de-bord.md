# Journal de bord RNCP

Statut : modèle initial à compléter avec les dates réelles, captures et liens de commits/PR.

## Objectif

Documenter le pilotage du projet : décisions, difficultés, arbitrages, écarts, disponibilité et résultats. Ce document soutient BC02 et BC03.

## Entrées de journal

| Date | Sujet | Contexte | Décision/action | Résultat | Preuve |
| --- | --- | --- | --- | --- | --- |
| À renseigner | Cadrage v1 | Besoin d'une plateforme sociale gaming focalisée | Formalisation PRD/scope | Périmètre v1 stabilisé | [Scope v1](../prd/v1-scope.md) |
| À renseigner | Architecture monorepo | Besoin de séparer web/API/packages | Turborepo + pnpm workspaces | Couches identifiables | [README](https://github.com/MyTuums-Group/MyTuums/blob/main/README.md), [scope architecture](../prd/v1-scope/architecture.md) |
| À renseigner | Persistance | Besoin schéma relationnel robuste | PostgreSQL + Drizzle + migrations | Schéma versionné | `packages/db/migrations` |
| À renseigner | Authentification | Besoin email/password et sessions | BetterAuth + cookies httpOnly | Auth intégrée | tests auth |
| À renseigner | Média | Besoin upload image/video sans proxy | signed URLs + blob privé | Flux média testable | services média |
| À renseigner | Modération | Besoin reports/cases/actions | module modération + audit | Staff workflow | tests moderation |
| À renseigner | CI/CD | Besoin intégration continue | GitHub Actions | contrôles automatiques | `.github/workflows/ci.yml` |
| 2026-06-25 | Nettoyage documentation | Duplication entre contexte, PRD et scope | Split du scope et redirect contexte | Documentation plus lisible | commit `0057ade` |
| À renseigner | RNCP preuves | Risque d'évaluation implicite | Création du [portefeuille RNCP](README.md) | Matrice et docs formels | issue #141 |

## Décisions structurantes

| Décision | Alternatives | Raison | Impact |
| --- | --- | --- | --- |
| Monorepo TypeScript | repos séparés | Typage partagé, CI commune, cohérence | Meilleure maintenabilité |
| tRPC | REST complet | Contrats typés et productivité | Couplage TS assumé |
| Drizzle/PostgreSQL | ORM plus abstrait | Schéma explicite, migrations | Preuves DB fortes |
| Blob privé + signed URL | public bucket | Contrôle visibilité | Sécurité média |
| Modération réactive | scan automatique | Scope v1 limité | Risque accepté documenté |
| Docs split | document monolithique | Lisibilité et maintenabilité | Meilleure preuve documentaire |

## Suivi disponibilité

| Période | Disponibilité prévue | Disponibilité réelle | Écart | Cause | Action |
| --- | --- | --- | --- | --- | --- |
| À renseigner | À renseigner | À renseigner | À renseigner | À renseigner | À renseigner |

## Points à compléter

- Ajouter dates exactes depuis l'historique Git.
- Ajouter liens de PR ou commits représentatifs.
- Ajouter captures du projet GitHub Tasks.
- Ajouter écarts planning prévisionnel/réel.
