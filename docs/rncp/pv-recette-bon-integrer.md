# PV de recette et bon à intégrer

Statut : modèle initial.

## PV de recette

Projet : MyTuums v1.

Date : à renseigner.

Recette réalisée par : à renseigner.

Environnement : local / staging.

## Parcours de recette

| Parcours | Critère d'acceptation | Preuve | Statut |
| --- | --- | --- | --- |
| Inscription | Un utilisateur peut créer un compte avec email/mot de passe | Smoke Mailpit, tests register | À valider |
| Vérification email | L'utilisateur vérifie son email avant onboarding | Smoke, tests verify route | À valider |
| Onboarding | Username unique et profil créé | Tests onboarding | À valider |
| Création post texte | Post visible dans feed/detail | Smoke post text | À valider |
| Création post image | Upload Azurite et post visible | Smoke média | À valider |
| Feed | For You/Following respectent les règles | Tests feed/visibility | À valider |
| Search | Recherche users/games opérationnelle | Tests search | À valider |
| Commentaire | Commentaire créé, liste et compte à jour | Tests comment service | À valider |
| Like/follow | Actions sociales et compteurs cohérents | Tests engagement | À valider |
| Notification | Notification créée et lisible | Tests notification | À valider |
| Signalement | Report créé et rattaché à une cible | Tests modération | À valider |
| Modération | Staff action auditée et visibilité appliquée | Tests modération | À valider |
| Contact | Formulaire public et email/log | Tests contact | À valider |
| Pages statiques | Terms/privacy/support/accessibility accessibles | Tests static pages | À valider |
| Accessibilité auto | Axe smoke sans violation bloquante | `pnpm axe:smoke` | À valider |
| Demo locale fil rouge | Infra, migrations, seed et smoke reproductibles | [Preuves de demo locale](preuves-demo-locale.md) | Bloque Docker local |

## Décision de recette

Décision : Go / No-Go / Go sous réserves.

Réserves :

- À renseigner.

Signature ou validation :

- Product Owner / responsable projet : à renseigner.
- Candidat : à renseigner.

## Bon à intégrer

Checklist avant intégration :

| Contrôle | Attendu | Statut |
| --- | --- | --- |
| CI | typecheck, lint, tests, build OK | À valider |
| DB | migrations vérifiées | À valider |
| Smoke | parcours critique OK | À valider |
| Axe | smoke accessibilité OK | À valider |
| Variables | env staging/prod présentes | À valider |
| Secrets | aucun secret commit | À valider |
| Storage | Azure Blob/Azurite configuré selon env | À valider |
| Email | Resend/Mailpit configuré selon env | À valider |
| Monitoring | Sentry/logs actifs | À valider |
| Rollback | stratégie connue | À valider |
| Support/legal | launch gates connus | À valider |

Décision d'intégration : Go / No-Go / Go sous réserves.

Responsable exploitation : à renseigner.
