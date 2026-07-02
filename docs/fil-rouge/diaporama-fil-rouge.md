# Diaporama fil rouge UF DEV B3

Statut : trame pre-finale pour issue #161, a exporter en slides apres ajout des captures finales.

Format : une section `---` par slide, compatible avec un export Markdown vers PowerPoint, Marp, Reveal ou Canva.

---

## 1. MyTuums

Plateforme sociale web-first pour joueurs.

Message oral : sujet libre UF DEV B3, meme famille de competences que le sujet Smart Cafe.

Visuel attendu : logo ou capture feed web.

---

## 2. Besoin et utilisateurs

- Publier des contenus courts lies aux jeux.
- Decouvrir jeux, profils et posts.
- Interagir sans messagerie ni streaming.
- Signaler et moderer les abus.

Visuel attendu : capture parcours utilisateur ou schema acteurs.

---

## 3. Perimetre v1

- Auth email, verification, sessions.
- Onboarding, profil, jeux favoris.
- Posts texte/media, feeds, recherche.
- Commentaires, likes, follows, blocks.
- Reports, moderation, staff.
- MVP Flutter pour parcours essentiels.

Visuel attendu : capture scope ou tableau v1/hors v1.

---

## 4. Parcours demo

1. Inscription et verification email.
2. Onboarding profil.
3. Feed et recherche.
4. Creation de post.
5. Interaction sociale.
6. Signalement.
7. Moderation staff.

Visuel attendu : sequence de captures web #155.

---

## 5. Architecture

- Monorepo : `apps/web`, `apps/api`, `apps/docs`, `apps/mobile`.
- Packages partages : DB, UI, types, config.
- API Fastify/tRPC + facade REST mobile.
- PostgreSQL/Drizzle, blob storage, email local.

Visuel attendu : schema architecture #154.

---

## 6. Base de donnees

- Entites : user, profile, game, post, media, comment.
- Relations sociales : follow, block, like, notification.
- Moderation : report, moderation case, audit.
- Qualite donnees : contraintes, index, migrations, seeds.

Visuel attendu : schema DB simplifie #154.

---

## 7. Securite et moderation

- BetterAuth, sessions et roles.
- Guards staff, account status, CORS.
- Rate limits et validation d'entrees.
- Blobs prives et URLs controlees.
- Reports, cases, audit, suspensions.

Visuel attendu : capture admin/moderation ou extrait matrice.

---

## 8. Mobile Flutter

- PR #164 mergee le 2026-07-02.
- App Android/iOS sous `apps/mobile`.
- REST mobile avant oRPC/OpenAPI.
- Auth, onboarding, feed, discover, composer, post detail, like, report, logout.

Visuel attendu : captures ou video mobile #158.

---

## 9. Qualite et validation

- `typecheck`, `lint`, `test`, `build`.
- `docs:validate`, `db:check`.
- `smoke` Playwright et `axe:smoke`.
- CI GitHub Actions verte sur PR #163/#164.

Visuel attendu : capture checks CI.

---

## 10. Pilotage

- Issues #151 a #162 decoupees par livrable.
- Repartition ElCabrii / AcryTeryx.
- Board GitHub `Tasks`.
- PR, revue, validation, index des preuves.

Visuel attendu : capture board Tasks #159.

---

## 11. Limites assumees

- Pas de messagerie privee.
- Pas de live streaming.
- Pas de recommandations avancees.
- Pas d'OAuth/2FA en v1.
- Pas de parite mobile native complete.
- Captures finales et audits manuels a joindre avant rendu.

Visuel attendu : slide sobre avec risques et mitigations.

---

## 12. Conclusion

MyTuums prouve un produit coherent, une architecture maintenable et une demarche projet defendable.

Chaque exigence UF DEV B3 est reliee a une preuve dans `docs/fil-rouge/`.

Visuel attendu : index final des preuves ou matrice.
