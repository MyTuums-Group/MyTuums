# Index final des preuves

Statut : checklist de readiness pre-finale pour issue #162.

## Objectif

Verifier que le pack fil rouge est complet, coherent et presentable avant rendu.

## Registre des preuves

| Preuve | Exigence | Statut | Responsable | Issue liee | Action restante |
| --- | --- | --- | --- | --- | --- |
| PDF UF DEV B3 reference | Source evaluation | Couvert | ElCabrii | #151 | Conserver chemin `G:/RNCP/Autres/UF_DEV_B3.pdf`. |
| [Matrice UF DEV B3](matrice-conformite-uf-dev-b3.md) | Toutes exigences | Couvert | ElCabrii | #151 | Relire apres reception preuves AcryTeryx. |
| [Document fonctionnel jury](document-fonctionnel-jury.md) | Documentation fonctionnelle | Couvert | ElCabrii | #153 | Ajuster avec captures finales. |
| Schema architecture jury | Documentation technique | Bloque | AcryTeryx | #154 | Joindre schema et lien. |
| Schema DB simplifie | Base de donnees | Bloque | AcryTeryx | #154 | Joindre schema et lien. |
| Captures responsive web | UI multi-support | Bloque | AcryTeryx | #155 | Joindre desktop/tablette/mobile. |
| Axe + audit manuel | Accessibilite | Bloque | AcryTeryx | #156 | Joindre resultats et limites. |
| Performance frontend | Temps de chargement | Bloque | AcryTeryx | #156 | Joindre mesure Lighthouse/equivalent. |
| Flutter analyze/test/build | Mobile | Partiel | AcryTeryx | #157 | PR #164 mergee, rejouer et joindre logs du poste de demo. |
| Captures/video mobile | Mobile fallback | A produire | AcryTeryx | #158 | Joindre supports. |
| [Pilotage collaboration](pilotage-collaboration.md) | Git, collaboration, gestion projet | Couvert | ElCabrii | #159 | Joindre captures board/CI. |
| [Runbook demo](runbook-demo.md) | Demo et fallback | Partiel | ElCabrii | #160 | Mettre a jour comptes et fichiers fallback. |
| [Scripts oraux](scripts-oraux.md) | Oral 10/20 min | Partiel | ElCabrii | #161 | Chronometrer. |
| [Diaporama fil rouge](diaporama-fil-rouge.md) | Support oral | Partiel | ElCabrii | #161 | Remplacer placeholders par captures finales. |
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
| Smoke | `npx pnpm@9.15.9 smoke` | Vert apres #152 |
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
| Matrice 100% complete | Partiel | Attendre #154, #155, #156, #157, #158. |
| Proof links, screenshots, logs, docs indexes | Partiel | Ajouter liens finaux dans le registre. |
| Generated local artifacts ignored or removed | Couvert | `.gitignore` mis a jour. |
| Git status clean except intentional deliverables | Partiel | A verifier juste avant commit/PR. |
| Final checklist ready for human validation | Couvert | Checklist ci-dessus. |
