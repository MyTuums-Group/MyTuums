# Spécifications fonctionnelles RNCP

Statut : socle initial.

## Objectif

Relier les besoins utilisateur aux fonctions MyTuums v1 et fournir une liste de contrôle des attendus fonctionnels pour la recette et le dossier RNCP.

## Acteurs

- Visiteur non connecté.
- Utilisateur inscrit et vérifié.
- Utilisateur onboardé.
- Modérateur.
- Administrateur.
- Owner.
- Opérateur technique.

## Liste de contrôle fonctionnelle

| Domaine | Attendu | Acteur | Critère de validation | Statut preuve |
| --- | --- | --- | --- | --- |
| Authentification | Inscription email/mot de passe | Visiteur | Compte créé, email envoyé | Tests register + smoke |
| Authentification | Vérification email | Utilisateur | Accès onboarding après vérification | Tests verify + Mailpit |
| Authentification | Mot de passe oublié/reset | Utilisateur | Reset possible par email | Tests/routes auth |
| Onboarding | Choix username unique | Utilisateur vérifié | Username réservé et profil créé | Tests onboarding |
| Onboarding | Favorite games optionnels | Utilisateur vérifié | Jusqu'à 5 jeux sélectionnés | Tests settings/game |
| Profil | Profil public par username | Utilisateur/visiteur | Route `/@{username}` consultable selon visibilité | Tests profile |
| Profil | Avatar/banner/bio/display name | Utilisateur | Mise à jour settings | Tests settings |
| Posts | Création post texte | Utilisateur | Post visible dans feed/detail | Tests post + smoke |
| Posts | Post avec média | Utilisateur | Média prêt puis attaché | Tests média + smoke Azurite |
| Posts | Suppression post | Auteur | Post masqué des vues normales | Tests post/account deletion |
| Feed | For You | Utilisateur | Règles favorite games/global fallback | Tests feed |
| Feed | Following | Utilisateur | Posts des suivis | Tests feed/follow |
| Discover | Recherche users/games | Utilisateur | Résultats filtrables et ouvrables | Tests search |
| Jeux | Page jeu | Utilisateur/visiteur limité | Posts tagués affichés | Tests game/feed |
| Commentaires | Création et liste | Utilisateur | Commentaire visible et compte mis à jour | Tests comment |
| Likes | Like/unlike post/comment | Utilisateur | Compteur cohérent, self-notification évitée | Tests engagement |
| Follows | Follow/unfollow | Utilisateur | Relation et feed following cohérents | Tests engagement/feed |
| Blocks | Blocage utilisateur | Utilisateur | Interactions et visibilité filtrées | Tests authorization/feed |
| Notifications | Liste et badge | Utilisateur | Événements in-app créés/masqués selon règles | Tests notification |
| Signalements | Report post/comment/profile | Utilisateur | Report rattaché à une case | Tests modération |
| Modération | Remove/restore/suspend | Staff | Action auditée, visibilité appliquée | Tests modération/staff |
| Contact | Formulaire public | Visiteur/utilisateur | Email/log créé avec rate limit | Tests contact |
| Pages statiques | Legal/support/about/accessibility | Tous | Pages accessibles | Tests static pages |
| Docs app | Lecture docs protégée | Admin/owner | Accès refusé aux autres rôles | Tests docs access |

## Règles transverses

- Les routes applicatives sensibles exigent une session valide.
- Les utilisateurs non vérifiés ne peuvent pas réserver de username.
- Les utilisateurs suspendus n'accèdent qu'aux surfaces autorisées.
- Les contenus supprimés ou retirés sont cachés des vues normales.
- Les contenus bloqués sont filtrés autant que possible.
- Les validations API sont canoniques.
- Les limites de taille et format média sont appliquées côté API.
- Les pages legal/support restent accessibles hors connexion.

## Références

- [Scope auth/identity](../prd/v1-scope/auth-and-identity.md)
- [Scope posting/media](../prd/v1-scope/posting-and-media.md)
- [Scope feeds/games/search](../prd/v1-scope/feeds-games-and-search.md)
- [Scope social/notifications](../prd/v1-scope/social-and-notifications.md)
- [Scope modération/support/opérations](../prd/v1-scope/moderation-support-and-operations.md)
- [PV de recette](pv-recette-bon-integrer.md)
