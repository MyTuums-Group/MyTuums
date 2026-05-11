# MyTuums Context

## Product

MyTuums v1 is a web-first social platform for gamers to post, browse, and discuss short-form gaming content.

The MVP focuses on public posts, profiles, game-tagged discovery, follows, comments, likes, reporting, and basic moderation. It is intentionally not a messaging app, livestreaming platform, game tracker, recommendation system, or native mobile app in v1.

The core user journey is:

1. A user signs up with email and password.
2. The user verifies email and chooses a unique username.
3. The user creates a gaming-oriented profile.
4. The user posts text, optionally with an image or short video clip.
5. The user optionally tags a post with a seeded game.
6. The user browses the main feed's For You and Following tabs, plus Discover, game, and profile feeds.
7. The user comments, likes, reports, and can be moderated by moderators, admins, or the owner.

## Domain Vocabulary

- **User**: Auth/account/security record. Owns role and account status.
- **Profile**: Public identity record for a user. Owns username, display name, bio, avatar, banner, and favorite games.
- **Username**: Immutable v1 handle used in `/@{username}` routes while an account is active. Lowercase, globally unique, 3-20 characters, starts with a letter, and uses only lowercase letters, numbers, and underscores.
- **Display name**: Optional non-unique profile name, max 40 characters. Falls back to username when absent.
- **Post**: Public-only user content with required text, one optional media attachment, and one optional game tag.
- **Public post ID**: Opaque ID used in `/post/{publicId}` URLs. Do not expose internal database IDs in public post routes.
- **Media**: Uploaded image or video blob tracked by the API. A post can reference only media that is ready.
- **Game**: Seeded internal catalog entry used for post tags, game pages, and favorite games.
- **Game tag**: Optional post association to one seeded game. V1 does not support free-text game tags.
- **Favorite game**: User-selected game displayed on a profile. Users can select up to 5.
- **Comment**: Flat text-only comment on a post, sorted by like count descending with oldest-first ties; pagination may shift as likes change.
- **Post like**: Reaction to a post.
- **Comment like**: Reaction to a comment that can notify the comment author and affects comment ordering.
- **Follow**: One-way user subscription. There are no friend requests, private accounts, or approval flows in v1.
- **Block**: Safety relationship that removes follows and prevents blocked interactions where practical.
- **Notification**: Immutable in-app event record for follows, post likes, comments on your post, comment likes, or content removals.
- **Report**: User-submitted moderation signal for a post, comment, or profile.
- **Moderation case**: Staff workflow record that groups reports for one target and tracks status, assignee, priority, and resolution.
- **Moderation action**: Staff audit event with actor, action, target, reason, notes, and timestamp.
- **Contact submission**: Internal support/contact record created from the `/contact` form and emailed to staff.

## Product Boundaries

V1 includes:

- Email/password auth with email verification, password reset, sessions, 13+ confirmation, and roles: `user`, `moderator`, `admin`, `owner`.
- Public signup is open in v1; invite codes and waitlists are out of scope.
- Public signup and media uploads require owner bootstrap plus at least one additional moderator/admin configured first.
- 13+ confirmation is captured with a required checkbox and stored confirmation timestamp; v1 does not collect birthdates.
- Browser auth uses secure httpOnly cookie sessions from the API origin; v1 does not store bearer auth tokens in localStorage.
- Passwords must be 8-128 characters; v1 does not require composition rules such as symbols, digits, or uppercase letters.
- Normal sessions are 30-day rolling sessions and are invalidated immediately for suspension, account deletion, password change, and permission-changing role changes.
- Required onboarding username, with optional display name, bio, avatar, and up to 5 favorite games.
- Public posts with required text, max 500 visible characters, and at most one image or video.
- Chronological cursor-paginated feeds for main For You/Following tabs, Discover, game pages, and profiles.
- Seeded game catalog, game pages, and favorite games.
- The v1 game catalog is curated seed data versioned in the repo and applied by a repeatable seed command/migration.
- Game slugs are immutable once shipped; game names, descriptions, aliases, and metadata may change.
- Game cover images, when present, must be rights-cleared assets; v1 does not hotlink external game box art.
- Game cover assets live in a separate Azure Blob public container with cache headers, no CDN initially, and are distinct from private user media.
- Inactive games cannot be newly selected or returned in normal game search, but existing tagged posts keep their tag and `/game/{slug}` remains viewable unless removed for safety/legal reasons.
- Flat comments with max 300 characters, ordered by comment likes.
- Post likes, comment likes, one-way follows, blocks, in-app notifications, search for users/games, settings, static legal/support pages, reports, and moderation.
- Rate-limited contact form submissions stored as minimal internal records and sent through Resend.
- `/contact` is public. Logged-out submitters provide an email address; authenticated submitters can be linked by `userId`.
- Responsive web UI.
- V1 is English-only, while avoiding formatting/copy architecture that blocks later i18n.

V1 excludes:

- Messaging, live streaming, long-form video features, game stats/tracking, third-party gaming account integrations, imported libraries, recommendations, trending algorithms, hashtags, mentions, reposts, bookmarks, private accounts, follower/following list pages, post/comment editing, native mobile apps, PWA/offline/push notifications, Redis, RabbitMQ, Go microservices, workers, WebSockets, and video processing pipelines.

## Architecture Notes

MyTuums is a Turborepo monorepo.

`pnpm` is the canonical package manager and should be enforced through package metadata and CI.

ESLint is used for TypeScript/React linting and Prettier for formatting.

TypeScript is strict across all packages and CI fails on typecheck errors.

Vitest is used for unit/service/integration tests; Playwright is used for browser smoke tests.

Canonical initial structure:

- `apps/web`: React + Vite web app.
- `apps/api`: TypeScript Fastify API server hosting tRPC plus auth/health/upload routes.
- `packages/db`: Drizzle schema, migrations, and database client.
- `packages/ui`: ShadCN-based shared UI components.
- `packages/config`: Shared environment validation and config helpers.
- `packages/api-contract`: Shared tRPC types/client helpers.
- `packages/types`: Cross-package domain/value types.
- `packages/api-contract` exports only tRPC router/client type wiring.
- `packages/types` exports stable cross-package domain/value types and shared constants only.
- Neither package may contain service logic, DB clients, React components, or catch-all utilities.
- `packages/ui` contains ShadCN primitives, design-system wrappers, and reusable low-domain components only; product/domain composition stays in `apps/web`.
- Raw `@workspace/db` imports are restricted to DB package internals, migrations/seeds/tooling, API auth/authorization infrastructure, and persistence adapter modules. Routers, web code, service core modules, service policy modules, service composition modules, and shared packages must go through service/adapter seams instead. See `docs/agents/db-import-seam.md`.

Frontend stack:

- React
- Vite
- TanStack Router
- Tailwind CSS
- ShadCN/Radix
- tRPC React Query/TanStack Query for server state
- Zustand only where local client state is genuinely needed
- React Hook Form for forms, with Zod schemas/constants mirrored for UX where useful; API validation remains canonical.

Frontend theme guardrail:

- The v1 visual theme is defined by the chosen ShadCN preset/theme. Coders and agents should not override or replace that theme unless the product scope explicitly changes.
- The documented ShadCN init command is the canonical scaffold instruction, not an example.

Backend stack:

- TypeScript
- Fastify as the API HTTP host
- tRPC
- BetterAuth
- Drizzle ORM
- PostgreSQL
- Azure Blob Storage in production
- Azurite for local blob storage
- Resend for production transactional email
- Mailpit for local email testing
- Sentry for error monitoring

Email conventions:

- Transactional email sends from `MyTuums <noreply@mytuums.com>`.
- Support/contact email routes to `support@mytuums.com`.
- Resend domain/sender verification and support mailbox routing must be confirmed before public signup and media uploads are enabled.

Deployment stack:

- Azure Static Web Apps for the Vite web app.
- Azure App Service for the Node-capable TypeScript API.
- Azure Database for PostgreSQL Flexible Server for managed PostgreSQL.
- Azure Blob Storage for production media.
- V1 supports `local`, `staging`, and `production` environments; per-PR cloud preview environments are deferred.
- Database migrations run as explicit CI/CD deployment steps against staging and production; the API does not run migrations on startup.
- Runtime secrets live in Azure app settings. GitHub Actions environment secrets are used only for CI/CD deployment, migrations, and scheduled cleanup. `.env` files are never committed.
- Commit `.env.example` files with non-secret placeholders as needed; real `.env` files stay ignored.

Public origin conventions:

- The web app lives at `mytuums.com` and `www.mytuums.com`.
- The API lives at `api.mytuums.com`.
- Azure Static Web Apps must fall back client routes to `index.html` so direct links do not 404.
- Auth routes live under the API origin; v1 does not use a separate auth subdomain.
- Credentialed CORS is allowed only from configured web origins.

Backend rules:

- Keep the API stateless.
- API route prefixes are canonical: `/trpc` for app procedures, `/auth/*` for auth routes, `/healthz` for platform health, and narrow REST exceptions only where browser/blob/provider flows require them.
- Do not use local file storage for production media.
- Do not rely on in-memory production sessions, rate limits, or process-local state for correctness.
- Keep routers thin; put business rules in service modules.
- Use centralized authorization helpers or policies for auth, admin/moderator access, blocks, deleted/removed content, suspended/account-deleted users, content visibility, and moderation permissions.
- The API owns canonical validation schemas. Frontend form schemas may exist for user experience, but shared constants should define limits and allowlists.
- Rate limits use route-appropriate keys: user ID for logged-in actions, IP for logged-out/auth/contact actions, and combined user/IP keys for high-abuse actions such as uploads and reports.
- Upload and search limits are product-specified; other rate-limit thresholds use conservative config defaults set during implementation.

## Core Entities

Expected v1 entities:

- `User`
- BetterAuth auth/session tables
- `Profile`
- `Post`
- `Media`
- `Comment`
- `PostLike`
- `CommentLike`
- `Follow`
- `Block`
- `Game`
- `FavoriteGame`
- `Notification`
- `Report`
- `ModerationCase`
- `ModerationAction`
- `RoleChangeAudit`, or role-change entries in `ModerationAction`
- `RateLimit`
- `ContactSubmission`

Keep `User` and `Profile` separate:

- `User`: auth/account/security fields, role, and status.
- `Profile`: username, display name, bio, avatar media, banner media, and favorite games.

Do not introduce v1 entities for messages, streams, videos as separate domain objects, activity feeds, bookmarks, hashtags, mentions, game requests, user game libraries, follower list materialization, or recommendation event streams unless the v1 scope changes.

## Feed And Visibility Rules

- All feeds are chronological and cursor-paginated.
- Feed ordering is by `(createdAt, id)`.
- Feed cursors are opaque to clients.
- Internal primary keys are server-generated UUIDs. Public post routes use separate opaque public IDs.
- Do not use offset pagination for feeds.
- `/` is the main consumption feed with `For You` and `Following` tabs.
- `For You` is the default tab. If the viewer has favorite games, it shows latest posts tagged with those games, including matching posts from followed users. If the viewer has no favorite games, it falls back to global latest posts, including untagged posts, with a prompt to add favorite games.
- If a viewer has favorite games but no matching posts, `For You` shows an empty/setup state rather than falling back to global latest posts.
- If a viewer has no favorite games, `For You` may show a dismissible add-favorites prompt; the prompt should not nag across unrelated routes.
- `Following` shows latest posts from followed users only.
- Discover is a logged-in search-and-browse hub that shows latest public posts from everyone, including untagged posts, with manual user/game search and game filtering. It is intentionally not personalized in v1.
- Game pages show latest public posts tagged with that game.
- Profile pages show latest public posts by that user.
- After onboarding, users land on `/` with `For You` selected.
- Main feed post creation may optimistically insert the new post even if it does not match the normal feed query; Discover, game, and profile surfaces only optimistically insert eligible posts.
- Posts are public-only in v1.
- Deleted, removed, suspended, account-deleted, and blocked content should be hidden where practical.
- Logged-out users can view only limited public detail/static pages, not feed browsing or actions.
- Logged-out public previews can show public counts such as likes, comments, followers, and following; actions require login.

## Search Rules

- Search is authenticated-only in v1. Logged-out public pages do not expose the search box.
- V1 app search covers users and games only. Post full-text search, comment search, hashtag search, and external search services are deferred.
- The app has both a persistent logged-in nav search entry and a full `/discover` search surface. Nav search shows compact typeahead results and routes broader searches to `/discover?q={query}`.
- Discover owns full search-and-browse behavior. Its URL state uses `q` for search text and `game` for the selected game slug.
- Search queries users by username/display name and active seeded games by name plus curated aliases/acronyms.
- Search matching is case-insensitive, accent-insensitive for display names and game names, substring-based, and ranked by exact/prefix matches before contains matches. Ties are deterministic and alphabetic, not popularity-based or personalized.
- Normal search returns only entities the viewer can open: active/non-suspended/non-account-deleted profiles, block-filtered user results, and active seeded games.
- Game search result primary actions navigate to `/game/{slug}`. Discover separately offers explicit game filtering for the posts feed.
- Search should use PostgreSQL-backed normalized search fields with trigram indexing rather than an external search service in v1.
- PostgreSQL search requires migration-managed `pg_trgm` and `unaccent` extensions.
- Search does not store recent searches or raw query analytics in v1.

## Media Rules

- Browser uploads directly to blob storage using signed upload URLs.
- Media records are single-owner and single-purpose. Purpose is declared at upload creation and is immutable.
- A media record can attach to exactly one target slot, such as `post.attachment`, `profile.avatar`, or `profile.banner`.
- The API validates declared MIME type and size before creating an upload. Original filenames are not stored.
- The API creates pending media records, verifies blob existence plus uploaded size/content type, and marks media ready.
- Pending uploads expire after 30 minutes. Signed upload URLs last 15 minutes and can be reissued for the same unexpired pending media.
- Signed upload URLs are scoped to one server-generated blob. Pending media can be overwritten for retry, but ready media is immutable.
- Upload confirmation is idempotent. Ready but unattached media is eligible for cleanup after 24 hours unless it is retained profile media history.
- A post can reference only ready media owned by the posting user. Post creation attaches ready media atomically.
- Production storage is Azure Blob Storage; local development uses Azurite.
- User-uploaded media blobs live in one private container with opaque server-generated blob keys.
- Blobs are private. API responses include 15-minute signed read URLs only after applying parent content visibility rules.
- Normal playback should not be proxied through the API.
- Direct Azure Blob signed URLs are used in v1; no CDN is required for launch.
- Blob responses should be served inline with private browser-oriented caching and without original filenames.
- Media upload creation is rate limited to 30 requests per hour per authenticated user.
- Media statuses stay small: `pending`, `ready`, `attached`, `failed`, and `deleted`.
- Removing media before save marks it abandoned; cleanup is handled by an idempotent maintenance command, not a worker service.
- Production media cleanup runs daily from a scheduled GitHub Actions workflow using the idempotent cleanup CLI.

Post media limits:

- Images: JPEG, PNG, WebP, max 10 MB.
- Videos: MP4, WebM, max 100 MB.
- One media attachment per post.
- Validation is limited to MIME type and byte size in v1; image dimensions and video duration are not enforced.

V1 does not include transcoding, generated thumbnails, adaptive bitrate, video probing, duration enforcement, live streaming, captions/subtitles, or autoplaying feed videos.

V1 media UX and retention rules:

- Videos use native controls, metadata preload, and no autoplay. V1 has no generated or user-supplied video posters.
- Upload UI shows a local preview and progress immediately, but Post/Save remains disabled until media is ready. Failed uploads stay visible with Retry/Remove actions.
- V1 supports file picker and drag-and-drop uploads. Mobile relies on the native browser file picker/camera behavior; paste-to-upload and custom camera capture are deferred.
- Avatars/banners use UI fallbacks when absent and CSS object-fit/object-position when present; v1 has no crop editor.
- Feed media uses constrained frames. Post images can open in a simple accessible lightbox; videos remain inline with native controls. V1 has no explicit media download UI.
- V1 stores and serves original uploads only; it does not create resized image variants.
- Image metadata such as EXIF is accepted as part of original uploads; upload UX/privacy copy should warn users.
- V1 does not ask users for alt text. Use generic context-specific accessible labels for images and native accessible video controls.
- Previous avatars and banners are retained as internal-only profile media history until account deletion, not exposed as a user media library.
- User-deleted post media is hidden immediately and retained for 90 days before cleanup unless held for moderation/legal reasons.
- Moderation-removed media is retained as evidence while the moderation record requires it.
- Account-deleted media blobs are cleaned up within 24 hours unless under moderation/legal hold.
- V1 accepts the launch risk of public media uploads without automated safety scanning. Controls are reactive moderation, reports, rate limits, clear Terms, and fast staff removal. Staff access uses the same short-lived signed read URL mechanism; only staff actions are audited, not every media view.

## Moderation And Safety Rules

- Reporting requires login and is available only for currently visible targets.
- Users can report posts, comments, and profiles.
- Reports are not anonymous internally; reporter identity and notes are visible only to staff.
- Reports attach to moderation cases grouped by target.
- Moderation cases use `open`, `reviewing`, `dismissed`, and `actioned` statuses. Cases can be claimed, reassigned, unassigned, and sorted by priority.
- Cases default to urgent for `self_harm`, `illegal_or_dangerous`, `privacy`, `underage_or_safety`, or high report volume. High volume means 3 unique reporters on the same target within 24 hours. Staff can manually adjust priority.
- Moderation actions require reason enums, public reasons when user-facing, internal notes, and append-only audit records.
- User-facing public reasons are coarse categories; detailed internal reasons and notes stay private.
- Confirmed underage users receive an indefinite suspension with public reason `underage`.
- Internal notes are required for dismissals, removals, restorations, suspensions, unsuspensions, and role changes.
- Moderation actions are idempotent for same-state retries and use explicit conflict handling for targets changed since staff loaded them; allowed conflict overrides are audited.
- Admin UI is moderation-focused in v1.
- A unique `owner` role exists. The owner is bootstrapped by a safe setup command against an existing verified user, not by manual SQL or normal UI.
- Public signup and media uploads should not be enabled until the owner and at least one additional moderator/admin are configured.
- Owner bootstrap is an idempotent CLI requiring a verified user email and one-time environment secret; it refuses to create a second owner.
- Owner can promote/demote admins and moderators. Admins can promote/demote moderators. Moderators cannot change roles. Owner transfer/removal is out of scope for the v1 UI.
- Owner account deletion is blocked in v1 because owner transfer/removal is out of scope.
- Moderators and admins must be demoted to `user` before they can self-delete.
- Staff role changes are audited and require internal notes. Role changes and suspensions take effect immediately across active sessions.
- Demoting staff automatically unassigns their open/reviewing moderation cases in the same transaction.
- Suspending staff automatically unassigns their open/reviewing moderation cases in the same transaction.
- Suspensions use preset durations `24h`, `7d`, `30d`, or `indefinite`. Suspended users may log in only to see account status, delete their account, and access support/contact.
- Temporary suspensions restore access and public visibility lazily after expiry through a centralized account-status helper, unless content was separately removed or deleted.
- Moderators, admins, and owner can remove and restore posts and comments.
- Moderators can suspend/unsuspend normal `user` accounts only. Admins can suspend/unsuspend users and moderators. Owner can suspend/unsuspend users, moderators, and admins.
- Staff cannot directly edit user profile fields.
- Profile reports are resolved by dismissal, post/comment removal where relevant, or user suspension; v1 does not include profile removal as a separate moderation action.
- Moderation-removed content is hidden from normal users, but its author and staff can see a removed placeholder with the public reason category.
- Removed-content placeholders for authors show target type, public reason, timestamp, and support/contact path only; removed text/media is visible only to staff in moderation context.
- Author-facing removed placeholders remain only while the author account exists and the content has not been self-deleted.
- Removed content placeholder routes are available only to the author and staff; normal users see unavailable, and the app provides no share UI for removed content.
- Post/comment removals notify the author with minimal information. Report resolution does not notify reporters in v1.
- Staff action on already user-deleted content is audited but does not create a user-facing content-removal notification.
- Comment removal under an unavailable parent post is audited, but not user-notified unless the comment would otherwise be visible to its author.
- Moderation audit/case timelines record whether a content-removal notification was created, skipped, or failed, with reason.
- If a required content-removal notification cannot be created in the same transaction, the moderation action fails; defined notification skips are allowed.
- Restoring removed content does not delete or replace the historical removal notification; its target reflects current restored/visible state.
- If a user self-deletes removed content, the prior removal notification remains database history but is hidden, excluded from unread counts, and marked read when detected.
- V1 does not include a formal appeal system. Removed or suspended users are directed to the general support/contact flow.

Blocking rules:

- Existing follow relationships in both directions between blocker and blocked user are removed.
- A blocked user cannot follow, like the blocker's posts/comments, or comment on the blocker's posts.
- Logged-in block visibility is mutual: neither user can view the other's profile/post pages or see the other in feeds/search where practical.
- Prior comments from the blocked user are hidden from normal views where practical; prior post/comment likes remain counted.
- Old notification rows remain as database history, but notifications involving blocked or otherwise hidden actors/targets are hidden from the user's list, excluded from unread counts, and marked read when detected.
- Unblocking does not restore removed follow relationships.
- Logged-out public access around blocking is a known v1 limitation.

## Notification Rules

- V1 notifications are in-app only, stored in PostgreSQL, and delivered by polling/refresh rather than realtime push.
- V1 notification types are `follow`, `post_like`, `post_comment`, `comment_like`, and `content_removed`.
- Notifications are immutable event records created synchronously in the same database transaction as the source action.
- Self-generated user actions do not create notifications.
- Notification creation is suppressed when either side has blocked the other.
- Follow, post-like, and comment-like notifications use natural-key dedupe; comment notifications are one per comment; content-removal notifications are one per moderation action/content target.
- Undoing follows or likes does not remove or unread-reset the historical notification.
- Notification rows store stable internal IDs using explicit nullable foreign-key columns rather than unconstrained polymorphic IDs; API responses expose only safe public route identifiers.
- Removal notification API responses do not expose moderation action IDs or case IDs.
- Notification rows store structured type/data, not generated display text; clients render text from current safe data.
- Recipient account deletion deletes recipient-owned notifications; actor/target hard deletion leaves the row as hidden database history.
- The authenticated app shows a notification bell with an unread badge and a `/notifications` page. The badge polls while the tab is visible.
- There are no email notifications, push notifications, realtime delivery, notification preferences, notification snippets, or notification settings route in v1.

## Route Conventions

Public/auth routes:

- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`
- Email verification route as required by BetterAuth

Logged-in app routes:

- `/`
- `/discover`
- `/post/{publicId}`
- `/@{username}`
- `/game/{slug}`
- `/notifications`
- `/settings`

Admin routes:

- `/admin`
- `/admin/reports`
- `/admin/users`
- `/admin/users/{id}`

Static routes:

- `/terms`
- `/privacy`
- `/cookies`
- `/accessibility`
- `/support`
- `/contact`
- `/about`

## Invariants

- MyTuums is handle-first, not real-name-first.
- Users must verify email and choose a username before entering the main app.
- Unverified users cannot reserve usernames; username reservation happens only after verified-email onboarding submit.
- Reserved usernames are enforced from a repo-versioned reserved-name list after lowercase normalization.
- Usernames are immutable in v1.
- Account deletion holds the deleted email for 3 days and the deleted username for 30 days, then releases them for reuse.
- `/@{username}` resolves to the current username holder only; historical and moderation references must use internal IDs, not username rebinding.
- Account-deleted internal rows are retained indefinitely for audit/moderation with PII minimized after deletion hold windows.
- Account deletion removes public social edges: follows are removed and the deleted user's post/comment likes no longer count publicly.
- Account deletion updates public visibility and denormalized counts synchronously; blob cleanup remains scheduled.
- Timestamps are stored in UTC and exposed as ISO strings; feeds use relative display, while detail/admin views can show local absolute times.
- Posts are public-only in v1.
- New posts and attached media publish immediately after validation; v1 uses reactive moderation rather than pre-publication review.
- Posts require non-empty text after trimming. Media-only and tag-only posts are invalid.
- Post and comment length limits count trimmed Unicode grapheme clusters; auto-linked URLs count as their typed text.
- Auto-linking only links explicit `http://` and `https://` URLs; bare domains, email addresses, and unsafe schemes stay plain text.
- Posts and comments cannot be edited in v1.
- Users can delete their own posts and comments. Self-delete is separate from moderation removal and cannot be restored by staff.
- User-deleted posts/comments are not restorable by the user in v1.
- User-deleted posts/comments disappear from all normal user views, including the author's, and remain visible only in staff moderation context where needed.
- User-deleted content is accessible only through staff moderation context; public routes return unavailable.
- Self-likes are allowed, but liking your own post does not create a notification.
- Post and comment `likeCount` values are denormalized on target rows and updated transactionally with unique like rows.
- Post `commentCount` is denormalized on posts, counts globally visible comments only, excludes user-deleted/moderation-removed comments, and is not viewer-specific for blocks.
- Users can select no more than 5 favorite games.
- Game tags must come from the seeded game catalog.
- The main feed defaults to For You. For You uses favorite-game tags as a simple chronological taste signal, not ranking.
- No v1 feed uses ranking algorithms, trending scores, real-time updates, Redis fanout, or activity-based scoring.
- Discover is logged-in only and intentionally global/manual in v1.
- Search is logged-in only, explicit to users/games, and does not search posts/comments in v1.
- Public profile, post, and game pages provide shareable logged-out previews with best-effort indexing only; rich dynamic SEO/social metadata and HTTP-status-level unavailable SEO semantics are deferred.
- Legal/support links should always appear in the footer.
- Real launch-ready Terms, Privacy, and Cookies pages are required before public signup and media uploads are enabled.
- V1 content/community rules live in `/terms` and `/support`; there is no separate guidelines page.
- Accessibility is an app-level requirement, even when using ShadCN/Radix primitives.
- CI includes axe accessibility smoke checks on key pages; complex flows still require manual keyboard/focus review.
- Sentry is for error monitoring only in v1; no session replay or behavioral analytics through Sentry.
- V1 has no generic analytics event pipeline/table; product counts come from domain rows, safety history from audit rows, and operational events from structured logs.
- API logs are structured JSON to stdout/stderr and collected by Azure App Service; Sentry remains exception monitoring only.
- Contact submissions are not support tickets; v1 has no user-facing ticket status or support dashboard.
- Contact submissions store minimal support/audit fields and are retained for 180 days before deletion/anonymization.
- Contact submission categories are `account_access`, `moderation_or_safety`, `privacy_or_data`, `bug_report`, `general_support`, and `other`.
- Contact submissions require a category, cap email at 254 characters, cap message at 2,000 visible characters, and do not allow attachments.
- V1 has **Account deletion**, not self-deactivation; account deletion is irreversible user-initiated closure.

## Testing Priorities

Focus tests on backend rules and critical user flows.

Backend tests should cover services for posts, media attachment rules, post/comment likes, follows, blocks, reports, moderation, search, and auth guards. Integration tests should use PostgreSQL for feeds, search, and core queries.

Local and CI integration tests use Docker Compose PostgreSQL rather than an in-memory/mock database.

Playwright smoke tests should cover built web/API artifacts against the real local infrastructure stack where feasible:

- App boots.
- Register/login happy path.
- Complete one registration, email verification, onboarding, and login happy path through Mailpit in CI.
- Create text-only post.
- Create one image-backed post through Azurite in CI.
- View post in feed/detail.
- Smoke-test one moderation report/remove/visibility flow when the scaffold supports it.
- Basic auth guard behavior.

CI should run typecheck, lint, unit/integration tests, Drizzle migration/schema checks, a minimal Playwright smoke suite, and web/API builds.

Production deployment requires passing typecheck, lint, Vitest unit/integration tests, Drizzle migration/schema checks, web/API builds, minimal Playwright smoke, axe smoke, and successful staging migration/deploy smoke.

Production promotion requires manual approval through the GitHub Actions production environment after staging passes.
