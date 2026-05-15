# Azure Deployment

MyTuums v1 deploys the web app to Azure Static Web Apps, the API to Azure App Service, data to Azure Database for PostgreSQL Flexible Server, and media/game-cover blobs to Azure Blob Storage.

## Environments

- `local`: Docker Compose infrastructure, local Vite/API processes, Azurite, and Mailpit.
- `staging`: automatic deployment from `main` after migrations, app deployment, and smoke checks.
- `production`: manual approval through the GitHub `production` environment after staging succeeds, then migrations, deployment, and smoke checks.

## Required Azure Resources

- Azure Static Web Apps for `apps/web`.
- Azure App Service for `apps/api`, using Node 22.
- Azure Database for PostgreSQL Flexible Server.
- Azure Storage account with private Blob containers for `user-media` and `game-covers`.
- App settings for runtime secrets: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `WEB_APP_URL`, `DOCS_APP_URL`, `RESEND_API_KEY`, `SUPPORT_EMAIL`, `PRIVACY_EMAIL`, Azure Storage settings, `SENTRY_DSN`, `SENTRY_RELEASE`, `PUBLIC_SIGNUP_ENABLED`, and `MEDIA_UPLOADS_ENABLED`.

## GitHub Configuration

Create GitHub environments named `staging` and `production`. Configure required reviewers on `production` so promotion is manual.

Staging secrets and variables:

- `STAGING_DATABASE_URL`
- `STAGING_STATIC_WEB_APPS_API_TOKEN`
- `STAGING_API_PUBLISH_PROFILE`
- `STAGING_SENTRY_DSN`
- `STAGING_API_URL`, `STAGING_WEB_URL`, `STAGING_API_APP_NAME`

Production secrets and variables:

- `PRODUCTION_DATABASE_URL`
- `PRODUCTION_STATIC_WEB_APPS_API_TOKEN`
- `PRODUCTION_API_PUBLISH_PROFILE`
- `PRODUCTION_BETTER_AUTH_SECRET`
- `PRODUCTION_AZURE_STORAGE_CONNECTION_STRING`
- `PRODUCTION_AZURE_STORAGE_ACCOUNT_NAME`
- `PRODUCTION_AZURE_STORAGE_ACCOUNT_KEY`
- `PRODUCTION_SENTRY_DSN`
- `PRODUCTION_API_URL`, `PRODUCTION_WEB_URL`, `PRODUCTION_DOCS_URL`, `PRODUCTION_API_APP_NAME`

## Release Flow

PR CI runs typecheck, lint, Vitest, Drizzle checks, Playwright smoke, axe smoke, and builds. Merging to `main` starts the staging deployment workflow. Staging runs database migrations before deploy, deploys web and API, then checks the public web and API health routes. Production waits for the protected `production` environment approval, then repeats migration, deployment, and smoke checks.

## Scheduled Cleanup

The `Media Cleanup` workflow runs daily. It executes the idempotent API maintenance command that finds expired pending, unattached, deleted, and failed media, deletes eligible blobs, and removes cleaned rows.

## Monitoring

Sentry is enabled by setting `SENTRY_DSN` for the API and `VITE_SENTRY_DSN` for the web app. Both sides set environment and release tags, scrub PII from captured events, and do not enable session replay or behavioral analytics.
