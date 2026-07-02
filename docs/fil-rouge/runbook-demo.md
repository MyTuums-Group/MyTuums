# Runbook de demo

Statut : version prete pour repetition, validation finale dependante de #157 et #158.

## Objectif

Permettre une demo locale fluide de MyTuums et prevoir un support de repli si un service local, un navigateur ou un emulateur mobile echoue.

## Sequence minutee recommandee

| Temps | Action | Message jury | Fallback |
| --- | --- | --- | --- |
| 0:00 - 1:00 | Rappeler le sujet libre | MyTuums remplace Smart Cafe mais couvre les memes competences | [Scripts oraux](scripts-oraux.md) |
| 1:00 - 3:00 | Montrer la matrice du projet fil rouge | Chaque attendu PDF est relie a une preuve | [Matrice](matrice-conformite-projet-fil-rouge.md) |
| 3:00 - 5:00 | Lancer ou montrer la stack locale | Web + API + DB + mail + storage | Logs #152 |
| 5:00 - 8:00 | Parcours web utilisateur | Auth, onboarding, feed, post, search | [Captures #155](preuve-responsive-web-155.md) |
| 8:00 - 10:00 | Parcours interaction | Commentaire, like, follow, report | [Captures #155](preuve-responsive-web-155.md) |
| 10:00 - 12:00 | Parcours moderation/admin | Signalement, action staff, audit | Captures web ou tests moderation |
| 12:00 - 14:00 | Mobile Flutter | MVP Android/iOS avec API locale | Captures/video #158 |
| 14:00 - 16:00 | Architecture et donnees | Web/API/DB/blob/email/mobile | [Architecture technique jury](architecture-technique-jury.md), [Modele de donnees jury](modele-donnees-jury.md) |
| 16:00 - 18:00 | Qualite, securite, accessibilite | CI, tests, smoke, axe, roles, rate limits | Logs #152/#156 |
| 18:00 - 20:00 | Pilotage, limites, conclusion | Issues, PR, repartition, limites v1 | [Pilotage](pilotage-collaboration.md) |

## Services locaux

Depuis la racine du repo :

```powershell
npx pnpm@9.15.9 install --frozen-lockfile
npx pnpm@9.15.9 --filter web exec playwright install chromium
npx pnpm@9.15.9 infra
npx pnpm@9.15.9 smoke:setup
npx pnpm@9.15.9 dev:full
```

La commande Playwright est a rejouer seulement si le navigateur Chromium manque du cache local. Ce cas a ete rencontre pendant #152, puis resolu sans changement applicatif.

Validation avant demo :

```powershell
npx pnpm@9.15.9 typecheck
npx pnpm@9.15.9 lint
npx pnpm@9.15.9 test
npx pnpm@9.15.9 docs:validate
npx pnpm@9.15.9 db:check
npx pnpm@9.15.9 smoke
npx pnpm@9.15.9 axe:smoke
```

Mobile Android :

```powershell
Set-Location apps/mobile
flutter analyze
flutter test
flutter run --dart-define=MYTUUMS_API_BASE_URL=http://10.0.2.2:4000
```

Validation mobile deja executee pendant la PR #164 : `dart format`, `flutter pub get`, `flutter analyze`, `flutter test`, tests API mobile, typecheck API et lint cible. Rejouee localement le 2026-07-02 avec Flutter 3.44.4 : voir [preuve mobile #157/#158](preuve-mobile-157-158.md). A rejouer sur le poste de demo avant l'oral.

Mobile iOS simulator :

```powershell
flutter run --dart-define=MYTUUMS_API_BASE_URL=http://localhost:4000
```

L'iOS doit etre valide sur macOS.

## Comptes et donnees de test

| Besoin | Donnee | Statut |
| --- | --- | --- |
| Utilisateur principal | Cree dynamiquement par le smoke Playwright | Valide avec #152 |
| Deuxieme utilisateur | Cree dynamiquement par le smoke Playwright | Valide avec #152 |
| Compte staff | Admin/owner pour moderation | A preparer hors #152 |
| Jeux seedes | Catalogue via `smoke:setup` | Valide avec #152 |
| Email local | Mailpit | Valide avec #152 |
| Blob local | Azurite | Valide avec #152 |

## Fallback pack

| Support | Contenu attendu | Responsable | Issue |
| --- | --- | --- | --- |
| [Captures web desktop/tablette/mobile](preuve-responsive-web-155.md) | Auth, feed, post creation, search, profile, report/moderation | AcryTeryx | #155 |
| Logs full-stack | `infra`, `smoke:setup`, `smoke`, CI locale | AcryTeryx | #152, [preuve smoke local](preuve-smoke-local-152.md) |
| Captures accessibilite/performance | Axe, audit manuel, Lighthouse ou equivalent | AcryTeryx | #156 |
| Captures mobile | Android ou iOS, auth, feed, discover, composer, report | AcryTeryx | #158, protocole dans [preuve mobile](preuve-mobile-157-158.md) |
| Video courte mobile optionnelle | Parcours core mobile | AcryTeryx | #158 |
| Diaporama pre-final | Source Markdown du récit oral, à exporter manuellement | ElCabrii | #161 |

## Reprises rapides

| Symptome | Diagnostic | Reprise |
| --- | --- | --- |
| API inaccessible | Port 4000 occupe ou env manquant | Relancer `dev:full`, verifier `.env`, montrer logs fallback. |
| Web inaccessible | Port Vite occupe | Relancer ou changer port si necessaire, utiliser captures #155. |
| DB vide | Migrations/seed non appliques | Relancer `infra`, puis `smoke:setup`. |
| Email de verification absent | Mailpit non lance ou mauvaise URL | Verifier `infra`, ouvrir Mailpit, utiliser compte deja verifie. |
| Media upload echoue | Azurite non lance ou container absent | Relancer `infra`, utiliser post texte en fallback. |
| Smoke echoue le jour J | Donnees ou timing instables | Montrer dernier log vert indexe dans #152. |
| Emulateur Android lent | API URL ou cold start | Utiliser video/captures #158. |

## Acceptation de #160

| Critere | Statut | Preuve |
| --- | --- | --- |
| Demo order fixe et time | Couvert | Sequence minutee ci-dessus. |
| Services, commandes, comptes, donnees listes | Partiel | Services et comptes smoke valides via #152 ; compte staff a preparer pour la demo admin. |
| Fallback screenshots/video indexes | Partiel | Captures web #155 indexees ; captures mobile #158 a joindre. |
| Recovery steps documented | Couvert | Reprises rapides ci-dessus. |
