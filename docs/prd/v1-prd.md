# MyTuums v1 PRD

## Problem Statement

Gamers need a focused place to share short gaming posts and clips, discover posts by game and people, and participate through lightweight social actions without the noise of livestreaming, private messaging, stat tracking, or recommendation-heavy media platforms.

MyTuums v1 must establish the smallest launchable product that supports public gamer identity, posting, discovery, engagement, reporting, and staff moderation while keeping architecture, data ownership, privacy, safety, and deployment boundaries clear enough for future growth.

## Solution

Build a web-first social platform where users register with email and password, verify email, choose an immutable username, create a gaming-oriented profile, publish public text posts with optional image or video media, optionally tag posts with seeded games, browse chronological feeds, search users and games, follow and block people, comment, like, receive in-app notifications, report content, and rely on a moderation-focused admin workflow.

V1 is intentionally simple:

- Public posts only.
- Chronological feeds only.
- Seeded game catalog only.
- Reactive moderation only.
- In-app notifications only.
- Web app only.
- Azure-hosted production deployment.

The product must be usable on desktop and mobile web, enforce the documented ShadCN preset/theme, and ship with enough safety, audit, test, and operational infrastructure to support public signup and media uploads.

## User Stories

1. As a new gamer, I want to register with email and password, so that I can create a MyTuums account.
2. As a new gamer, I want to confirm I am at least 13, so that the platform can enforce its minimum-age requirement.
3. As a new gamer, I want to verify my email before onboarding, so that my account has a confirmed contact path.
4. As a verified user, I want to choose a unique username, so that other users can find my public profile.
5. As a verified user, I want reserved usernames to be blocked, so that platform, staff, legal, and impersonation-sensitive names are protected.
6. As a verified user, I want to add an optional display name, bio, avatar, and favorite games during onboarding, so that my profile reflects my gaming identity.
7. As an onboarded user, I want to land on the main feed's For You tab, so that I can start browsing immediately.
8. As a user with favorite games, I want For You to show latest posts tagged with those games, so that the feed reflects my gaming interests.
9. As a user without favorite games, I want For You to show global latest posts with a subtle prompt to add favorites, so that the app still feels active.
10. As a user whose favorite games have no posts yet, I want a clear empty state, so that I understand how to improve my feed.
11. As a user, I want a Following tab, so that I can see latest posts from people I follow.
12. As a user, I want Discover to show latest global posts, so that I can browse outside my favorite games and follows.
13. As a user, I want to search users and games from navigation, so that I can quickly jump to a profile or game page.
14. As a user, I want Discover search to preserve `q` and `game` URL state, so that I can share or revisit the same search/filter view.
15. As a user, I want search results to be predictable and not popularity-ranked, so that exact and prefix matches are easy to find.
16. As a user, I want search to hide blocked, suspended, and account-deleted users, so that I only see profiles I can open.
17. As a user, I want to view a game page, so that I can browse posts tagged with that game.
18. As a user, I want to add or remove favorite games from a game page or settings, so that I can shape my profile and For You feed.
19. As a user, I want seeded game metadata and rights-cleared cover images, so that game pages feel useful without relying on external hotlinks.
20. As a user, I want to create a text post, so that I can share a gaming thought or update.
21. As a user, I want to attach one image or short video to a post, so that I can share gameplay media.
22. As a user, I want to tag a post with one seeded game, so that it appears in game-specific discovery.
23. As a user, I want post text limits and validation to be clear before publishing, so that failed submissions are understandable.
24. As a user, I want URLs in posts and comments to auto-link safely only when explicitly typed with `http://` or `https://`, so that useful links work without unsafe schemes.
25. As a user, I want media upload progress, preview, retry, and remove controls, so that uploading feels reliable.
26. As a user, I want Post or Save to remain disabled until selected media is ready, so that broken media is not attached.
27. As a user, I want post creation from the main feed to insert my post at the top optimistically, so that publishing feels immediate.
28. As a user, I want game and profile surfaces to optimistically insert only eligible posts, so that filtered pages remain accurate.
29. As a user, I want to delete my own posts, so that I can remove content I no longer want public.
30. As a user, I want posts to be non-editable in v1, so that the product remains simple and audit behavior is clear.
31. As a viewer, I want post pages to use opaque public IDs, so that internal database IDs are not exposed.
32. As a viewer, I want feed pagination to be cursor-based and chronological, so that feeds remain stable without offset pagination.
33. As a viewer, I want images to fit constrained feed/detail frames and optionally open in a simple lightbox, so that media is readable without dominating the page.
34. As a viewer, I want videos to use native controls without autoplay, so that playback remains predictable.
35. As a user, I want to comment on a post, so that I can discuss gaming content.
36. As a user, I want comments to be flat and text-only, so that conversations stay simple.
37. As a user, I want to delete my own comments, so that I can remove something I posted.
38. As a viewer, I want comments sorted by like count with deterministic ties, so that higher-signal comments appear first.
39. As a user, I want to like and unlike posts, so that I can react to content.
40. As a user, I want to like and unlike comments, so that I can react to discussion.
41. As a user, I want self-likes to be allowed but not notify me, so that counts behave consistently without noisy notifications.
42. As a user, I want to follow another profile, so that their posts appear in my Following feed.
43. As a user, I want follower and following counts visible, so that profiles have lightweight social context.
44. As a user, I want private follower/following lists deferred, so that v1 focuses on core posting and discovery.
45. As a user, I want to block another user, so that I can prevent unwanted interaction.
46. As a user, I want blocking to remove follows in both directions, so that blocked relationships cannot continue as subscriptions.
47. As a user, I want blocked users hidden from logged-in feeds, search, profiles, and post pages where practical, so that the app respects my safety choice.
48. As a user, I want unblock not to restore removed follows, so that reconnecting is explicit.
49. As a user, I want in-app notifications for follows, likes, comments, comment likes, and content removals, so that I can see important activity.
50. As a user, I want notification rows to preserve history without exposing unsafe or hidden targets, so that the list remains useful and privacy-aware.
51. As a user, I want a notification bell with unread count and a notifications page, so that I can review activity.
52. As a user, I want mark-read and mark-all-read actions scoped to my own notifications, so that notification state is under my control.
53. As a logged-out visitor, I want to view limited public previews for profiles, posts, games, and static pages, so that shared links are useful.
54. As a logged-out visitor, I want feed browsing and actions to require login, so that the app protects participation surfaces.
55. As a user, I want a single settings page with profile, account, display, safety, and about tabs, so that account controls are easy to find.
56. As a user, I want to change display name, bio, avatar, banner, and favorite games in settings, so that I can maintain my profile.
57. As a user, I want system, light, and dark display theme options, so that the app respects my visual preference.
58. As a user, I want to view and manage my blocked users list, so that safety controls are visible.
59. As a user, I want to change or reset my password, so that I can keep my account secure.
60. As a user, I want to delete my account irreversibly, so that I can leave the platform.
61. As a user deleting my account, I want my public profile, posts, comments, follows, and public like counts removed promptly, so that my public presence disappears.
62. As a user deleting my account, I want email and username hold windows documented and enforced, so that reuse behavior is predictable.
63. As a future username claimant, I want deleted usernames released after 30 days, so that the namespace is not permanently exhausted.
64. As staff, I want historical audit and moderation references to use internal IDs, so that username reuse does not rebind history.
65. As a user, I want to submit the contact form while logged in or logged out, so that I can reach support.
66. As a logged-out contact submitter, I want to provide an email address, so that staff can respond.
67. As a user, I want legal, support, accessibility, cookies, privacy, terms, contact, and about pages, so that platform policies are available.
68. As a user, I want launch-ready Terms, Privacy, and Cookies before public signup and media uploads are enabled, so that policy coverage exists before riskier features open.
69. As a user, I want to report posts, comments, and profiles, so that I can flag unsafe or abusive content.
70. As a reporter, I want my report identity and notes hidden from normal users, so that reporting does not expose me publicly.
71. As a reporter, I accept not being notified of report resolution in v1, so that moderation scope stays focused.
72. As a moderator, I want reports grouped into moderation cases by target, so that repeated reports are handled together.
73. As a moderator, I want cases sorted by urgency and age, so that high-risk work is easier to prioritize.
74. As a moderator, I want to claim, reassign, unassign, dismiss, and action cases, so that staff workflow is trackable.
75. As a moderator, I want urgent priority derived from severe reasons or report volume, so that self-harm, illegal/dangerous, privacy, underage/safety, and high-volume reports surface quickly.
76. As a moderator, I want to remove and restore posts and comments, so that content policy can be enforced.
77. As a moderator, I want removed-content placeholders shown only to authors and staff, so that authors get a minimal explanation without exposing removed content.
78. As a content author, I want removal notifications to include only coarse public reason and support path, so that I understand the action without seeing private moderation details.
79. As a moderator, I want staff views to access hidden media through short-lived signed URLs, so that evidence can be reviewed without making blobs public.
80. As a moderator, I want moderation actions to require internal notes and audit records, so that decisions are accountable.
81. As a moderator, I want idempotent moderation actions and explicit conflict handling, so that retries and stale views do not corrupt state.
82. As an admin, I want a narrow moderation user search, so that I can inspect users for safety and account actions without building a CRM.
83. As an admin, I want role-appropriate access to email and role controls, so that account-level moderation and staff management are controlled.
84. As an owner, I want a unique owner role bootstrapped by a setup command, so that the first trusted administrator is created safely.
85. As an owner, I want public signup and media uploads blocked until owner plus another moderator/admin exist, so that public launch has staff coverage.
86. As an owner, I want to promote and demote moderators and admins with audit notes, so that staff access is controlled.
87. As an admin, I want to promote and demote moderators only, so that staff hierarchy is enforced.
88. As staff, I want role changes, suspensions, and demotions to take effect immediately across sessions, so that permissions are current.
89. As staff, I want demoted or suspended staff unassigned from open cases transactionally, so that case ownership remains valid.
90. As staff, I want suspension duration presets, so that account enforcement is consistent.
91. As a suspended user, I want to log in only to see account status, delete my account, and contact support, so that I understand my status without accessing the app.
92. As staff, I want confirmed underage users suspended indefinitely with public reason `underage`, so that the minimum-age rule is enforceable.
93. As a developer, I want a Turborepo monorepo with canonical package boundaries, so that web, API, db, UI, config, contract, and types responsibilities stay clear.
94. As a developer, I want strict TypeScript, ESLint, Prettier, Vitest, Playwright, and Drizzle checks in CI, so that quality gates are automatic.
95. As a developer, I want thin API routers and service modules for business rules, so that domain behavior is testable.
96. As a developer, I want centralized authorization, visibility, moderation, block, and account-status helpers, so that sensitive rules are consistent.
97. As a developer, I want API-owned validation schemas and shared constants, so that frontend validation improves UX while backend validation remains canonical.
98. As a developer, I want direct-to-blob uploads hidden behind a storage adapter, so that production Azure Blob and local Azurite are interchangeable.
99. As a developer, I want media records to be single-owner and single-purpose, so that media cannot be reused across unintended slots.
100. As a developer, I want private user-uploaded media with short-lived signed read URLs, so that visibility checks happen before media access.
101. As a developer, I want cleanup handled by idempotent commands and scheduled GitHub Actions, so that v1 avoids worker infrastructure.
102. As a developer, I want PostgreSQL-backed rate limiting behind a small module, so that v1 is production-safe without Redis and can swap later.
103. As a developer, I want PostgreSQL-backed search with `pg_trgm` and `unaccent`, so that user/game search works without an external search service.
104. As an operator, I want structured JSON API logs and Sentry exception monitoring, so that production failures can be diagnosed.
105. As an operator, I want no generic analytics event pipeline in v1, so that product counts, safety history, and operational events stay grounded in domain rows, audit rows, and logs.
106. As an operator, I want staging and production deployments with explicit migration steps, so that schema changes are controlled.
107. As an operator, I want production promotion gated by passing CI, staging smoke, and manual approval, so that releases are deliberate.
108. As an accessibility user, I want keyboard navigation, focus states, semantic controls, input labels, icon button names, and reduced-motion support, so that the app is usable with assistive technology.
109. As a tester, I want axe smoke checks plus manual keyboard/focus review for complex flows, so that accessibility is verified beyond component defaults.
110. As a launch owner, I want v1 exclusions explicit, so that implementation does not drift into messaging, streaming, recommendations, mobile apps, or analytics dashboards.

## Implementation Decisions

- Build MyTuums as a Turborepo monorepo using `pnpm`, strict TypeScript, ESLint, Prettier, Vitest, Playwright, and Drizzle migration/schema checks.
- Use `apps/web` for the React/Vite/TanStack Router web app and keep product composition there.
- Use `apps/api` for a TypeScript Fastify host with tRPC app procedures, BetterAuth routes, health checks, and narrow REST exceptions for browser/blob/provider flows.
- Use `packages/db` for Drizzle schema, migrations, and database client.
- Use `packages/ui` for ShadCN primitives, design-system wrappers, and low-domain reusable UI only.
- Use `packages/config` for shared environment validation and config helpers.
- Use `packages/api-contract` only for tRPC router/client type wiring.
- Use `packages/types` only for stable cross-package domain/value types and constants.
- Do not introduce a generic catch-all shared package.
- Initialize the frontend with the documented ShadCN preset command and do not replace the v1 theme unless product scope changes.
- Use React Query/tRPC for server state, Zustand only for genuine local client state, React Hook Form for forms, and API-owned validation as canonical.
- Keep API routers thin and put business rules in service modules.
- Extract deep, testable backend modules for account status/session invalidation, username policy, feed queries, search, media lifecycle, content publishing, comments, likes, follows, blocks, notifications, reporting, moderation cases/actions, role hierarchy, rate limiting, contact submissions, and account deletion.
- Centralize authorization and visibility policies for required session, staff access, block relationships, deleted/removed content, suspended/account-deleted users, moderation permissions, and public preview eligibility.
- Store `User` and `Profile` separately. `User` owns auth/account/security role and status; `Profile` owns public identity fields.
- Use immutable v1 usernames while an account is active. Release deleted emails after 3 days and deleted usernames after 30 days.
- Ensure historical audit, moderation, and notification references use internal IDs and never rebind deleted-user history to a later username holder.
- Use server-generated UUIDs internally and opaque public post IDs for `/post/{publicId}`.
- Keep all posts public-only. Require non-empty text, allow at most one media attachment, and allow one optional seeded game tag.
- Count post and comment text limits as trimmed Unicode grapheme clusters after line-ending normalization.
- Auto-link only explicit `http://` and `https://` URLs with safe external-link attributes.
- Make feeds chronological, cursor-paginated, ordered by `(createdAt, id)`, and expose opaque cursors only.
- Implement main feed For You and Following tabs exactly as documented: favorite-game filtering for users with favorites, global fallback only for users with no favorites, no ranking or recommendations.
- Implement Discover as logged-in global/manual browse plus user/game search, with `q` and `game` URL state.
- Implement game pages from a repo-versioned seeded game catalog. Game slugs are immutable once shipped, and inactive games remain viewable for existing tags unless removed for safety/legal reasons.
- Store rights-cleared game cover assets in a separate public Azure Blob container, distinct from private user media.
- Implement comments as flat text-only records sorted by like count descending with oldest-first deterministic ties.
- Use unique like rows and transactionally updated denormalized like counts for posts and comments.
- Use one-way follows only; do not add friend requests, private accounts, or follower/following list pages in v1.
- Implement blocks as safety relationships that remove follows, prevent blocked interactions, and mutually hide logged-in visibility where practical.
- Implement notifications as immutable PostgreSQL event records created synchronously with source actions. Store structured data and internal IDs; expose only safe route identifiers in API responses.
- Suppress self-notifications and notifications across block relationships. Hide blocked or otherwise unavailable notification rows dynamically and exclude them from unread counts.
- Implement direct browser-to-blob media uploads using signed upload URLs. The API validates declared MIME type and size, creates pending media, confirms blob existence/content type/size, then marks media ready.
- Keep media records single-owner and single-purpose. Purpose is immutable and limited to post attachment, profile avatar, and profile banner.
- Store user-uploaded media in one private Azure Blob container in production and Azurite locally, with opaque blob keys and no original filenames.
- Issue 15-minute signed read URLs only after applying parent visibility rules. Do not proxy normal playback through the API.
- Accept v1 public media upload risk without automated malware, CSAM, nudity, or policy scanning, per ADR 0002. Mitigate with reactive moderation, reports, rate limits, Terms, and fast staff removal.
- Use idempotent media cleanup commands rather than worker services. Production cleanup runs daily from scheduled GitHub Actions.
- Implement logged-out previews only for post, profile, game, auth, legal, support, contact, accessibility, cookies, privacy, terms, and about pages. Redirect logged-out `/` to login and block actions.
- Implement `/settings` as one page with Profile, Account, Display, Safety, and About tabs.
- Implement irreversible account deletion, not self-deactivation. Public visibility, social edges, and denormalized public counts update synchronously; blob cleanup remains scheduled.
- Implement contact submissions as minimal internal records plus Resend email delivery. They are not support tickets and have no user-facing dashboard.
- Implement report submission for visible posts, comments, and profiles. Reports attach to moderation cases grouped by target.
- Implement moderation cases with `open`, `reviewing`, `dismissed`, and `actioned` statuses, `normal` or `urgent` priority, assignee, grouped reports, and read-only timeline.
- Derive urgent case priority for self-harm, illegal/dangerous, privacy, underage/safety, or 3 unique reporters on the same target within 24 hours. Staff can adjust priority.
- Implement staff actions as append-only audited moderation actions requiring reason enums, public reasons when user-facing, and internal notes.
- Allow staff to remove/restore posts and comments. Staff cannot restore user-deleted content.
- Resolve profile reports through dismissal, content removal where relevant, or user suspension. Do not add separate profile removal or direct staff profile editing in v1.
- Implement unique owner role through an idempotent bootstrap CLI against an existing verified user and a one-time environment secret. Refuse to create a second owner.
- Block public signup and media uploads until owner plus at least one additional moderator/admin are configured.
- Enforce role hierarchy: moderators can suspend/unsuspend users; admins can manage users and moderators; owner can manage users, moderators, and admins. Nobody can suspend owner through v1 UI.
- Require role changes to be audited, immediate across sessions, and transactional with unassignment of open/reviewing cases when staff are demoted or suspended.
- Use suspension presets `24h`, `7d`, `30d`, and `indefinite`; restore temporary suspensions lazily through centralized account-status checks.
- Use PostgreSQL-backed rate limiting without Redis, with route-appropriate user, IP, and combined user/IP keys.
- Use PostgreSQL-backed normalized search fields plus `pg_trgm` and `unaccent`; do not add external search service or raw query analytics in v1.
- Use Resend for production transactional email and Mailpit locally. Send transactional mail from `MyTuums <noreply@mytuums.com>` and route support/contact to `support@mytuums.com`.
- Use Sentry only for frontend runtime errors and backend exceptions with environment/release tags and PII scrubbing. Do not use Sentry session replay or behavioral analytics.
- Deploy web to Azure Static Web Apps, API to Azure App Service, database to Azure Database for PostgreSQL Flexible Server, and media to Azure Blob Storage.
- Support `local`, `staging`, and `production` environments. Defer per-PR cloud previews.
- Run database migrations as explicit CI/CD deployment steps; the API does not run migrations on startup.
- Store runtime secrets in Azure app settings and deployment secrets in GitHub Actions environments. Never commit real `.env` files.


## Architecture Deepening

The codebase must be built around a small set of **deep modules** — modules where a large amount of behavior sits behind a small interface. This section defines the deepening priorities, their interfaces, and the seam discipline that every implementation slice must follow. Vocabulary: **module** (anything with an interface + implementation), **interface** (everything a caller must know — types, invariants, error modes, ordering), **depth** (leverage at the interface), **seam** (where an interface lives), **adapter** (a concrete thing satisfying an interface at a seam).

### P0 — Authorization & Visibility Module (deepest module in the codebase)

Every block check, suspension gate, staff-access rule, deleted-content filter, and public-preview eligibility check crosses a **single seam**. No service module, feed query, or API router implements its own visibility logic.

**Interface** (small — 3 entry points):
- `canView(viewer: ViewerContext, target: TargetRef) → boolean` — answers "can this viewer see this target?" for any entity type. Encapsulates all block relationships, suspension status, account deletion, staff overrides, and public preview rules.
- `filterVisible(viewer: ViewerContext, items: TargetRef[]) → TargetRef[]` — batch filter for feeds, search results, and lists.
- `getViewerContext(session) → ViewerContext` — resolves the viewer's role, blocks (both directions), and account status once per request. Every downstream call reuses this context.

**What lives behind this seam**: block relationship lookups (bidirectional), User.accountStatus checks (active/suspended/account_deleted), staff role checks, content deletion status (user-deleted vs moderation-removed), removed-content placeholder eligibility, and public preview allowlists. All in one place.

**Deletion test**: if you deleted this module, would visibility rules concentrate in a few places (pass-through) or scatter across 16+ service modules (earning its keep)? This module earns its keep — its implementation is large and its interface is tiny.

**Seam discipline**: One adapter for production. A second adapter (in-memory, pre-seeded with test state) for tests. Two adapters = real seam.

**Who depends on it**: feeds (#7), profiles (#4), posts (#5), comments (#8), search (#11), notifications (#10), engagement (#9), moderation (#14), account deletion (#17). No slice implements visibility independently — they all cross this seam.

### P1 — Feed Engine Module

Five feed surfaces (For You, Following, Discover, game page, profile page) share cursor pagination, chronological ordering, visibility filtering, and opaque cursor encoding. These are NOT five separate service functions with duplicated pagination logic.

**Interface**:
- `queryFeed(params: FeedParams) → FeedPage` — single entry point. `FeedParams` carries `eligibility` (which posts qualify), `viewer` (for visibility filtering), `cursor` (opaque), and `limit`. Returns `{ items: Post[], nextCursor: string | null }`.
- Each feed surface becomes an **eligibility adapter**: ForYouEligibility, FollowingEligibility, DiscoverEligibility, GamePageEligibility, ProfileEligibility. These adapters define *which* posts to query but share *how* to paginate, filter, and encode cursors.

**What lives behind this seam**: cursor encoding/decoding, `(createdAt, id)` ordering, visibility filtering (via Authorization module), limit enforcement, and optimistic insertion rules.

### P2 — Media Lifecycle Module

The media flow is a state machine. The interface is small; the implementation enforces all transitions internally.

**Interface**:
- `createUpload(owner, purpose, mimeType, byteSize) → PendingMedia`
- `confirmUpload(mediaId, actualSize, actualType) → ReadyMedia`
- `attachToTarget(mediaId, targetRef) → AttachedMedia`
- `abandonMedia(mediaId) → void`

**What lives behind this seam**: the full state machine (`pending → ready → attached`, with `failed` and `deleted` terminal states), signed URL issuance/reissuance, expiry enforcement (30min pending, 24h unattached), single-owner/single-purpose validation, MIME/size checks, and idempotency for confirmation retries. No route handler writes raw status transitions — they all cross this module.

### P3 — Moderation Module

Reports, cases, actions, and content removal live behind one seam. #13 (Reports) and #14 (Moderation) share this module — reports feed into the case engine; actions operate through it.

**Interface**:
- `submitReport(reporter, target, reason, notes) → Report`
- `getCase(caseId) → ModerationCase`
- `actionCase(actor, caseId, action, reason, internalNotes) → ModerationAction`
- `removeContent(actor, target, publicReason, internalNotes) → void`
- `restoreContent(actor, target, internalNotes) → void`

**What lives behind this seam**: report deduplication, case creation/grouping, priority derivation (self_harm/illegal/privacy/underage → urgent, 3+ reporters/24h → urgent), case assignment/reassignment, action audit trail, idempotency for same-state retries, conflict detection for stale state, notification creation for content removal, and staff-role permission enforcement.

### Package Depth Requirements

`packages/types` must NOT be a pass-through of Drizzle column types. It must export domain value objects with invariants: `Username` (3-20 chars, `[a-z0-9_]`, starts with letter, reserved-name check), `PostBody` (grapheme-counted, trimmed, max 500), `CommentBody` (max 300), `GameSlug` (immutable identifier). These types earn their keep — they carry validation and prevent invalid states at the type level.

`packages/api-contract` exports only tRPC router/client type wiring. This is a real seam: the contract defines the exact shape callers depend on. It's not a pass-through if it constrains what crosses the network boundary.

`packages/db` is expected to be shallow — it exposes Drizzle schemas, migrations, and a database client. Its interface mirrors its implementation by design. Do not put business logic, validation, or visibility rules here. Depth lives in the service modules that cross this seam.

### Build Order (Dependency Chain)

1. #1 (Repo bootstrap) → establishes package boundaries and tooling
2. #2 (Database) → Drizzle schemas for all entities
3. #19 (Authorization & Visibility) → implemented AFTER schema exists but BEFORE any feature that needs visibility rules. Every subsequent slice imports from this module instead of writing its own checks.
4. #3 (Auth), #4 (Profiles), #12 (Games) → can run in parallel once #2 and #19 exist
5. #5 (Posts), #6 (Media), #8 (Comments) → depend on #4
6. #7 (Feeds) → depends on #5, crosses the Feed Engine + Authorization seams
7. #9 (Engagement), #10 (Notifications), #11 (Search) → depend on #4, #5
8. #13 (Reports), #14 (Moderation) → share the ModerationModule, depend on #4, #5, #8
9. #15 (Staff roles), #16 (Settings), #17 (Account deletion), #18 (Static pages + deployment) → depend on earlier slices

No slice ships without crossing the Authorization seam. This is non-negotiable — it prevents the single biggest source of duplicated logic and divergent behavior in social platforms.

## Testing Decisions

- Tests should verify externally observable behavior and domain invariants, not internal implementation details or private function structure.
- Backend service tests should cover account status/session invalidation, username policy, posts, media attachment rules, post/comment likes, follows, blocks, notifications, reports, moderation, role hierarchy, account deletion, contact submissions, and auth guards.
- Integration tests should use Docker Compose PostgreSQL, not an in-memory or mock database, for feeds, search, transactions, migrations, and core queries.
- Search tests should cover minimum query length, case/accent normalization, alias matching, exact/prefix/contains ranking, deterministic ties, limits, eligibility filters, block filters, and rate limiting.
- Media tests should cover upload creation, MIME/size validation, signed URL lifecycle, idempotent confirmation, ready/attached transitions, single-owner/single-purpose rules, abandoned media, cleanup eligibility, signed read URL visibility, and staff access.
- Notification tests should cover creation, natural-key dedupe, self-suppression, block suppression, read state, dynamic hiding, unread counts, mark-read, mark-all-read, and content-removal safety.
- Moderation tests should cover report grouping, duplicate active reports, priority derivation, case assignment, dismiss/action flows, removal/restoration, suspension/unsuspension, conflict handling, role permissions, audit requirements, and notification creation/skips.
- Account deletion tests should cover login disablement, public visibility removal, follow removal, public like-count decrementing, hold windows, username reuse behavior, and internal ID preservation.
- Frontend tests should focus on route guards, forms, feed tabs, post composer behavior, media upload UI states, search typeahead keyboard behavior, Discover URL state, settings flows, report dialogs, notifications, and moderation smoke paths.
- Playwright smoke tests should run against built web/API artifacts where feasible with local PostgreSQL, Azurite, and Mailpit.
- Minimal Playwright smoke should cover app boot, registration, email verification, onboarding, login, text post creation, image-backed post creation through Azurite, feed/detail viewing, basic auth guards, notification badge/list behavior, and one moderation report/remove/visibility flow when scaffold support exists.
- CI must run dependency install, typecheck, lint, unit/integration tests, Drizzle migration/schema checks, minimal Playwright smoke, axe accessibility smoke checks, and web/API builds.
- Production deployment requires green CI plus successful staging migration/deploy smoke. Production promotion requires manual approval through the GitHub Actions production environment.
- Prior art in the current repo is documentation-only; implementation should establish these test patterns as the first executable baseline for the monorepo.

## Out of Scope

- Messaging.
- Discord/Slack-style conversations.
- Live streaming.
- Long-form video channels.
- Separate video pages.
- Game stats, tracking, achievements, playtime, imported libraries, ownership states, ratings, reviews, or release calendars.
- Third-party gaming account integrations.
- OAuth/social login.
- Passkeys.
- Two-factor authentication.
- Organizations or teams.
- Native mobile apps.
- Formal PWA support, offline mode, or push notifications.
- Redis.
- RabbitMQ.
- Go microservices.
- Worker services.
- WebSockets or realtime feeds/notifications.
- Video processing pipelines, transcoding, generated thumbnails, adaptive bitrate, captions/subtitles, video probing, or duration enforcement.
- Automated malware, CSAM, nudity, or policy scanning for media.
- Recommendations, personalized ranking, trending scores, or activity-based scoring.
- Hashtags.
- Mentions.
- Reposts or quote posts.
- Bookmarks or saves.
- Private accounts.
- Follower/following list pages.
- Creator verification.
- Pinned posts.
- Post/comment editing.
- Liked-by lists or liked-post profile pages.
- User media library.
- User-entered alt text.
- Crop editor or generated image variants.
- Post full-text search.
- Comment search.
- External search service.
- Recent search storage or raw query analytics.
- Game request flow.
- Game catalog admin UI.
- External game database API.
- `/games` catalog page.
- Email notifications.
- Push notifications.
- Notification preferences or settings route.
- Formal appeal system.
- Support ticket dashboard or user-facing ticket status.
- Account data export self-service.
- Analytics dashboard.
- Third-party ad/tracking pixels.
- Sentry session replay or behavioral analytics.
- Azure Application Insights custom telemetry unless scope changes.
- Per-PR cloud preview environments.

## Further Notes

- The authoritative detailed source design remains `docs/prd/v1-scope.md`; this PRD summarizes it into an implementation-driving product requirements document.
- ADR 0001 governs deleted username release after 30 days and deleted email release after 3 days.
- ADR 0002 governs the accepted v1 risk of launching public media uploads without automated scanning.
- Public signup and media uploads must remain disabled until owner bootstrap, at least one additional moderator/admin, verified Resend sender/domain setup, support mailbox routing, and launch-ready legal pages are complete.
- Accessibility is an app-level requirement even when ShadCN/Radix primitives are used.
- V1 is English-only, but implementation should avoid formatting and copy architecture that blocks later i18n.
