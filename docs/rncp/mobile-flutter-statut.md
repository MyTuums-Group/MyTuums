# Statut mobile Flutter

Statut : bloque au 2026-07-01.

Ce document couvre les issues #157 et #158. Elles demandent un MVP Flutter
fonctionnel et des preuves mobile Android/iOS. Le depot MyTuums actuel ne
contient aucun projet Flutter, Android ou iOS, et le scope v1 indique que les
applications natives mobiles sont differees.

## Constat

| Point verifie | Resultat |
| --- | --- |
| Arborescence Flutter | Absente |
| Dossiers Android/iOS | Absents |
| Commandes `flutter analyze` / `flutter test` | Non executables sans projet Flutter |
| Scope v1 | Web-only responsive ; natif mobile differe |
| Preuves disponibles | Web responsive mobile apres #152/#155 |

## Decision humaine requise

Choisir une option avant de poursuivre #157/#158 :

| Option | Impact |
| --- | --- |
| Fournir un projet Flutter existant | Je peux l'analyser, le tester, le relier a l'API locale et documenter les bugs |
| Creer un MVP Flutter neuf | Changement de scope et charge importante ; necessite validation produit/pedagogique |
| Requalifier en web mobile responsive | Alignement avec le scope v1 actuel, mais il faut valider que cela satisfait l'UF DEV B3 |

## Si Flutter est fourni

Commandes cibles :

```bash
flutter analyze
flutter test
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:4000
```

Parcours a valider :

- auth ;
- onboarding ;
- feed ;
- discover/search ;
- composer ;
- post detail ;
- like ;
- report ;
- logout.

## Captures utiles pour #158

- Emulator Android/iOS sur ecran login.
- Feed mobile avec donnees locales.
- Composer mobile avant/apres publication.
- Detail post et like.
- Sheet/formulaire de report.
- Logout ou retour login.
- Optionnel : courte video du parcours complet.

## Conclusion #157/#158

Ces issues ne sont pas cloturables automatiquement depuis le depot actuel. Elles
doivent etre mises en `Blocked` dans GitHub Tasks ou requalifiees avant
implementation.
