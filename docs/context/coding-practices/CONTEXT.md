# Coding Practices Context

Read this document before changing monorepo boundaries, package responsibilities, service structure, shared validation, frontend theming, or testing/CI behavior.

## Monorepo Boundaries

- `apps/web` owns product UI composition and route-level user experience.
- `apps/api` owns the Fastify/tRPC host, auth routes, health checks, uploads, and narrow REST exceptions.
- `packages/db` owns Drizzle schema, migrations, and the database client only.
- `packages/ui` owns ShadCN primitives, design-system wrappers, and reusable low-domain UI only.
- `packages/api-contract` owns only tRPC router/client type wiring.
- `packages/types` owns stable cross-package domain/value types and shared constants only.
- Do not introduce catch-all shared utility packages.

## Service And Seam Rules

- Keep API routers thin; business rules belong in service modules.
- Centralize authorization, visibility, moderation, block, and account-status rules instead of reimplementing them in routes or components.
- The API owns canonical validation; frontend validation may mirror it for UX only.
- Prefer deep modules with small interfaces and explicit adapters at the seam.
- Raw `@workspace/db` imports are restricted; follow `docs/agents/db-import-seam.md`.
- Prefer idempotent commands and scheduled jobs over adding worker infrastructure unless the product scope changes.

## Frontend And Design Rules

- `DESIGN.md` is the canonical design system document.
- Do not replace the shipped ShadCN preset/theme unless product scope changes.
- `packages/ui` supplies primitives and design-system wrappers; product/domain composition stays in `apps/web`.
- Frontend form schemas can improve UX, but shared constants and API schemas remain canonical.

## Quality Bar

- `pnpm` is the canonical package manager.
- TypeScript is strict across packages.
- ESLint and Prettier are the linting/formatting baseline.
- Vitest covers unit/service/integration behavior; Playwright covers smoke/browser flows.
- CI must stay green before merge; see `docs/team-conventions.md`.

## Companion References

- `CONTEXT-MAP.md`
- `docs/prd/v1-scope.md`
- `docs/team-conventions.md`
- `docs/agents/db-import-seam.md`
- `DESIGN.md`
