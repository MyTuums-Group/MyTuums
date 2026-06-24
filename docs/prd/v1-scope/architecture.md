# V1 Architecture Scope

This file is part of the authoritative MyTuums v1 scope. Start from [`../v1-scope.md`](../v1-scope.md) for the complete scope map.

Timestamps are stored in UTC and exposed as ISO strings. Feeds use relative display, while detail/admin views can show local absolute times.

## Monorepo

Use Turborepo.

`pnpm` is the canonical package manager and should be enforced through package metadata and CI.

ESLint is used for TypeScript/React linting and Prettier for formatting.

TypeScript is strict across all packages and CI fails on typecheck errors.

Vitest is used for unit/service/integration tests; Playwright is used for browser smoke tests.

Canonical initial structure:

- `apps/web`: React + Vite web app
- `apps/api`: TypeScript Fastify API server hosting tRPC plus auth/health/upload routes
- `packages/db`: Drizzle schema, migrations, database client
- `packages/ui`: ShadCN-based shared UI components
- `packages/config`: shared environment validation/config helpers
- `packages/api-contract`: shared tRPC types/client helpers
- `packages/types`: cross-package domain/value types

Package boundaries:

- `packages/api-contract` exports only tRPC router/client type wiring
- `packages/types` exports stable cross-package domain/value types and shared constants only
- neither package may contain service logic, DB clients, React components, or catch-all utilities
- `packages/ui` contains ShadCN primitives, design-system wrappers, and reusable low-domain components only
- product/domain composition such as feeds, profile cards, moderation screens, and route layouts stays in `apps/web`

Avoid a generic catch-all `shared` package.

## Frontend

V1 is web-only with responsive mobile layouts.

V1 includes internationalization for the supported signup region. Product and legal copy must be localized for the launch locales selected for the EU, EEA, UK, and Switzerland, rather than hardcoded as English-only UI.

V1 launch locales are `en`, `fr`, `de`, `es`, `it`, `nl`, `pt`, and `pl`. For legal pages, French is the authoritative version when the operator is France-based; other locale versions are translations for user convenience unless counsel requires otherwise.

Locale defaults from the browser language when supported, can be changed by the user in settings, and is separate from signup country. Legal pages should have locale-specific routes such as `/fr/terms` and `/en/terms`.

Frontend stack:

- React
- Vite
- TanStack Router
- Tailwind CSS
- ShadCN
- tRPC React Query/TanStack Query for server state
- Zustand where local client state is actually needed
- React Hook Form for forms, with Zod schemas/constants mirrored for UX where useful

Initialize ShadCN with the chosen preset:

```bash
pnpm dlx shadcn@latest init --preset b1zww1gyLw --template vite --monorepo --pointer
```

This command is the canonical scaffold instruction, not an example. Do not swap the preset, theme, template, or monorepo mode unless this PRD changes.

The v1 visual theme is defined by the chosen ShadCN preset/theme. Coders and agents should not override or replace that theme unless the product scope explicitly changes.

Deferred:

- React Native
- formal PWA support
- native mobile apps
- push notifications
- offline mode

## Backend

V1 uses one TypeScript API app.

Canonical API route prefixes:

- `/trpc` for app procedures
- `/auth/*` for auth routes
- `/healthz` for platform health checks
- narrow REST endpoints only where browser/blob/provider flows require them

Backend stack:

- Fastify as the API HTTP host
- tRPC
- BetterAuth
- Drizzle ORM
- PostgreSQL
- Azure Blob Storage in production
- Azurite in local development
- Resend for production transactional email
- Mailpit for local email testing
- Sentry for error monitoring

Email conventions:

- transactional email sends from `MyTuums <noreply@mytuums.com>`
- support/contact email routes to `support@mytuums.com`
- Resend domain/sender verification and support mailbox routing must be confirmed before public signup and media uploads are enabled

No v1:

- Go microservices
- Redis
- RabbitMQ
- worker service
- real-time messaging
- WebSockets
- live streaming service
- video processing pipeline

The API should be stateless:

- no local file storage
- no in-memory production sessions
- no in-memory production rate limits
- no process-local state required for correctness
- uploads go to blob storage
- sessions/auth state are persisted appropriately

Routers should stay thin. Business rules live in service modules.

Use centralized authorization helpers/policies for:

- required session/user
- admin/moderator access
- blocked users
- deleted/removed content
- suspended/account-deleted users
- content visibility
- moderation permissions

Validation:

- API owns canonical validation schemas
- frontend forms may use form-specific schemas where UX requires it
- shared constants define limits and allowlists

## Rate Limiting

V1 uses production-safe rate limiting without Redis.

Recommended:

- Postgres-backed rate limits behind a small limiter module
- swappable later for Redis
- route-appropriate keys: user ID for logged-in actions, IP for logged-out/auth/contact actions, and combined user/IP keys for high-abuse actions such as uploads and reports
- upload and search limits are product-specified; other route thresholds use conservative config defaults set during implementation

Apply limits to:

- login attempts
- registration
- password reset requests
- upload URL creation
- post creation
- comment creation
- report submission
- contact form submission

## Deployment

V1 deployable pieces:

- Azure Static Web Apps for the static Vite web app
- Azure App Service for the Node-capable TypeScript API service
- Azure Database for PostgreSQL Flexible Server for managed PostgreSQL
- Azure Blob Storage

Deployment requirements:

- HTTPS
- static hosting/CDN for web
- Node runtime for API
- managed PostgreSQL
- environment variables for Azure Blob, Resend, Sentry, auth/session secrets
- web origins: `mytuums.com` and `www.mytuums.com`
- API origin: `api.mytuums.com`
- Azure Static Web Apps must fall back client routes to `index.html` so direct links do not 404
- auth routes are served from the API origin, not a separate auth subdomain
- credentialed CORS is allowed only from configured web origins

Deployment environments:

- `local`
- `staging`
- `production`

Per-PR cloud preview environments are deferred for v1.

Database migrations run as explicit CI/CD deployment steps against staging and production. The API does not run migrations on startup.

Runtime secrets live in Azure app settings. GitHub Actions environment secrets are used only for CI/CD deployment, migrations, and scheduled cleanup. `.env` files are never committed.

Commit `.env.example` files with non-secret placeholders as needed. Real `.env` files stay ignored.

Local development:

- Docker Compose runs infrastructure only
- local infra: PostgreSQL, Azurite, Mailpit
- apps run directly with package scripts through Turborepo
