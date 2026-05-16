# MyTuums

A web-first social platform for gamers to post, browse, and discuss short-form gaming content.

V1 focuses on public posts, profiles, game-tagged discovery, follows, comments, likes, reporting, and basic moderation — intentionally not a messaging app, livestreaming platform, or recommendation engine.

## Tech Stack

| Layer          | Technology                                                  |
| -------------- | ----------------------------------------------------------- |
| **Monorepo**   | Turborepo + pnpm workspaces                                 |
| **Frontend**   | React 19, Vite, TanStack Router, Tailwind CSS, ShadCN/Radix |
| **API**        | Fastify, tRPC, BetterAuth                                   |
| **Database**   | PostgreSQL + Drizzle ORM                                    |
| **Email**      | Resend (prod), Mailpit (dev)                                |
| **Storage**    | Azure Blob Storage (prod), Azurite (local)                  |
| **Testing**    | Vitest (unit/integration), Playwright (e2e smoke)           |
| **CI/CD**      | GitHub Actions, Azure deployment                            |
| **Monitoring** | Sentry (errors only), structured JSON logging               |

## Architecture

```
MyTuums/
├── apps/
│   ├── web/          React + Vite frontend
│   └── api/          Fastify + tRPC + BetterAuth backend
├── packages/
│   ├── db/           Drizzle schema, migrations, client
│   ├── ui/           ShadCN primitives, design-system wrappers
│   ├── config/       Shared env validation + config helpers
│   ├── types/        Domain value objects with invariants
│   └── api-contract/ tRPC router/client type wiring
└── docs/
    ├── prd/          Product requirements + scope
    ├── adr/          Architecture decision records
    └── agents/       Agent conventions
```

See `CONTEXT.md` for the full domain vocabulary, invariants, and architecture rules. See `docs/prd/v1-prd.md` for the product roadmap and build order.

## Getting Started

**Prerequisites**: Node.js >= 20, PostgreSQL 16+, pnpm 9.15.9

```bash
# Install pnpm
corepack enable && corepack prepare pnpm@9.15.9 --activate

# Clone and install
git clone https://github.com/ElCabrii/MyTuums.git
cd MyTuums
pnpm install

# Environment setup
cp .env.example .env   # edit with your local values

# Start development servers
pnpm dev               # runs web (5173) + api (4000) via Turborepo
```

For local infrastructure, start PostgreSQL, Mailpit, and Azurite:

```bash
pnpm infra
```

To run the critical-flow Playwright smoke locally against that infrastructure:

```bash
pnpm smoke:setup
pnpm smoke
```

## Commands

| Command              | Description                                                                 |
| -------------------- | --------------------------------------------------------------------------- |
| `pnpm dev`           | Start web + API dev servers                                                 |
| `pnpm build`         | Build all packages and apps                                                 |
| `pnpm lint`          | ESLint across all packages                                                  |
| `pnpm format`        | Prettier across all packages                                                |
| `pnpm typecheck`     | TypeScript strict check                                                     |
| `pnpm docs:validate` | Build and validate the docs-content artifact                                |
| `pnpm test`          | Vitest unit/integration tests                                               |
| `pnpm test:watch`    | Vitest in watch mode                                                        |
| `pnpm smoke:setup`   | Apply smoke DB migrations and seed the game catalog                         |
| `pnpm smoke`         | Run Playwright smoke against local Postgres, Mailpit, Azurite, API, and web |

## Documentation

- **Domain & Architecture**: [`CONTEXT.md`](CONTEXT.md)
- **Product Requirements**: [`docs/prd/v1-prd.md`](docs/prd/v1-prd.md)
- **Scope Definition**: [`docs/prd/v1-scope.md`](docs/prd/v1-scope.md)
- **Architecture Decisions**: [`docs/adr/`](docs/adr/)
- **Team Conventions**: [`docs/team-conventions.md`](docs/team-conventions.md)

## Deployment

- **Web**: Azure Static Web Apps (`mytuums.com`, `www.mytuums.com`)
- **Docs**: Azure Static Web Apps (`docs.mytuums.com`)
- **API**: Azure App Service (`api.mytuums.com`)
- **Database**: Azure Database for PostgreSQL Flexible Server
- **Media**: Azure Blob Storage

Supports `local`, `staging`, and `production` environments. Migrations run as explicit CI/CD deployment steps — the API does not run migrations on startup.

## License

Proprietary. All rights reserved.
