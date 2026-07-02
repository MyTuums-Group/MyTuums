# Preuves de demo locale

Statut : execution locale completee le 2026-07-02.

Ce guide couvre l'issue #152 : rendre la validation locale reproductible avec
Docker, migrations, seeds, web/API startup et smoke Playwright.

## Resultats observes

| Commande | Resultat | Note |
| --- | --- | --- |
| `corepack prepare pnpm@9.15.9 --activate` | OK | Version pnpm resolue : 9.15.9 |
| `corepack pnpm install --frozen-lockfile` | OK | 1095 packages installes depuis le lockfile |
| `corepack enable` | Echec local | `EPERM` sur `C:\Program Files\nodejs\pnpx`, droits admin requis |
| shim temporaire `pnpm.cmd` dans `%TEMP%` | OK | Permet aux scripts internes qui appellent `pnpm` de tourner |
| `pnpm infra` | OK | PostgreSQL, Mailpit et Azurite demarres via Docker |
| `pnpm smoke:setup` | OK | migrations appliquees et 10 jeux seedes |
| `pnpm smoke` | OK | 12 tests Playwright passent apres nettoyage du rate limit local |
| `pnpm axe:smoke` | OK | 1 test Playwright/axe passe |

## Caveat rate limit local

Les essais repetes de `pnpm smoke` creent plusieurs inscriptions et peuvent
declencher la protection anti-abus locale `auth_registration` :

```bash
Too many authentication attempts. Please wait before trying again.
```

Pour repartir immediatement dans l'environnement local de preuve, vider la table
de rate limit generee par les essais :

```bash
docker exec mytuums-db psql -U mytuums -d mytuums -c "truncate table rate_limit;"
```

Alternative plus large : `pnpm infra:reset`, puis `pnpm infra` et
`pnpm smoke:setup`.

## Procedure cible

Depuis la racine du depot :

```bash
pnpm install --frozen-lockfile
pnpm infra
pnpm smoke:setup
pnpm smoke
pnpm axe:smoke
pnpm infra:down
```

Si Corepack ne peut pas creer le shim `pnpm` dans `Program Files`, utiliser un
terminal admin ou ajouter temporairement un shim utilisateur. Le probleme est un
detail de poste local, pas une contrainte du repo.

## Preuves a conserver

| Preuve | Format conseille | Moment de capture |
| --- | --- | --- |
| Infra locale | screenshot terminal | Juste apres `pnpm infra`, avec containers started |
| Migrations et seed | log terminal ou fichier texte | Juste apres `pnpm smoke:setup` vert |
| Smoke Playwright | terminal + rapport HTML si utile | Juste apres `pnpm smoke` vert |
| Axe smoke | terminal | Deja vert le 2026-07-01, recapturer pour dossier final |
| Caveats poste local | note dans ce document | Si Docker/Corepack demandent action humaine |

## Decision #152

L'issue #152 est techniquement prouvable sur ce poste : `pnpm infra`,
`pnpm smoke:setup`, `pnpm smoke` et `pnpm axe:smoke` ont ete executes avec
succes le 2026-07-02. Conserver les captures terminal dans le dossier final.
