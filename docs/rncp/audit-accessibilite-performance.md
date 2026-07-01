# Audit accessibilite et performance frontend

Statut : preuve automatique partielle du 2026-07-01.

Ce document couvre l'issue #156 : resultat axe, audit manuel
clavier/focus/labels/contraste et preuve de performance frontend.

## Resultat automatique

Commande executee le 2026-07-01 :

```bash
pnpm axe:smoke
```

Resultat : OK, 1 test Playwright/axe passe sur le formulaire contact public.

Note : le test desactive `color-contrast`, donc le contraste doit rester dans
l'audit manuel et/ou Lighthouse.

## Audit manuel a realiser

| Controle | Pages/parcours | Statut | Preuve attendue |
| --- | --- | --- | --- |
| Navigation clavier | login, register, feed, composer, settings | A faire | Capture focus ou grille signee |
| Ordre de focus | header, menus, dialogs, report sheet | A faire | Notes parcours tabulation |
| Focus visible | boutons, liens, champs, icon buttons | A faire | Captures desktop/mobile |
| Labels formulaires | auth, contact, settings, composer | A faire | Capture inspectee ou checklist |
| Messages d'erreur | auth, post, upload, contact | A faire | Captures erreurs explicites |
| Contraste | layout, boutons, alertes, textes secondaires | A faire | Lighthouse/DevTools ou outil contraste |
| Reduced motion | transitions principales | A faire | Note comportement |
| Media alternatives | avatars, banners, post images | A faire | Capture alt/label ou test manuel |

## Protocole performance

Option recommandee : Lighthouse dans Chrome contre un build local ou la web app
locale lancee.

```bash
pnpm build
pnpm --filter web preview
```

Puis capturer Lighthouse sur :

- `/login`
- `/`
- `/discover`
- un detail post `/post/...`
- `/contact`

Si le build local n'est pas possible, utiliser une mesure Playwright simple :
temps de chargement initial, erreurs console et screenshots reseau.

## Criteres de conclusion

| Critere | Attendu dossier | Statut |
| --- | --- | --- |
| Axe smoke | Pas de violation bloquante automatique | OK le 2026-07-01 |
| Audit clavier | Aucun blocage sur parcours critiques | A faire |
| Contraste | Defauts bloques corriges ou documentes | A faire |
| Performance | Score/metriques capturees, limites connues | A faire |
| Correctifs | Bugs bloquants fixes ou listes | A faire |

## Captures utiles

- Terminal `pnpm axe:smoke` vert.
- Lighthouse summary avec Performance, Accessibility, Best Practices, SEO.
- Focus visible sur un formulaire et sur une action icon-only.
- Message d'erreur d'un formulaire auth/contact.
- Si une violation est trouvee : capture avant/apres et lien du correctif.
