# Index final des preuves

Statut : checklist de readiness pre-finale pour issue #162.

## Objectif

Verifier que le pack fil rouge est complet, coherent et presentable avant rendu.

## Registre des preuves

| Preuve | Exigence | Statut | Responsable | Issue liee | Action restante |
| --- | --- | --- | --- | --- | --- |
| PDF source des attendus | Source evaluation | Couvert | ElCabrii | #151 | Conserver chemin `G:/RNCP/Autres/UF_DEV_B3.pdf`. |
| [Matrice projet fil rouge](matrice-conformite-projet-fil-rouge.md) | Tous attendus | Couvert | ElCabrii | #151 | Relire apres reception preuves AcryTeryx. |
| [Document fonctionnel jury](document-fonctionnel-jury.md) | Documentation fonctionnelle | Couvert | ElCabrii | #153 | Ajuster avec captures finales. |
| [Schema architecture jury](architecture-technique-jury.md) | Documentation technique | Couvert | AcryTeryx | #154 | Relire avec le discours oral. |
| [Schema DB simplifie](modele-donnees-jury.md) | Base de donnees | Couvert | AcryTeryx | #154 | Relire avec le discours oral. |
| [Captures responsive web](preuve-responsive-web-155.md) | UI multi-support | Couvert | AcryTeryx | #155 | Relire avant integration dans le runbook final. |
| Axe + audit manuel | Accessibilite | Bloque | AcryTeryx | #156 | Joindre resultats et limites. |
| Performance frontend | Temps de chargement | Bloque | AcryTeryx | #156 | Joindre mesure Lighthouse/equivalent. |
| Flutter analyze/test/build | Mobile | Partiel | AcryTeryx | #157 | PR #164 mergee, rejouer et joindre logs du poste de demo. |
| Captures/video mobile | Mobile fallback | A produire | AcryTeryx | #158 | Joindre supports. |
| [Smoke local full-stack](preuve-smoke-local-152.md) | Validation locale multi-tiers | Couvert | AcryTeryx | #152 | Captures automatiques ajoutees ; rejouer avant l'oral si l'environnement change. |
| [Pilotage collaboration](pilotage-collaboration.md) | Git, collaboration, gestion projet | Couvert | ElCabrii | #159 | Joindre captures board/CI. |
| [Runbook demo](runbook-demo.md) | Demo et fallback | Partiel | ElCabrii | #160 | Finaliser apres preuves mobile #157/#158. |
| [Scripts oraux](scripts-oraux.md) | Oral 10/20 min | Partiel | ElCabrii | #161 | Chronometrer. |
| [Diaporama fil rouge](diaporama-fil-rouge.md) | Support oral | Partiel | ElCabrii | #161 | Exporter le diaporama final, chronométrer la présentation et enrichir avec captures finales si disponibles. |
| [Questions reponses jury](questions-reponses-jury.md) | Preparation Q/R | Couvert | ElCabrii | #161 | Relire a voix haute. |

## Checklist repository

| Controle | Commande | Statut attendu |
| --- | --- | --- |
| Docs manifest | `npx pnpm@9.15.9 docs:validate` | Vert |
| Types | `npx pnpm@9.15.9 typecheck` | Vert avant rendu final |
| Lint | `npx pnpm@9.15.9 lint` | Vert avant rendu final |
| Tests | `npx pnpm@9.15.9 test` | Vert avant rendu final |
| Build | `npx pnpm@9.15.9 build` | Vert avant rendu final |
| DB | `npx pnpm@9.15.9 db:check` | Vert avant rendu final |
| Smoke | `npx pnpm@9.15.9 smoke` | Vert avec #152 |
| Axe | `npx pnpm@9.15.9 axe:smoke` | Vert apres #156 |
| Git | `git status --short` | Seulement livrables intentionnels |

## Nettoyage local

Les artefacts generes ne doivent pas polluer le rendu :

- `apps/web/playwright-report/` ignore.
- `apps/web/test-results/` ignore.
- `apps/mobile/build/` deja ignore par les regles Flutter/build.
- `.env*` locaux ignores.

## Criteres de cloture de #162

| Critere | Statut | Derniere action |
| --- | --- | --- |
| Matrice 100% complete | Partiel | Attendre #156, #157, #158. |
| Proof links, screenshots, logs, docs indexes | Partiel | #152, #154 et #155 indexes ; ajouter liens finaux #156/#157/#158. |
| Generated local artifacts ignored or removed | Couvert | `.gitignore` mis a jour. |
| Git status clean except intentional deliverables | Partiel | A verifier juste avant commit/PR. |
| Final checklist ready for human validation | Couvert | Checklist ci-dessus. |
