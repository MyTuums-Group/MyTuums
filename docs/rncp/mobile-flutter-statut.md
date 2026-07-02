# Statut mobile Flutter

Statut : MVP Flutter present depuis le merge de `main` du 2026-07-02.

Ce document couvre les issues #157 et #158. Elles demandent un MVP Flutter
fonctionnel et des preuves mobile Android/iOS. Le depot contient maintenant un
projet Flutter sous `apps/mobile`, avec hotes Android/iOS, ecrans principaux,
stockage de session et facade REST mobile cote API.

## Constat

| Point verifie | Resultat |
| --- | --- |
| Arborescence Flutter | Presente : `apps/mobile/pubspec.yaml`, `apps/mobile/lib`, `apps/mobile/test` |
| Dossiers Android/iOS | Presents : `apps/mobile/android`, `apps/mobile/ios` |
| Facade API mobile | Presente : `apps/api/src/mobile-routes.ts`, ADR `docs/adr/0004-mobile-rest-facade-before-orpc.md` |
| Commandes `flutter analyze` / `flutter test` | A executer sur une machine avec SDK Flutter ; le SDK n'est pas installe dans ce poste Codex |
| Scope v1 | Web-first avec MVP Flutter Android/iOS cible |
| Preuves disponibles | Code Flutter + API mobile + tests API ; captures emulateur a produire |

## Validation technique restante

Commandes cibles depuis `apps/mobile` :

```bash
flutter --version
flutter pub get
flutter analyze
flutter test
```

Commandes de lancement local :

```bash
flutter run --dart-define=MYTUUMS_API_BASE_URL=http://10.0.2.2:4000
```

Utiliser `http://localhost:4000` pour le simulateur iOS et
`http://10.0.2.2:4000` pour l'emulateur Android.

Parcours a valider pour #157 :

- auth ;
- verification email par deep link ;
- onboarding ;
- feed ;
- discover/search ;
- composer ;
- post detail ;
- like ;
- report ;
- logout.

## Captures utiles pour #158

- Emulator Android sur ecran login puis onboarding.
- Emulator iOS ou Android avec feed charge depuis l'API locale.
- Composer mobile avant/apres publication.
- Detail post, commentaires et like.
- Search/discover mobile.
- Profil mobile et follow si le parcours est pret.
- Sheet/formulaire de report.
- Logout ou retour login.
- Terminal `flutter analyze` et `flutter test`.
- Optionnel : courte video du parcours complet.

## Conclusion #157/#158

Les issues ne sont plus bloquees par l'absence de projet Flutter. Elles restent
dependantes d'une validation humaine avec SDK Flutter et emulateur/simulateur
pour produire les preuves finales, car ce poste Codex ne dispose pas de la
commande `flutter`.
