# BC04 - Échanges de données informatisées

Statut : socle initial.

## Objectif

Rendre explicites les flux de données MyTuums : formulaires web, API tRPC/REST, validation, base PostgreSQL, stockage Azure Blob, emails, logs, notifications, migrations et environnement de test multi-tiers.

## Rétro-documentation technique

MyTuums utilise une architecture web/API/DB :

- `apps/web` produit les interfaces utilisateur et appelle l'API.
- `apps/api` expose tRPC, auth, health checks et endpoints étroits pour les flux navigateur/blob/provider.
- `packages/db` contient schéma Drizzle, migrations et client.
- `packages/types` contient des value objects et constantes partagées.
- Azure Blob stocke les médias utilisateur en production.
- Azurite simule le stockage blob en local.
- Mailpit simule l'email local.

## Table de correspondance - Onboarding profil

| Étape | Donnée | Validation | Destination | Preuve |
| --- | --- | --- | --- | --- |
| Formulaire web | username | format, longueur, reserved names | profile.username | Tests onboarding/username |
| Formulaire web | display name | optionnel, limite longueur | profile.displayName | Settings/profile services |
| Formulaire web | bio | optionnel, limite longueur | profile.bio | Profile policy |
| Formulaire web | favorite games | max 5, jeux actifs | favorite_games | Game service |
| API | session user | email vérifié, compte actif | user/profile relation | App user state |

## Table de correspondance - Publication post

| Étape | Donnée | Validation | Destination | Preuve |
| --- | --- | --- | --- | --- |
| Composer web | body | non vide, max 500 graphèmes | posts.body | PostBody value object |
| Composer web | game tag | jeu seed actif | posts.gameId | Game adapter/service |
| Composer web | mediaId | media ready, owner, purpose | posts.mediaId / media target | Media service |
| API post service | publicId | opaque, serveur | posts.publicId | Post service |
| API post service | counts | dénormalisés | posts.likeCount/commentCount | Engagement/comment services |

## Table de correspondance - Upload média

| Étape | Donnée | Système | Contrôle |
| --- | --- | --- | --- |
| Create upload | purpose, MIME, size | API media service | type, taille, owner |
| Pending record | blob key, status pending | PostgreSQL | key opaque, expiry |
| Signed upload URL | write scoped URL | Azure Blob/Azurite | durée limitée, path serveur |
| Confirm upload | actual size/type | API media service | blob exists, metadata match |
| Ready media | status ready | PostgreSQL | attachable by owner only |
| Attach media | target post/avatar/banner | PostgreSQL | single-owner, single-purpose |
| Lecture média | signed read URL | Azure Blob | visibility parent content |
| Cleanup | expired/abandoned/deleted | maintenance command | idempotent cleanup |

## Consolidation et agrégation

| Donnée consolidée | Source | Destination | Règle |
| --- | --- | --- | --- |
| Feed For You | posts, favorite games, follows | page feed | chronologique, cursor, visibility |
| Following feed | follows, posts | page feed | posts des suivis uniquement |
| Post counts | likes, comments | posts denormalized counts | transactionnel |
| Notification list | follow/like/comment/moderation events | notifications | event records immutables |
| Moderation case | reports | moderation cases | groupement par cible |
| Unread count | notifications | badge UI | cache/lecture dynamique |

## Interfaces et flux

- tRPC pour les opérations applicatives.
- BetterAuth pour les routes auth.
- REST étroit pour les besoins navigateur/blob/provider.
- Azure Blob signed URLs pour upload/read média.
- Resend/Mailpit pour emails transactionnels/contact.
- PostgreSQL pour persistance métier, audit, rate limits et notifications.
- Logs JSON stdout/stderr pour exploitation.

## Environnement de test multi-tiers

En local :

- web Vite ;
- API Fastify ;
- PostgreSQL Docker Compose ;
- Azurite ;
- Mailpit ;
- Playwright ;
- Vitest.

Commandes de preuve :

- `pnpm infra`
- `pnpm smoke:setup`
- `pnpm smoke`
- `pnpm axe:smoke`
- `pnpm infra:down`

## Preuves à ajouter au dossier final

- Schéma visuel web/API/DB/blob/email.
- Capture des migrations Drizzle.
- Log `pnpm smoke:setup`.
- Log `pnpm smoke`.
- Extrait schéma DB simplifié.
- Exemple de table de correspondance finalisée avec champs exacts.
- Export ou seed du catalogue de jeux.
