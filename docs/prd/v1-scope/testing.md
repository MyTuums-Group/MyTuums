# V1 Testing Scope

This file is part of the authoritative MyTuums v1 scope. Start from [`../v1-scope.md`](../v1-scope.md) for the complete scope map.

V1 testing should focus on backend rules and critical user flows.

Backend tests:

- service tests for posts, media attachment rules, post/comment likes, follows, blocks, reports, moderation, auth guards
- integration tests against PostgreSQL for feeds and core queries
- local and CI integration tests use Docker Compose PostgreSQL rather than an in-memory/mock database
- notification tests for creation, dedupe, self-suppression, block suppression, dynamic hiding/read-count behavior, mark-read actions, and content-removal safety

Frontend/E2E:

- Playwright smoke tests against the real local stack
- use built web/API artifacts where feasible rather than dev servers
- use Docker Compose Postgres
- use Azurite for media flows where covered
- use Mailpit for auth email flows where covered

CI:

- GitHub Actions
- install dependencies
- typecheck
- lint
- unit/integration tests
- Drizzle migration/schema check
- minimal Playwright smoke suite
- build web and API

Production deployment requires all CI checks plus successful staging migration/deploy smoke before production promotion.
Production promotion requires manual approval through the GitHub Actions production environment after staging passes.

Minimal CI Playwright smoke:

- app boots
- register, email verification, onboarding, and login happy path through Mailpit
- create text-only post
- create one image-backed post through Azurite
- view post in feed/detail
- report/remove/visibility moderation smoke when the scaffold supports it
- notification badge/list happy path if the app scaffold exists
- basic auth guard check

Video upload E2E and media retry edge cases can stay local-only initially.
