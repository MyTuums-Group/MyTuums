# BC02 - Pilotage DevOps

Statut : socle initial.

## Objectif

Démontrer que le projet MyTuums n'est pas seulement développé, mais piloté : backlog, branches, CI, recette, intégration, déploiement, maintenance et amélioration continue.

## Workflow projet

Workflow cible à présenter au jury :

1. Besoin ou risque identifié.
2. Formalisation dans une issue GitHub.
3. Priorisation dans le projet Tasks.
4. Passage en `Ready`, puis `In progress`.
5. Branche de travail.
6. Implémentation et tests locaux.
7. Commit explicite.
8. Push et PR.
9. CI GitHub Actions.
10. Revue et merge.
11. Déploiement staging.
12. Smoke et vérification.
13. Promotion production avec approbation manuelle.

## Procédures existantes

| Procédure | Preuve |
| --- | --- |
| Développement local | [README](https://github.com/MyTuums-Group/MyTuums/blob/main/README.md), `pnpm dev`, `pnpm infra` |
| Qualité continue | [CI](https://github.com/MyTuums-Group/MyTuums/blob/main/.github/workflows/ci.yml) |
| Déploiement | [Deploy workflow](https://github.com/MyTuums-Group/MyTuums/blob/main/.github/workflows/deploy.yml), [Azure deployment](../deployment/azure.md) |
| Maintenance planifiée | [Workflow de nettoyage média](https://github.com/MyTuums-Group/MyTuums/blob/main/.github/workflows/media-cleanup.yml) |
| Documentation projet | [Context map](../../CONTEXT-MAP.md), [docs manifest](https://github.com/MyTuums-Group/MyTuums/blob/main/docs/docs-manifest.json) |
| Workflow agents/issues | [AGENTS](../../AGENTS.md), [Issue tracker](../agents/issue-tracker.md) |

## Réingénierie de processus proposée

Exemple à exploiter dans le dossier RNCP :

- Avant : le scope v1 et le contexte étaient volumineux et concentraient trop d'informations dans peu de fichiers.
- Problème : lecture difficile, duplication, risque de divergence documentaire.
- Action : transformation de [CONTEXT.md](../../CONTEXT.md) en redirect, [CONTEXT-MAP.md](../../CONTEXT-MAP.md) en point d'entrée, et split du scope v1 en fichiers par domaine.
- Gain : meilleure navigation, meilleure maintenabilité documentaire, lecture ciblée par domaine, intégration au manifest docs.
- Preuve : commit `0057ade docs: split v1 scope`.

## Planning initial à produire

| Phase | Objectif | Prévu | Réel | Écart | Commentaire |
| --- | --- | --- | --- | --- | --- |
| Cadrage | PRD, scope, besoins | À renseigner | À renseigner | À renseigner | À relier aux PRD et issues |
| Architecture | Monorepo, DB, API, web | À renseigner | À renseigner | À renseigner | À relier aux commits initiaux |
| Features cœur | Auth, profils, posts, feed | À renseigner | À renseigner | À renseigner | À relier aux tests |
| Sécurité/modération | rôles, reports, suspensions | À renseigner | À renseigner | À renseigner | À relier aux services |
| DevOps | CI, deploy, smoke, Azure | À renseigner | À renseigner | À renseigner | À relier aux workflows |
| Dossier RNCP | preuves, annexes, oral | À renseigner | À renseigner | À renseigner | Travail en cours |

## Backlog et coordination

Preuves à collecter :

- capture du projet GitHub Tasks ;
- extrait des issues par statut ;
- issue PRD RNCP #141 ;
- exemples de PR mergées ;
- labels `ready-for-agent`, `priority:P*`, `documentation`, `bug`, `feature`.

## Recette

La recette doit couvrir :

- inscription, vérification email, onboarding ;
- création de post texte ;
- création de post avec image ;
- affichage feed/detail ;
- recherche utilisateur/jeu ;
- commentaire, like, follow ;
- signalement et modération ;
- pages statiques legal/support/accessibilité ;
- smoke deploy ou local stack.

Le PV est formalisé dans [PV de recette et bon à intégrer](pv-recette-bon-integrer.md).

## Bon à intégrer

La mise en exploitation doit vérifier :

- migrations appliquées ;
- variables d'environnement présentes ;
- secrets non committés ;
- CI verte ;
- smoke staging OK ;
- rollback connu ;
- monitoring Sentry/logs actif ;
- support/contact configuré ;
- legal launch gates connus.
