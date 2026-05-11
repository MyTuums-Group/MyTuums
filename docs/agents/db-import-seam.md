# DB Import Seam

`packages/db` is infrastructure. It owns the Drizzle client, schema, migrations, and raw table definitions.

Application modules should not treat `@workspace/db` as their interface. Raw DB imports are allowed only where a module is implementing a persistence adapter or infrastructure integration.

This keeps query implementation local to adapters and keeps routers/service core modules coupled to behavioural interfaces instead of Drizzle tables.

## Allowed locations

- `packages/db/**`
- DB migrations, seeds, and Drizzle tooling under `packages/db/**`
- API auth infrastructure: `apps/api/src/auth.ts`, `apps/api/src/auth/**`
- API authorization infrastructure: `apps/api/src/authorization/**`
- API service adapters: `apps/api/src/services/**/*.adapter.ts`
- API production query adapters: `apps/api/src/services/**/production.ts`
- API production query adapters using explicit suffixes: `apps/api/src/services/**/*.production.ts`

## Disallowed locations

- `apps/web/**`
- API routers
- service core modules
- service policy modules
- service composition modules such as `apps/api/src/services/**/index.ts`
- shared contract/type/UI packages

If a service needs data, put the query behind an adapter interface and import the adapter only from the service composition module.

The web app must not import `@workspace/db`, alias it in Vite/TypeScript config, or point at `packages/db/src`. Browser code talks to the API contract, not to the database package.

## Verification

Run:

```bash
pnpm arch:check
```

The same check runs as part of `pnpm lint`, so CI enforces this seam through the existing lint job.
