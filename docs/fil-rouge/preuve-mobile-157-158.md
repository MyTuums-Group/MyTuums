# Preuve mobile #157 et #158

Statut : #157 valide cote code et tests ; #158 attend une capture Android/iOS sur emulateur ou device.

## Objectif

Prouver que le MVP Flutter peut porter la demo mobile MyTuums sans viser une parite totale avec le web. Cette preuve couvre l'etat local du code, les commandes rejouees, les surfaces fonctionnelles et la limite restante pour les captures de fallback.

## Environnement verifie

| Element | Valeur |
| --- | --- |
| Date | 2026-07-02 |
| OS | Windows 11 |
| SDK Flutter utilise | `C:\Users\tlauc\.codex\tools\flutter` |
| Version Flutter | `3.44.4` stable |
| Version Dart | `3.12.2` |
| App mobile | `apps/mobile` |

## Commandes rejouees

Depuis `apps/mobile` :

```powershell
& "$env:USERPROFILE\.codex\tools\flutter\bin\flutter.bat" pub get
& "$env:USERPROFILE\.codex\tools\flutter\bin\flutter.bat" analyze
& "$env:USERPROFILE\.codex\tools\flutter\bin\flutter.bat" test
```

Resultats :

| Commande | Resultat |
| --- | --- |
| `flutter pub get` | OK, dependances resolues. |
| `flutter analyze` | OK, `No issues found!`. |
| `flutter test` | OK, 6 tests passes. |

## Parcours couverts par le MVP

| Parcours | Preuve code |
| --- | --- |
| Auth register/login/reset/logout | `apps/mobile/lib/src/screens/auth_screens.dart`, `apps/mobile/lib/src/app_state.dart`, `apps/mobile/lib/src/api/mobile_api.dart` |
| Deep links email/password | `apps/mobile/lib/src/deep_links.dart`, `apps/mobile/lib/src/mobile_config.dart` |
| Onboarding profil | `apps/mobile/lib/src/screens/onboarding_screen.dart` |
| Feed For You / Following | `apps/mobile/lib/src/screens/app_home_screen.dart`, appels `/api/mobile/v1/feed/*` |
| Discover search | `DiscoverScreen`, `/api/mobile/v1/search` |
| Composer post + image | `ComposerScreen`, `/api/mobile/v1/posts`, `/api/mobile/v1/media/uploads` |
| Detail post + commentaires | `PostDetailScreen`, routes comments mobile |
| Like post | `togglePostLike`, route `/api/mobile/v1/posts/:publicId/like-toggle` |
| Report | bottom sheet `Report`, route `/api/mobile/v1/reports` |
| Profil et logout | `ProfileScreen`, `AppState.logout` |

## Durcissement apporte

- Le libelle et le message d'erreur de creation de compte mobile utilisent maintenant le seuil v1 `16+`.
- Un test widget verifie que l'ecran register affiche `I am at least 16 years old`.

## Limites non critiques documentees

| Limite | Statut |
| --- | --- |
| Parite mobile complete | Hors v1 volontairement ; le MVP cible les parcours critiques. |
| Flutter desktop/web | Hors scope mobile ; l'app vise Android/iOS. |
| Capture Android/iOS locale | Bloquee ici par absence d'Android SDK/emulateur ; iOS necessite macOS. |
| Video mobile | Optionnelle dans #158 ; a produire si un device/emulateur est disponible. |

## Checklist #158

Pour cloturer #158, produire au moins une capture Android ou iOS avec ce protocole :

```powershell
npx pnpm@9.15.9 infra
npx pnpm@9.15.9 smoke:setup
npx pnpm@9.15.9 dev:full
Set-Location apps/mobile
flutter run --dart-define=MYTUUMS_API_BASE_URL=http://10.0.2.2:4000
```

Captures minimales attendues :

| Capture | But |
| --- | --- |
| Auth ou login | Prouver l'entree dans le parcours mobile. |
| Feed | Prouver la lecture de donnees API locales. |
| Discover | Prouver recherche/navigation. |
| Composer | Prouver creation de contenu ou formulaire pret. |
| Detail post + report | Prouver interaction critique et moderation. |

Sur iOS simulator, utiliser `http://localhost:4000` et lancer depuis macOS.
