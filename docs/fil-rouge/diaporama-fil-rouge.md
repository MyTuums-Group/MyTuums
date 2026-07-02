# Diaporama projet fil rouge

Statut : source Markdown du support oral, à exporter manuellement en diaporama.

Format : une section `---` par slide.

---

## 1. MyTuums

Une plateforme sociale web-first pour joueurs, défendue par un dossier de preuves et une démo produit.

- Sujet libre.
- Web + API + DB.
- Mobile Flutter.

---

## 2. Le besoin tient en trois gestes simples

- Publier des contenus courts liés aux jeux.
- Découvrir profils, jeux et posts dans une expérience ciblée.
- Protéger les interactions avec signalements et modération.

La v1 cherche la cohérence produit avant l'accumulation de features.

---

## 3. Le périmètre v1 couvre le cœur social

Inclus :

- Auth email et sessions.
- Onboarding, profil, jeux favoris.
- Posts texte/média, feed, recherche.
- Likes, commentaires, follows, blocks.
- Signalements et modération staff.
- MVP Flutter des parcours essentiels.

Hors v1 :

- Messagerie privée.
- Live streaming.
- Recommandations avancées.
- OAuth et 2FA.
- Hashtags et analytics.
- Parité mobile complète.

---

## 4. La démo suit un parcours utilisateur complet

1. Inscription.
2. Onboarding.
3. Feed.
4. Création de post.
5. Recherche.
6. Signalement.
7. Modération.

La démo doit montrer à la fois l'expérience utilisateur et la preuve technique associée.

---

## 5. L'architecture sépare les apps, les contrats et la donnée

- Web React/Vite.
- Mobile Flutter.
- API Fastify avec tRPC web et REST mobile.
- Services métier : média, feed, modération.
- PostgreSQL/Drizzle, blob storage et email local.
- Packages partagés : DB, UI, types, config.

---

## 6. Le modèle de données soutient les parcours sociaux

- Identité : user, profile, session.
- Contenu : game, post, media, comment.
- Social : like, follow, block, notification.
- Modération : report, case, audit, account status.

Contraintes, index, migrations et seeds transforment le schéma en preuve technique.

---

## 7. La sécurité est traitée par couches

- Identité : BetterAuth, vérification email, sessions et état du compte.
- API : validation, CORS, rate limits, rôles et guards staff.
- Médias : uploads contrôlés, blobs privés, URLs signées et moderation hold.
- Modération : signalements, cases, audit, suspensions et blocs.

---

## 8. Le MVP Flutter prouve la portée mobile

- App Android/iOS sous `apps/mobile`.
- Façade REST dédiée avant oRPC/OpenAPI.
- Parcours cibles : auth, onboarding, feed, discover, composer, post detail, like, report, logout.
- Parité mobile complète volontairement hors v1.

---

## 9. La qualité se prouve par la CI et les validations locales

- `typecheck`, `lint`, `test`, `build`.
- `docs:validate`, `db:check`.
- `smoke` Playwright et `axe:smoke`.
- CI GitHub Actions verte sur les PR fil rouge récentes.

---

## 10. Le pilotage rend le travail défendable

- Issues #151 à #162 découpées par livrable.
- Board GitHub `Tasks`.
- Branches, PR, CI et merges.
- Répartition ElCabrii / AcryTeryx.
- Index final des preuves.

---

## 11. Les limites sont assumées et encadrées

- Messagerie et streaming hors v1.
- Recommandations avancées remplacées par recherche et feeds simples.
- OAuth/2FA planifiés après durcissement auth.
- MVP mobile ciblé sur les parcours critiques.
- Captures et mesures finales à joindre avant clôture.

---

## 12. MyTuums relie produit, technique et preuves

- Produit cohérent : besoin clair, périmètre v1 défendable, parcours démo et limites explicites.
- Architecture maintenable : monorepo, API, services, DB, sécurité, mobile et CI.
- Preuves traçables : matrice, runbook, scripts, Q/R, index final et liens vers PR/issues.

Le dossier de référence est `docs/fil-rouge/`.
