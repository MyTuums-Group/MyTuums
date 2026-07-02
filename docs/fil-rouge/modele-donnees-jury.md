# Modele de donnees jury

Statut : preuve prete pour revue, issue #154.

## Objectif

Donner au jury une vue simplifiee du modele PostgreSQL MyTuums sans l'obliger a lire tout le fichier `packages/db/src/schema.ts`.

Le schema complet reste la source technique. Ce document selectionne les entites utiles pour comprendre les parcours : compte, profil, publication, media, social, recherche, moderation, notifications, support, rate limits et suppression de compte.

## Principes de modelisation

| Principe | Application dans MyTuums |
| --- | --- |
| Separation identite / profil | `user` porte auth, email, role et statut compte ; `profile` porte username, display name, bio, avatar, banner et compteurs publics. |
| IDs internes et publics | Les tables metier utilisent des UUID ; les posts exposent un `public_id` opaque pour les routes client. |
| Donnees critiques normalisees | Likes, follows, blocks, reports et favoris sont des lignes dediees avec contraintes d'unicite. |
| Compteurs denormalises controles | `post.like_count`, `post.comment_count`, `profile.follower_count` et `profile.following_count` sont mis a jour transactionnellement. |
| Suppression non brutale | Posts/commentaires peuvent etre supprimes ou retires par moderation ; les comptes supprimes gardent des holds temporaires email/username. |
| Recherche performante | Index trigram/unaccent sur usernames, display names, noms de jeux et alias. |
| Audit et exploitation | Moderation, role changes, notifications, contacts et rate limits sont persistants en DB. |

## Schema relationnel simplifie

```text
user
 |-- 1 profile
 |-- n session / account / verification
 |-- n media
 |-- n post
 |-- n comment
 |-- n notification (recipient / actor)
 |-- n report
 |-- n rate_limit events by key
 |
 +-- follow -- user
 +-- block  -- user

profile
 |-- avatar_media_id -> media
 |-- banner_media_id -> media
 |-- favorite_game -- game

post
 |-- author_id -> user
 |-- game_tag_id -> game
 |-- media_attachment_id -> media
 |-- n comment
 |-- n post_like
 |-- n report
 |-- n moderation_case

comment
 |-- post_id -> post
 |-- author_id -> user
 |-- n comment_like
 |-- n report
 |-- n moderation_case

media
 |-- owner_id -> user
 |-- attached target -> post or profile

moderation_case
 |-- n report
 |-- n moderation_action
```

## Entites principales

| Groupe | Tables | Role lisible jury |
| --- | --- | --- |
| Auth et compte | `user`, `session`, `account`, `verification` | Connexion, email/password, sessions, verification email, role et etat du compte. |
| Profil | `profile`, `user_preference`, `account_deletion_hold` | Identite publique, preferences, avatar/banner, retention temporaire email/username apres suppression. |
| Catalogue jeux | `game`, `favorite_game` | Jeux seeds, pages jeu, recherche jeu, favoris utilisateur pour personnalisation. |
| Publication | `post`, `comment` | Contenu social principal, commentaires, timestamps, suppression utilisateur et retrait moderation. |
| Media | `media`, `profile_media_replacement` | Uploads, statut de traitement, attachement a post/profil, remplacement avatar/banner. |
| Engagement | `post_like`, `comment_like`, `follow`, `block` | Likes, follows et blocks comme relations uniques entre utilisateurs/contenus. |
| Notifications | `notification` | Evenements immuables : follow, likes, commentaire, contenu retire. |
| Moderation | `report`, `moderation_case`, `moderation_action`, `role_change_audit` | Signalements, dossiers staff, actions prises et audit role/staff. |
| Exploitation | `rate_limit`, `contact_submission` | Anti-abus route par route et demandes support/contact. |

## Lecture par parcours metier

### Inscription et onboarding

| Etape | Donnees ecrites | Controle |
| --- | --- | --- |
| Creation compte | `user`, `account`, `verification` | Email unique, mot de passe BetterAuth, verification email. |
| Onboarding profil | `profile` | Username unique, noms reserves interdits, limites display/bio. |
| Favoris jeux | `favorite_game` | Jeu actif, limite de favoris, ordre stable. |

### Publication d'un post

| Etape | Donnees ecrites | Controle |
| --- | --- | --- |
| Texte | `post.text` | Non vide, limite de caracteres visibles, liens auto seulement `http/https`. |
| Jeu tague | `post.game_tag_id` | Jeu seed actif, relation optionnelle. |
| Media | `post.media_attachment_id`, `media.attached_*` | Media ready, meme proprietaire, but compatible, un media par post en v1. |
| Compteurs | `post.like_count`, `post.comment_count` | Denormalisation mise a jour par likes/commentaires. |

### Upload media

| Etape | Table/champ | Controle |
| --- | --- | --- |
| Intention upload | `media.status = pending` | Proprietaire, MIME, taille, purpose. |
| Stockage blob | `media.blob_key`, `media.storage_container` | Cle serveur, conteneur prive, URL signee limitee. |
| Confirmation | `media.status = ready`, `confirmed_at` | Blob existe, taille et type correspondent. |
| Attachement | `attached_target_type`, `attached_target_id`, `attached_slot` | Target post/profil, unicite par slot. |
| Nettoyage | `expires_at`, status `deleted`/`failed` | Cleanup idempotent pour pending/abandon/deleted. |

### Social et visibilite

| Action | Table | Controle |
| --- | --- | --- |
| Liker un post | `post_like` | Unique `(user_id, post_id)`, compteur post transactionnel. |
| Liker un commentaire | `comment_like` | Unique `(user_id, comment_id)`, compteur commentaire transactionnel. |
| Suivre | `follow` | Unique `(follower_id, followed_id)`, compteurs profil transactionnels. |
| Bloquer | `block` | Unique `(blocker_id, blocked_id)`, masque profils/posts/feeds et retire les follows. |

### Moderation

| Objet | Table | Role |
| --- | --- | --- |
| Signalement | `report` | Recoit cible, raison catalogue et note utilisateur. |
| Dossier | `moderation_case` | Regroupe les signalements par cible, statut et priorite. |
| Decision staff | `moderation_action` | Retrait/restauration/suspension avec notes internes et raison publique. |
| Audit role | `role_change_audit` | Garde trace des changements de role admin/moderateur. |

## Contraintes et index importants

| Besoin | Mecanisme DB |
| --- | --- |
| Email unique | Index unique `user_email_unique`. |
| Username unique | Index unique `profile_username_unique`. |
| Slug jeu unique | Index unique `game_slug_unique`. |
| Route post stable | Index unique `post_public_id_unique`. |
| Une relation like/follow/block par paire | Index uniques `post_like_unique`, `comment_like_unique`, `follow_unique`, `block_unique`. |
| Recherche accent/casse insensitive | Index GIN trigram/unaccent sur `game`, `profile.username`, `profile.display_name`. |
| Pagination feed | Index `post_created_at_idx` et `post_game_tag_id_idx`. |
| Media post unique | Index partiel `media_post_attachment_target_unique`. |
| Notifications dedoublonnees | Index uniques conditionnels par type de notification. |
| Rate limits persistants | Cle primaire `rate_limit.key`. |

## Ce que le modele ne contient pas en v1

Ces absences sont volontaires pour garder un MVP defendable :

- messagerie privee ;
- streaming ou live ;
- bookmarks ;
- hashtags/mentions ;
- catalogue complet de jeux utilisateur ;
- evenements de recommandation complexes ;
- service video separe.

## Preuves associees

| Preuve | Usage |
| --- | --- |
| [Architecture technique jury](architecture-technique-jury.md) | Montre ou la base s'insere dans l'architecture globale. |
| [BC04 - Echanges de donnees](../rncp/bc04-echanges-donnees.md) | Relie formulaires, API, DB, blob et emails aux flux de donnees. |
| [Core data entities](../prd/v1-scope/data-entities.md) | Donne le perimetre attendu des entites v1. |
| [Preuve smoke local #152](preuve-smoke-local-152.md) | Prouve migrations, seeds et parcours DB/API/web en local. |
