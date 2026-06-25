# Cahier des charges RNCP - MyTuums

Statut : socle initial.

## Contexte

MyTuums est une plateforme web sociale pour joueurs. La v1 vise un produit volontairement focalisé : publier des posts courts liés au jeu vidéo, consulter des flux, suivre des profils, commenter, aimer, signaler et modérer les contenus.

Le projet sert de support au dossier RNCP 36463. Le cahier des charges ci-dessous formalise le besoin et les contraintes pour que le jury puisse comprendre le contexte sans parcourir tout le dépôt.

## Objectifs produit

- Permettre à un utilisateur de créer un compte avec email et mot de passe.
- Vérifier l'email avant l'entrée dans l'application.
- Créer un profil public orienté jeu vidéo.
- Publier un post texte avec média optionnel.
- Associer un post à un jeu du catalogue seed.
- Consulter les flux For You, Following, Discover, jeu et profil.
- Interagir par commentaires, likes, follows et blocks.
- Signaler des contenus et permettre une modération staff.
- Gérer les notifications in-app.
- Fournir des pages support, contact, legal et accessibilité.

## Contraintes fonctionnelles

- Les posts sont publics uniquement en v1.
- Les flux sont chronologiques et paginés par curseur.
- Les jeux viennent d'un catalogue seed versionné.
- Les commentaires sont plats, texte uniquement.
- Les médias utilisateur sont stockés en blob privé et servis via URL signée.
- Les rôles staff sont limités à `moderator`, `admin` et `owner`.
- La modération est réactive ; il n'y a pas de scan automatique des médias en v1.
- Les utilisateurs suspendus ont un accès restreint.
- La suppression de compte est irréversible.

## Contraintes techniques

- Monorepo Turborepo avec pnpm.
- Frontend React, Vite, TanStack Router, Tailwind CSS, ShadCN/Radix.
- API Fastify, tRPC et BetterAuth.
- Base PostgreSQL avec Drizzle ORM et migrations explicites.
- Stockage Azure Blob en production et Azurite en local.
- Email Resend en production et Mailpit en local.
- CI GitHub Actions avec typecheck, lint, tests, build, smoke et checks DB.
- Déploiement Azure Static Web Apps, Azure App Service, PostgreSQL Flexible Server et Blob Storage.

## Contraintes qualité et sécurité

- TypeScript strict.
- Validation API canonique.
- Sessions httpOnly côté API.
- Secrets hors dépôt.
- CORS credentialed limité aux origines configurées.
- Rate limits par route et niveau d'abus.
- Blobs média privés.
- Accès staff audité pour les actions de modération.
- Tests unitaires, intégration, smoke et axe.
- Accessibilité alignée avec une cible WCAG/RGAA raisonnable pour les flux critiques.

## Hors périmètre v1

- Messagerie privée.
- Live streaming.
- Recommandations personnalisées avancées.
- Applications mobiles natives.
- OAuth/social login.
- Passkeys et 2FA.
- Comptes privés.
- Edition des posts/commentaires.
- Analytics produit avancées.
- Paiement, publicité, monétisation.

## Critères d'acceptation globaux

- Un utilisateur peut s'inscrire, vérifier son email, finaliser l'onboarding et publier un post.
- Le feed affiche les posts selon les règles documentées.
- Les interactions sociales principales fonctionnent.
- Les signalements alimentent la modération.
- Les médias respectent les limites et la visibilité.
- Les commandes qualité passent localement et en CI.
- Le déploiement dispose d'une procédure explicite.
- Les preuves RNCP permettent de relier les choix techniques aux blocs de compétences.

## Références

- [Scope v1](../prd/v1-scope.md)
- [PRD v1](../prd/v1-prd.md)
- [Architecture](../prd/v1-scope/architecture.md)
- [Routes](../prd/v1-scope/routes.md)
- [Plan d'assurance qualité RNCP](plan-assurance-qualite.md)
