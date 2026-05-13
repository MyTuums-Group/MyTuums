# Developer Docs Deployment

The developer documentation shell is deployed as a separate Azure Static Web App at `docs.mytuums.com`. It is only a reader shell: protected Markdown, navigation metadata, search entries, and tldraw snapshots are served by the API after the existing BetterAuth session is authorized as a verified active `admin` or `owner`.

## Static Web App

- App location: `apps/docs`
- Output location: `dist`
- API location: empty, because the API is the separate App Service at `api.mytuums.com`
- Custom domain: `docs.mytuums.com`
- Routing config: `apps/docs/public/staticwebapp.config.json` falls back client routes to `index.html`

The docs app build should receive:

- `VITE_DOCS_ENVIRONMENT`: `staging` or `production` for deployed environments
- `VITE_DOCS_SITE_URL`: the docs app origin, for production `https://docs.mytuums.com`
- `VITE_DOCS_API_BASE_URL`: the API origin, for production `https://api.mytuums.com`
- `VITE_DOCS_BUILD_SHA`: the deployed commit SHA
- `VITE_DOCS_BUILD_TIME`: the UTC build timestamp

## API Boundary

The API App Service must allow the docs origin in both credentialed CORS and BetterAuth trusted origins. Production defaults include `https://docs.mytuums.com`; if deployment overrides are set, include the docs origin explicitly:

- `DOCS_APP_URL=https://docs.mytuums.com`
- `WEB_APP_URL=https://mytuums.com`
- `BETTER_AUTH_TRUSTED_ORIGINS=https://mytuums.com,https://www.mytuums.com,https://docs.mytuums.com`

The docs tRPC client sends `credentials: "include"`, so the browser can reuse the API-origin BetterAuth session cookie when calling `/trpc` from the docs origin.

## CI Gate

CI runs `pnpm docs:validate` before the workspace build. That command compiles the `packages/docs-content` artifact and fails on manifest errors, broken links, invalid diagram snapshots, or search-index generation failures. The workspace build also runs the docs app and docs-content package builds through Turborepo.