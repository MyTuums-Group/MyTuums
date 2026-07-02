# ADR 0004: Mobile REST Facade Before oRPC/OpenAPI

## Status

Accepted

## Context

MyTuums v1 started as a web-first TypeScript product. The web app already consumes the API through tRPC, and the backend service layer owns the business rules, authorization, validation, and rate limiting.

The project now includes a targeted Flutter MVP for Android and iOS. Flutter is not a TypeScript client, so consuming tRPC directly would add coupling and tooling complexity before the mobile scope is stable.

## Decision

Add a versioned REST facade under `/api/mobile/v1` for the Flutter MVP.

The facade is intentionally thin:

- it maps mobile HTTP routes to the existing tRPC callers and services;
- it reuses the same authorization, validation, and rate-limit rules;
- it returns normalized REST errors in the shape `{ error: { code, message, details? } }`;
- it does not replace the existing tRPC API used by the web app.

Flutter targets Android and iOS only for this MVP.

## Consequences

The web app keeps using tRPC and does not migrate as part of this decision.

The mobile app gets stable, simple HTTP endpoints for authentication-adjacent app state, onboarding, feeds, posts, comments, likes, profiles, games, search, media upload intent handling, and reports.

oRPC/OpenAPI remains a future option for industrializing non-TypeScript clients after the MVP proves the mobile product shape. When adopted, it should be a deliberate contract-generation decision rather than a prerequisite for the first mobile slice.

Desktop Flutter, full mobile/web parity, admin/moderation mobile screens, notifications, advanced settings, account deletion, and app-store production hardening remain outside this MVP decision.
