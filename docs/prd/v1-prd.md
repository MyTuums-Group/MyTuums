# MyTuums v1 PRD

## Status

This PRD is intentionally compact. The split scope set that starts at [docs/prd/v1-scope.md](v1-scope.md) is the authoritative source for the complete v1 feature set, domain vocabulary, routes, invariants, exclusions, testing priorities, and launch gates.

Use this document to understand the product intent and release posture. Use the scope document to implement or review behavior.

## Problem Statement

Gamers need a focused place to share short gaming posts and clips, discover posts by game and people, and participate through lightweight social actions without the noise of livestreaming, private messaging, stat tracking, or recommendation-heavy media platforms.

MyTuums v1 must establish the smallest launchable product that supports public gamer identity, posting, discovery, engagement, reporting, and staff moderation while keeping architecture, data ownership, privacy, safety, and deployment boundaries clear enough for future growth.

## Product Intent

MyTuums v1 is a web-first social platform where users register with email and password, verify email, choose an immutable username, create a gaming-oriented profile, publish public text posts with optional image or video media, optionally tag posts with seeded games, browse chronological feeds, search users and games, follow and block people, comment, like, receive in-app notifications, report content, and rely on a moderation-focused admin workflow.

V1 remains deliberately narrow:

- Public posts only.
- Chronological feeds only.
- Seeded game catalog only.
- Reactive moderation only.
- In-app notifications only.
- Web app only.
- Azure-hosted production deployment.

## Scope Authority

Read [docs/prd/v1-scope.md](v1-scope.md) and its linked focused scope files for:

- Feature scope and exclusions.
- Domain vocabulary and entity boundaries.
- Auth, onboarding, profiles, posts, media, comments, feeds, search, notifications, reports, moderation, settings, account deletion, static pages, and docs app behavior.
- Legal/i18n launch gates and the current legal-readiness posture.
- Route conventions.
- Architecture, deployment, and package boundary expectations.
- Testing priorities and CI/release gates.

If this PRD and the v1 scope set disagree, the scope wins unless a later ADR explicitly supersedes it.

## Companion Documents

- [CONTEXT-MAP.md](../../CONTEXT-MAP.md) for the documentation reading order.
- [docs/prd/v1-scope.md](v1-scope.md) for the complete split v1 scope.
- [DESIGN.md](https://github.com/MyTuums-Group/MyTuums/blob/main/DESIGN.md) for the canonical visual system and UI guardrails.
- [docs/context/coding-practices/CONTEXT.md](../context/coding-practices/CONTEXT.md) for implementation guardrails and monorepo/package rules.
- [docs/context/legal/CONTEXT.md](../context/legal/CONTEXT.md) and [docs/prd/legal-i18n-prd.md](legal-i18n-prd.md) for legal, localization, and launch-readiness work that remains tracked through GitHub Issues.
- [docs/prd/developer-documentation-app-prd.md](developer-documentation-app-prd.md) for the separate docs web app.
- `docs/adr/` for durable architecture decisions.

## Release Posture

The product must be usable on desktop and mobile web, enforce the documented ShadCN preset/theme, and ship with enough safety, audit, test, and operational infrastructure to support public signup and media uploads only after launch gates are satisfied.

Public signup and media uploads remain blocked until owner bootstrap, at least one additional moderator/admin, verified Resend sender/domain setup, support mailbox routing, and launch-ready legal pages including Legal Notice are complete.

Legal/i18n work is not considered complete yet. The remaining implementation and review tasks are tracked in GitHub Issues.

## Architecture Priorities

Implementation should keep behavior behind a few deep modules with small interfaces:

- Authorization and visibility.
- Feed querying and cursor pagination.
- Media lifecycle and cleanup.
- Reporting, moderation cases, moderation actions, and audit.
- Account status and session invalidation.
- Search and normalization.

Routers should stay thin, service modules should own business rules, and cross-cutting product behavior should not be reimplemented per route or component.

## Testing Posture

Tests should verify externally observable behavior and domain invariants rather than private implementation shape.

CI and release gates should cover typecheck, lint, unit/integration tests, Drizzle migration/schema checks, web/API builds, Playwright smoke tests, axe smoke checks, staging migration/deploy smoke, and manual production approval.

## Out Of Scope

The full out-of-scope list lives in the split v1 scope set. In short, v1 does not include messaging, live streaming, recommendations, native mobile apps, paid features, third-party ads, push/realtime systems, Redis/RabbitMQ worker infrastructure, OAuth/social login, passkeys, two-factor authentication, post/comment editing, hashtags, mentions, reposts, bookmarks, private accounts, follower-list pages, or analytics dashboards.
