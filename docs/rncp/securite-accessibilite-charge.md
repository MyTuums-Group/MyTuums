# Sécurité, accessibilité et charge

Statut : socle initial.

## Objectif

Fournir les preuves complémentaires attendues pour BC01 : risques de sécurité, accessibilité et estimation de charge.

## Analyse de risques sécurité

| Risque | Impact | Probabilité | Criticité | Mitigation MyTuums | Preuve |
| --- | --- | --- | --- | --- | --- |
| Compromission session | Compte utilisateur détourné | Moyen | Élevée | sessions httpOnly, BetterAuth, invalidation après suspension/changement critique | Auth service/tests |
| Brute force login | Accès non autorisé | Moyen | Élevée | rate limits auth | auth-rate-limit tests |
| Upload média abusif | Contenu dangereux ou coût stockage | Moyen | Élevée | limites taille/type, rate limit upload, modération réactive | service média, ADR media scan |
| Accès média non autorisé | Fuite données utilisateur | Faible à moyen | Élevée | blobs privés, URL signées, visibility checks | service média |
| Rôle staff mal contrôlé | Action de modération abusive | Faible | Élevée | rôles moderator/admin/owner, policies, audit | staff/moderation services |
| CORS trop ouvert | Requêtes credentialed non voulues | Faible | Moyenne | origines configurées uniquement | cors tests |
| Injection données | Corruption ou fuite DB | Faible | Élevée | Drizzle, validations API, paramètres SQL | db schema/services |
| Données personnelles conservées trop longtemps | Risque RGPD | Moyen | Moyenne | suppression compte, rétention docs, legal context | account deletion tests |
| Régression fonctionnelle | Perte de qualité | Moyen | Moyenne | CI, tests, smoke | workflows CI |
| Secrets exposés | Compromission infra | Faible | Élevée | `.env` ignorés, secrets GitHub/Azure | deployment docs |

## Contrôle accessibilité

Preuves existantes :

- axe smoke automatisé ;
- ShadCN/Radix pour primitives accessibles ;
- pages statiques support/accessibilité ;
- tests web sur pages statiques et routes.

Audit manuel à produire :

| Contrôle | Parcours | Statut |
| --- | --- | --- |
| Navigation clavier | login, register, feed, post composer, settings | À faire |
| Focus visible | boutons, liens, dialogs, menus | À faire |
| Labels formulaires | register, contact, settings, composer | À faire |
| Messages d'erreur | auth, post, contact, upload | À faire |
| Contraste | layout principal, boutons, alertes | À faire |
| Icon-only buttons | nav, actions post, modération | À faire |
| Reduced motion | transitions principales | À faire |
| Labels média | avatar, banner, post image/video | À faire |

Conclusion provisoire : la preuve automatique existe, mais le dossier RNCP doit inclure une grille manuelle signée ou datée.

## Rapport de charge/performance

Protocole léger recommandé :

- environnement : local ou staging ;
- données : utilisateurs tests, jeux seed, posts seed ;
- outils : k6, autocannon ou Playwright mesure simple ;
- scénarios : health API, login, feed, search, post création, upload média mock ou local Azurite ;
- métriques : temps moyen, p95, erreurs, CPU/mémoire si disponible ;
- conclusion : capacité observée, limites, pistes d'amélioration.

Table résultats à compléter :

| Scénario | Charge | Temps moyen | p95 | Erreurs | Conclusion |
| --- | --- | --- | --- | --- | --- |
| Health API | À renseigner | À renseigner | À renseigner | À renseigner | À renseigner |
| Feed | À renseigner | À renseigner | À renseigner | À renseigner | À renseigner |
| Search | À renseigner | À renseigner | À renseigner | À renseigner | À renseigner |
| Create post | À renseigner | À renseigner | À renseigner | À renseigner | À renseigner |
| Upload média local | À renseigner | À renseigner | À renseigner | À renseigner | À renseigner |

## Preuves à joindre

- Sortie `pnpm axe:smoke`.
- Capture audit manuel.
- Commande et résultats de charge.
- Capture Sentry/logs si disponible.
- Schéma de tiers applicatifs.
