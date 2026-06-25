# MyTuums v1 Scope

MyTuums v1 is a web-first social platform for gamers to post, browse, and discuss short-form gaming content. The first release focuses on public posts, profiles, game-tagged discovery, and basic moderation. Messaging, live streaming, game tracking, native mobile apps, and recommendation systems are intentionally deferred.

## Authority

This file is the stable entry point for the authoritative v1 scope. The detailed scope is split into focused files under `docs/prd/v1-scope/`; those files are part of the same source of truth.

When documents disagree, prefer this scope set unless a later ADR explicitly overrides it.

## Companion Documents

- [CONTEXT-MAP.md](../../CONTEXT-MAP.md) for the documentation split and reading order.
- [DESIGN.md](https://github.com/MyTuums-Group/MyTuums/blob/main/DESIGN.md) for the canonical visual system and UI guardrails.
- [docs/context/coding-practices/CONTEXT.md](../context/coding-practices/CONTEXT.md) for implementation guardrails and monorepo/package rules.
- [docs/prd/developer-documentation-app-prd.md](developer-documentation-app-prd.md) for the separate docs web app.
- [docs/prd/legal-i18n-prd.md](legal-i18n-prd.md) for legal, localization, and launch-readiness detail.

## Scope Files

- [Product Context](v1-scope/product.md): product goal, target user, and v1 positioning.
- [Auth And Identity](v1-scope/auth-and-identity.md): authentication, onboarding, usernames, and profiles.
- [Posting And Media](v1-scope/posting-and-media.md): post composition, media upload, storage, visibility, display, and retention.
- [Feeds, Games, Search, And Public Previews](v1-scope/feeds-games-and-search.md): feed surfaces, seeded games, search, discover, and logged-out access.
- [Social Interactions And Notifications](v1-scope/social-and-notifications.md): comments, likes, follows, blocks, and notifications.
- [Account Settings And Deletion](v1-scope/account-settings-and-deletion.md): settings surfaces and irreversible account deletion behavior.
- [Moderation, Support, Accessibility, And Operations](v1-scope/moderation-support-and-operations.md): reporting, moderation, static/support pages, accessibility, analytics, and monitoring posture.
- [Architecture](v1-scope/architecture.md): monorepo, frontend, backend, rate limiting, and deployment rules.
- [Core Data Entities](v1-scope/data-entities.md): expected v1 entities and modeling boundaries.
- [Routes](v1-scope/routes.md): public, app, admin, static, and deferred routes.
- [Testing](v1-scope/testing.md): backend, frontend, CI, smoke, and release-gate testing expectations.
- [Deferred Major Features](v1-scope/deferred.md): feature areas explicitly out of scope for v1.

## Maintenance Rules

- Keep detailed behavior in the focused files rather than expanding this index again.
- Add new focused files only when a section becomes too large or has a distinct ownership boundary.
- Update [docs/docs-manifest.json](https://github.com/MyTuums-Group/MyTuums/blob/main/docs/docs-manifest.json) whenever scope files are added, moved, or removed.
- Keep [docs/prd/v1-prd.md](v1-prd.md) as a compact product summary that points back to this scope set.
