# Preuves responsive web

Statut : protocole pret, captures bloquees par #152 tant que la stack locale
complete n'est pas lancee.

Ce document couvre l'issue #155 : demontrer que l'interface web MyTuums supporte
desktop, tablette et mobile sur les parcours principaux du fil rouge.

## Viewports a couvrir

| Support | Taille conseillee | Usage |
| --- | --- | --- |
| Desktop | 1440 x 900 | Demo principale jury |
| Tablette | 768 x 1024 | Navigation compacte et formulaires |
| Mobile | 390 x 844 | Flux smartphone courant |

## Parcours et captures attendues

| Parcours | Desktop | Tablette | Mobile | Notes |
| --- | --- | --- | --- | --- |
| Auth login/register | A prendre | A prendre | A prendre | Montrer labels, erreurs, CTA |
| Onboarding profil | A prendre | A prendre | A prendre | Username, display name, favoris |
| Feed | A prendre | A prendre | A prendre | Home feed et etats vides/charges |
| Creation post | A prendre | A prendre | A prendre | Texte + media si Azurite fonctionne |
| Search/discover | A prendre | A prendre | A prendre | Recherche jeux/utilisateurs |
| Profil public | A prendre | A prendre | A prendre | Header, posts, avatar/banner |
| Report/moderation | A prendre | A prendre | A prendre | Report sheet utilisateur ; admin si compte staff |

## Nommage conseille

Stocker les fichiers hors depot si volumineux, puis les indexer ici ou dans
[annexes.md](annexes.md).

```text
responsive-desktop-login.png
responsive-desktop-feed.png
responsive-desktop-composer.png
responsive-desktop-search.png
responsive-desktop-profile.png
responsive-desktop-report.png
responsive-tablet-feed.png
responsive-tablet-composer.png
responsive-mobile-feed.png
responsive-mobile-composer.png
responsive-mobile-report.png
```

## Defauts UX a relever

Pendant les captures, noter tout element qui :

- deborde de son conteneur ;
- masque un bouton ou un label ;
- devient inutilisable au clavier ;
- perd son focus visible ;
- tronque un message d'erreur important ;
- force un zoom ou un scroll horizontal sur mobile.

## Moments ou tes screenshots sont utiles

- Apres `pnpm smoke:setup` vert, quand les comptes smoke et les jeux seed sont
  disponibles.
- Pendant le parcours live : login, feed, composer, search, profil, report.
- Sur mobile : menu/navigation, sheet de recherche, composer et report sheet.
- Si un bug visuel apparait : capture avant correction puis capture apres
  correction pour montrer la non-regression.
