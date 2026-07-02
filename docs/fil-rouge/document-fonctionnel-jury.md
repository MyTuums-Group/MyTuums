# Document fonctionnel jury

Statut : version autonome prete pour revue pour issue #153.

## Sujet libre

MyTuums est le sujet libre choisi pour le projet fil rouge. Le projet remplace le contexte Smart Cafe par un produit numerique complet dans un domaine different : une plateforme sociale pour joueurs. Le choix reste conforme au PDF source des attendus car il mobilise les memes familles de competences : application web, backend structure et securise, base de donnees, mobile Android/iOS, documentation, Git, collaboration, gestion projet et oral.

## Besoin

Les joueurs partagent souvent leurs moments de jeu sur des plateformes generalistes ou tres orientees streaming. Ces espaces melangent messagerie, recommandation algorithmique, contenus longs, publicite et publics tres larges. MyTuums cible un besoin plus simple : publier et decouvrir rapidement des contenus courts lies aux jeux, suivre d'autres profils, reagir, commenter et signaler les abus dans un environnement clair.

Le produit v1 cherche donc a prouver un coeur fonctionnel robuste plutot qu'un reseau social complet. Les choix principaux sont :

- posts publics seulement ;
- flux chronologiques plutot que recommandation opaque ;
- catalogue de jeux seedes plutot que base ouverte ;
- moderation reactive et traces staff ;
- web prioritaire, mobile Flutter cible pour les parcours essentiels.

## Utilisateurs

| Acteur | Besoin principal | Parcours associe |
| --- | --- | --- |
| Visiteur | Comprendre le service et acceder aux pages publiques/legal/support | Pages statiques, previews publiques limitees. |
| Utilisateur inscrit | Publier, lire, chercher, commenter, liker, suivre, bloquer, signaler | Auth, onboarding, feed, discover, post detail, profile. |
| Moderateur | Examiner les signalements et appliquer des actions coherentes | Admin reports, moderation cases, audit. |
| Admin/owner | Gerer les comptes staff et surveiller l'etat du produit | Admin users, docs developpeur, launch readiness. |
| Jury | Comprendre le projet, les choix, les preuves et les limites sans explorer tout le depot | Ce dossier fil rouge, scripts oraux, demo. |

## Perimetre v1

MyTuums v1 couvre :

- inscription email/mot de passe, verification email et session ;
- onboarding avec username, profil et jeux favoris ;
- posts texte avec media image/video optionnel ;
- tags de jeux seedes ;
- flux For You, Following, profile, game et post detail ;
- recherche utilisateurs et jeux ;
- commentaires, likes, follows, blocks ;
- notifications in-app ;
- signalements et moderation staff ;
- pages legales, support, accessibilite et contact ;
- application mobile Flutter ciblant auth, onboarding et parcours sociaux principaux.

Les details canoniques restent dans [MyTuums v1 Scope](../prd/v1-scope.md).

## Parcours coeur pour le jury

1. L'utilisateur cree un compte et verifie son email.
2. Il choisit un username et complete son profil.
3. Il consulte un feed chronologique et cherche un jeu ou un profil.
4. Il cree un post texte ou media avec un jeu tague.
5. Un autre utilisateur commente, like ou suit le profil.
6. Un contenu problematique est signale.
7. Un staff examine le signalement et applique une action de moderation.
8. Le candidat montre les preuves : tests, CI, schema, issues, PR, logs et documentation.

## Choix UX

Le theme visuel suit [DESIGN](https://github.com/MyTuums-Group/MyTuums/blob/main/DESIGN.md). L'interface privilegie :

- navigation claire entre feed, discover, profile, notifications, settings et admin ;
- feedbacks explicites pour chargement, succes, erreur et acces refuse ;
- formulaires avec validations visibles ;
- composants coherents entre web, docs app et mobile ;
- lisibilite sur desktop et mobile web.

Les captures definitives desktop/tablette/mobile sont attendues dans #155.

## Limites assumees

MyTuums ne cherche pas a tout faire en v1. Sont volontairement hors perimetre :

- messagerie privee ;
- live streaming ;
- recommandations avancees ;
- hashtags, mentions, reposts, bookmarks ;
- OAuth, passkeys, 2FA ;
- analytics comportementales ;
- paiement, publicite, features premium ;
- parite mobile native complete.

Ces limites rendent la demo plus defendable : le projet prouve une architecture complete et maintenable sans diluer le temps dans des features non essentielles.

## Preuves liees

| Preuve | Ce qu'elle demontre | Statut |
| --- | --- | --- |
| [Matrice de conformite du projet fil rouge](matrice-conformite-projet-fil-rouge.md) | Correspondance directe avec le PDF source | Couvert |
| [MyTuums v1 Scope](../prd/v1-scope.md) | Perimetre produit complet | Couvert |
| [Architecture scope](../prd/v1-scope/architecture.md) | Structure web/API/DB/mobile | Couvert |
| [Runbook de demo](runbook-demo.md) | Parcours presentable et reprises | Partiel |
| [Scripts oraux](scripts-oraux.md) | Narration jury | Partiel |
| [Diaporama fil rouge](diaporama-fil-rouge.md) | Support de presentation | Partiel |
