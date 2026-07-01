# Preuves de demo locale

Statut : execution partielle du 2026-07-01.

Ce guide couvre l'issue #152 : rendre la validation locale reproductible avec
Docker, migrations, seeds, web/API startup et smoke Playwright.

## Resultats observes le 2026-07-01

| Commande | Resultat | Note |
| --- | --- | --- |
| `corepack prepare pnpm@9.15.9 --activate` | OK | Version pnpm resolue : 9.15.9 |
| `corepack pnpm install --frozen-lockfile` | OK | 1095 packages installes depuis le lockfile |
| `corepack enable` | Echec local | `EPERM` sur `C:\Program Files\nodejs\pnpx`, droits admin requis |
| shim temporaire `pnpm.cmd` dans `%TEMP%` | OK | Permet aux scripts internes qui appellent `pnpm` de tourner |
| `pnpm infra` | Echec local | `docker` absent du PATH |
| `pnpm smoke:setup` | Echec attendu | migrations Drizzle impossibles sans Postgres local |
| `pnpm axe:smoke` | OK | 1 test Playwright/axe passe |

## Blocage actuel

Docker Desktop n'est pas disponible dans le shell local. Les commandes suivantes
ne peuvent donc pas satisfaire les criteres de #152 tant que Docker n'est pas
installe, lance, et expose via `docker` :

```bash
pnpm infra
pnpm smoke:setup
pnpm smoke
```

Intervention humaine utile : installer ou ouvrir Docker Desktop, puis verifier :

```bash
docker --version
docker compose version
```

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

L'issue #152 n'est pas completement cloturable au 2026-07-01 sur ce poste :
`pnpm infra` est bloque par l'absence de Docker. Le reste du protocole est pret
et `pnpm axe:smoke` passe.
