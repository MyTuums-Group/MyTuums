# Architecture technique jury

Statut : preuve prete pour revue, issue #154.

## Objectif

Expliquer l'architecture technique MyTuums pour le projet fil rouge UF DEV B3 : applications web et mobile, API, base PostgreSQL, stockage blob, email, documentation, CI et controles de securite.

Ce document complete les sources techniques detaillees :

- [V1 Architecture Scope](../prd/v1-scope/architecture.md)
- [Azure Deployment](../deployment/azure.md)
- [BC04 - Echanges de donnees](../rncp/bc04-echanges-donnees.md)
- [ADR mobile REST facade](../adr/0004-mobile-rest-facade-before-orpc.md)

## Schema d'ensemble

```text
                    GitHub PR / CI
                         |
          typecheck, lint, tests, build, docs, smoke, axe
                         |
                         v
+----------------+   HTTPS/tRPC    +-------------------------+
| Web React/Vite | ---------------> | API Fastify TypeScript |
| apps/web       |                  | apps/api               |
+----------------+                  +-----------+-------------+
                                                |
+----------------------+   HTTPS/REST           |
| Flutter Android/iOS  | -----------------------+
| apps/mobile          | /api/mobile/v1
+----------------------+
                                                |
             +----------------------------------+----------------------------------+
             |                                  |                                  |
             v                                  v                                  v
+--------------------------+      +-----------------------------+      +---------------------+
| PostgreSQL + Drizzle     |      | Azure Blob / Azurite        |      | Resend / Mailpit    |
| auth, profils, posts,    |      | medias utilisateurs,        |      | emails transaction. |
| moderation, rate limits  |      | couvertures de jeux         |      | support local/prod  |
+--------------------------+      +-----------------------------+      +---------------------+
             |
             v
+--------------------------+
| Sentry + logs JSON       |
| erreurs et exploitation  |
+--------------------------+

+--------------------------+
| Docs app                 |
| docs/docs-manifest.json  |
| Markdown versionne       |
+--------------------------+
```

## Composants

| Composant | Technologie | Role dans le projet | Preuve principale |
| --- | --- | --- | --- |
| Web | React, Vite, TanStack Router, Tailwind, ShadCN | Interface principale responsive, parcours utilisateurs, moderation et support | `apps/web`, [DESIGN](https://github.com/MyTuums-Group/MyTuums/blob/main/DESIGN.md) |
| API | Fastify, tRPC, BetterAuth, services TypeScript | Point d'entree applicatif, auth, validation, autorisation, orchestration metier | `apps/api/src/app-router.ts`, `apps/api/src/trpc.ts` |
| Mobile | Flutter Android/iOS | MVP mobile cible : auth, onboarding, feed, discover, composer, post detail, like, report, logout | [ADR 0004](../adr/0004-mobile-rest-facade-before-orpc.md), `apps/mobile/README.md` |
| Base | PostgreSQL, Drizzle | Persistance relationnelle, contraintes, index, migrations, rate limits et audit | [Modele de donnees jury](modele-donnees-jury.md), `packages/db/src/schema.ts` |
| Stockage | Azure Blob en production, Azurite en local | Medias utilisateurs et couvertures de jeux, via URLs signees | `apps/api/src/services/media/**` |
| Email | Resend en production, Mailpit en local | Verification email, reset password, support/contact | `apps/api/src/email.ts`, [preuve smoke #152](preuve-smoke-local-152.md) |
| Docs | App docs separee + manifest JSON | Documentation versionnee, indexee et validee en CI | `docs/docs-manifest.json` |
| CI/CD | GitHub Actions, pnpm, Turborepo | Controle qualite avant merge et deploiement staging/production | [Azure Deployment](../deployment/azure.md) |

## Decoupage applicatif

Le monorepo separe les responsabilites plutot que de melanger toute la logique dans une seule application :

| Zone | Responsabilite | Regle de conception |
| --- | --- | --- |
| `apps/web` | UI web, routes, formulaires, affichage des etats | Compose les surfaces produit, appelle l'API, ne possede pas la logique metier profonde. |
| `apps/api/src/routers` | Contrat HTTP/tRPC et validation d'entree | Reste mince : transforme les entrees et appelle les services. |
| `apps/api/src/services` | Regles metier, politiques, orchestration | Porte les invariants : posts, media, moderation, recherche, notifications, comptes. |
| `apps/api/src/authorization` | Visibilite et permissions centralisees | Evite les checks eparpilles pour blocks, roles, contenu supprime ou retire. |
| `packages/db` | Schema Drizzle, migrations, client DB | Source technique du modele relationnel. |
| `packages/types` | Types et value objects partages | Partage les constantes stables sans transporter de logique API ou UI. |
| `apps/mobile` | Client Flutter Android/iOS | Consomme une facade REST versionnee au lieu de tRPC direct. |

## Flux principaux

### Authentification et session

1. Le web utilise les routes BetterAuth exposees par l'API.
2. La session est resolue dans le contexte API.
3. Les procedures protegees passent par `protectedProcedure`.
4. L'etat compte (`active`, `suspended`, `account_deleted`) filtre les actions autorisees.
5. Les emails de verification ou reset sont envoyes via Resend en production et Mailpit en local.

### Publication avec media

1. L'utilisateur cree une intention d'upload via `media.createUpload`.
2. L'API valide le type, la taille, le but et le droit d'uploader.
3. Une ligne `media` est creee en `pending`.
4. Le navigateur envoie directement le fichier vers Azure Blob/Azurite avec une URL signee.
5. L'API confirme l'existence du blob et passe le media en `ready`.
6. La creation de post attache le media autorise au post en respectant le proprietaire et le but.

### Feed, recherche et visibilite

1. Le web ou le mobile demande un feed, une recherche ou une page profil.
2. L'API construit un `ViewerContext` avec role, statut et relations de block.
3. Les services de feed/recherche appliquent pagination, filtres et regles de visibilite.
4. Les contenus supprimes, retires par moderation ou caches par block sont exclus des vues normales.

### Signalement et moderation

1. Un utilisateur signale un post, commentaire ou profil.
2. L'API valide la cible, la raison et le texte libre.
3. Les signalements alimentent les dossiers de moderation.
4. Les actions staff peuvent retirer/restaurer du contenu ou suspendre un compte.
5. Les actions sensibles ecrivent des traces d'audit et, si necessaire, creent des notifications.

## Environnements

| Environnement | Web | API | DB | Blob | Email | Usage |
| --- | --- | --- | --- | --- | --- | --- |
| Local | Vite | Fastify local | PostgreSQL Docker | Azurite | Mailpit | Developpement, smoke #152, demo locale. |
| Staging | Azure Static Web Apps | Azure App Service | Azure PostgreSQL | Azure Blob | Resend | Validation automatique apres merge `main`. |
| Production | Azure Static Web Apps | Azure App Service | Azure PostgreSQL | Azure Blob | Resend | Mise en ligne apres approbation manuelle. |

## Controles de securite relies au code

| Risque | Controle concret | Emplacement de preuve |
| --- | --- | --- |
| Acces non authentifie aux actions privees | `protectedProcedure` exige session et etat compte compatible | `apps/api/src/trpc.ts` |
| Droits staff trop larges | Roles `owner`, `admin`, `moderator`, `user` et politiques staff | `packages/types/src/staff-account-policy.ts`, `apps/api/src/routers/staff.ts` |
| Contenu visible malgre block/suppression/moderation | Module d'autorisation et politiques de visibilite centralisees | `apps/api/src/authorization/**`, `apps/api/src/services/visibility/**` |
| Entrees invalides | Schemas Zod dans les routers et value objects partages | `apps/api/src/app-router.ts`, `apps/api/src/transport/value-object-schemas.ts` |
| Abus login, recherche, upload, contact | Rate limits Postgres/user/IP selon route | `apps/api/src/services/rate-limit/**`, `apps/api/src/auth/rate-limit.ts` |
| Upload fichier non controle | MIME, taille, proprietaire, but, statut et confirmation blob | `apps/api/src/routers/media.ts`, `apps/api/src/services/media/**` |
| Exposition directe de medias prives | Lecture via URLs signees apres controle de visibilite | `apps/api/src/services/media/**` |
| Origins web non maitrisees | CORS limite aux origins configurees | `apps/api/src/cors-origins.ts` |
| Secrets commites | Variables d'environnement validees, `.env` ignore, secrets Azure/GitHub | `packages/config/src/index.ts`, [Azure Deployment](../deployment/azure.md) |
| Mise en prod avec fonctionnalites non pretes | Gates `PUBLIC_SIGNUP_ENABLED` et `MEDIA_UPLOADS_ENABLED` | `packages/config/src/index.ts`, `apps/api/src/services/launch-readiness/**` |
| Perte de preuve moderation | Tables `moderation_case`, `report`, `moderation_action`, `role_change_audit` | [Modele de donnees jury](modele-donnees-jury.md) |

## Correspondance avec les attendus fil rouge

| Attendu UF DEV B3 | Reponse MyTuums |
| --- | --- |
| Documentation technique | Ce document presente l'architecture, les composants, les environnements et les flux. |
| Application web moderne | Web React/Vite/TanStack Router avec design system ShadCN. |
| Backend structure | API Fastify/tRPC avec routers minces, services metier et adapters DB/storage/email. |
| Base de donnees relationnelle | PostgreSQL + Drizzle, schema versionne, migrations, contraintes et index. |
| Securite | Auth, roles, sessions, rate limits, CORS, validation, blobs prives, moderation et gates de lancement. |
| Mobile Android/iOS | Flutter MVP via REST `/api/mobile/v1`, sans chercher la parite totale avec le web. |
| Environnement local reproductible | Docker Compose infra, migrations/seeds, smoke Playwright, Mailpit et Azurite prouves dans #152. |

## Preuves associees

| Preuve | Usage |
| --- | --- |
| [Preuve smoke local #152](preuve-smoke-local-152.md) | Demontre que web, API, DB, blob local et email local fonctionnent ensemble. |
| [Modele de donnees jury](modele-donnees-jury.md) | Rend le schema PostgreSQL lisible sans parcourir tout `schema.ts`. |
| [Matrice fil rouge](matrice-conformite-projet-fil-rouge.md) | Relie cette architecture aux exigences du PDF. |
| [Runbook de demo](runbook-demo.md) | Indique comment presenter ces composants pendant l'oral. |
