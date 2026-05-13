# MyTuums v1 Scope

MyTuums v1 is a web-first social platform for gamers to post, browse, and discuss short-form gaming content. The first release focuses on public posts, profiles, game-tagged discovery, and basic moderation. Messaging, live streaming, game tracking, native mobile apps, and recommendation systems are intentionally deferred.

## Section Index

- [`Companion Documents`](#companion-documents): the focused docs that refine this scope doc.
- [`Product Goal`](#product-goal): the core user outcome v1 is meant to serve.
- [`Target User`](#target-user): the primary audience and what v1 is not optimized for.
- [`V1 Feature Scope`](#v1-feature-scope): the user-facing product scope and behavioral rules.
- [`V1 Feature Scope / Authentication`](#authentication): auth model, age gate, sessions, and onboarding gate.
- [`V1 Feature Scope / Onboarding`](#onboarding): profile creation and first-run flow.
- [`V1 Feature Scope / Identity`](#identity): usernames, profile rules, and identity boundaries.
- [`V1 Feature Scope / Posts`](#posts): post composition, limits, and public post behavior.
- [`V1 Feature Scope / Media`](#media): upload/storage rules, limits, and lifecycle.
- [`V1 Feature Scope / Feeds`](#feeds): For You, Following, Discover, and feed behavior.
- [`V1 Feature Scope / Games`](#games): seeded catalog, tagging, and game-page behavior.
- [`V1 Feature Scope / Comments`](#comments): comment model, limits, and ordering.
- [`V1 Feature Scope / Likes`](#likes): post/comment like behavior.
- [`V1 Feature Scope / Follows And Blocks`](#follows-and-blocks): relationship and safety rules.
- [`V1 Feature Scope / Notifications`](#notifications): notification triggers, scope, and exclusions.
- [`V1 Feature Scope / Search`](#search): discover/search rules and scope limits.
- [`V1 Feature Scope / Logged-Out Access`](#logged-out-access): public preview behavior and auth boundaries.
- [`V1 Feature Scope / Settings`](#settings): user settings surfaces and controls.
- [`V1 Feature Scope / Account Deletion`](#account-deletion): deletion behavior, holds, and retention-adjacent rules.
- [`V1 Feature Scope / Reporting And Moderation`](#reporting-and-moderation): reports, cases, staff actions, and account enforcement.
- [`V1 Feature Scope / Support And Static Pages`](#support-and-static-pages): support, legal, and static route requirements.
- [`V1 Feature Scope / Accessibility`](#accessibility): accessibility commitments and expectations.
- [`V1 Feature Scope / Analytics And Monitoring`](#analytics-and-monitoring): monitoring posture and analytics exclusions.
- [`Architecture`](#architecture): implementation structure, stack, and deployment decisions.
- [`Architecture / Monorepo`](#monorepo): package layout and repository boundaries.
- [`Architecture / Frontend`](#frontend): frontend stack and UI implementation rules.
- [`Architecture / Backend`](#backend): backend stack, services, storage, and API rules.
- [`Architecture / Rate Limiting`](#rate-limiting): abuse-control strategy.
- [`Architecture / Deployment`](#deployment): environments, hosting, and release/deploy rules.
- [`Core Data Entities`](#core-data-entities): expected entities and modeling boundaries.
- [`Routes`](#routes): route layout across public, app, admin, and static surfaces.
- [`Routes / Public Auth Routes`](#public-auth-routes): auth and account-entry routes.
- [`Routes / Logged-In App Routes`](#logged-in-app-routes): main application routes.
- [`Routes / Admin Routes`](#admin-routes): staff/admin surfaces.
- [`Routes / Static Routes`](#static-routes): legal/support/static content routes.
- [`Routes / Deferred Routes`](#deferred-routes): routes intentionally pushed out of v1.
- [`Testing`](#testing): expected test coverage and quality bar.
- [`Deferred Major Features`](#deferred-major-features): explicitly postponed feature areas.

## Companion Documents

- `CONTEXT-MAP.md` for the documentation split and reading order.
- `DESIGN.md` for the canonical visual system and UI guardrails.
- `docs/context/coding-practices/CONTEXT.md` for implementation guardrails and monorepo/package rules.
- `docs/prd/developer-documentation-app-prd.md` for the separate docs web app.
- `docs/prd/legal-i18n-prd.md` for legal, localization, and launch-readiness detail.

## Product Goal

Build a focused MVP for gamers who want to share and discover gameplay posts and clips.

The v1 product should answer one core use case well:

- a user signs up
- creates a gaming-oriented profile
- posts text, optionally with an image or short video clip
- optionally tags the post with a game
- follows other users
- browses a main feed with For You and Following tabs, plus a global Discover/search surface
- comments, likes, reports, and moderates content

## Target User

The first target user is a gamer who posts and discovers short gameplay clips and gaming posts.

V1 is not optimized for:

- live streamers
- competitive stat tracking
- imported platform libraries
- long-form video channels
- private communities
- messaging-first workflows

## V1 Feature Scope

### Authentication

V1 uses email and password authentication.

V1 has public signup. Invite codes, waitlists, and manual beta approval are out of scope.

Public signup and media uploads should not be enabled until the owner and at least one additional moderator/admin are configured.

Included:

- register
- login
- logout
- email verification
- forgot/reset password
- session management
- minimum age confirmation: 15+
- roles: `user`, `moderator`, `admin`, `owner`

The 15+ requirement is captured with a required registration checkbox and stored `ageConfirmedAt` timestamp. V1 does not collect or store birthdates.

Browser authentication uses secure httpOnly cookie sessions from the API origin with credentialed requests from configured web origins. V1 does not store bearer auth tokens in localStorage.

Passwords must be 8-128 characters. V1 does not require composition rules such as symbols, digits, or uppercase letters.

Normal sessions are 30-day rolling sessions and are invalidated immediately for suspension, account deletion, password change, and permission-changing role changes.

Deferred:

- OAuth/social login
- passkeys
- two-factor authentication
- organizations or teams
- device/session management UI beyond basics

Users must verify their email and choose a username before entering the main app.

Unverified users cannot reserve usernames. Username reservation happens only after verified-email onboarding submit.

### Onboarding

After email verification, onboarding requires:

- unique username

Optional onboarding fields:

- display name
- bio
- avatar
- up to 5 favorite games

Banner upload is only available later in settings.

After onboarding, users land on `/` with the `For You` tab selected. Favorite games are optional. If the user selected favorite games, `For You` uses them as a simple chronological taste signal. If the user skipped favorite games, `For You` falls back to global latest posts and shows an unobtrusive prompt to add favorite games later.

### Identity

MyTuums is handle-first, not real-name-first.

Username rules:

- 3-20 characters
- lowercase letters, numbers, and underscore only
- must start with a letter
- stored lowercase
- globally unique
- immutable in v1
- reserved route names cannot be used
- reserved usernames are enforced from a repo-versioned reserved-name list after lowercase normalization
- reserved names include route names, staff/system words, legal/support page names, and common impersonation handles such as `admin`, `support`, `security`, and `mytuums`

Profile URLs use:

- `/@{username}`

Display names are optional, non-unique, and limited to 40 characters. If absent, the UI falls back to the username.

Profiles include:

- username
- optional display name
- optional avatar
- optional banner
- optional bio, max 160 characters
- up to 5 favorite games
- public post list
- follower/following counts for logged-in and logged-out users

V1 does not include:

- gaming account integrations
- linked Steam/Xbox/PlayStation/Twitch/Discord handles
- verification badges
- pinned posts
- public follower/following list pages

### Posts

A v1 post is one of:

- text-only
- text plus one media attachment

Rules:

- post body is required
- post body max: 500 visible characters
- post body must be non-empty after trimming
- visible characters are counted as Unicode grapheme clusters after trimming and line-ending normalization
- auto-linked URLs count as their literal typed text
- one media attachment total
- media can be one image or one video
- optional game tag from the seeded game catalog
- media-only and tag-only posts are invalid
- no free-text game tags
- no hashtags
- no mentions
- no rich text or Markdown
- safe URL auto-linking is allowed
- auto-linking only links explicit `http://` and `https://` URLs
- auto-linked URLs use safe external-link attributes such as `rel="nofollow ugc noopener noreferrer"`
- bare domains, email addresses, and unsafe schemes stay plain text
- no link previews
- posts are public-only
- posts and attached media publish immediately after validation
- v1 uses reactive moderation rather than pre-publication review
- posts cannot be edited
- posts are soft-deleted
- users can delete their own posts

Post URLs use opaque public IDs:

- `/post/{publicId}`

Internal database primary keys are server-generated UUIDs. Post public IDs are separate opaque IDs used only for public routes and safe API responses.

Self-likes are allowed. Liking your own post does not create a notification.

After successful post creation from the main feed composer, the user stays on or returns to `/`, and the new post is inserted at the top of the main feed optimistically even if it does not match that feed's normal query. On Discover, game, and profile surfaces, optimistic insertion happens only when the new post qualifies for that surface's normal query.

The main feed has an inline composer above the feed content. Other surfaces can open the same composer in a modal or shortcut. Game pages can prefill the game tag. The default game tag is empty, but favorite games should be prioritized in the picker.

### Media

Media is uploaded directly from the browser to blob storage using signed upload URLs.

Storage:

- production: Azure Blob Storage
- local development: Azurite
- blob access is hidden behind an API storage adapter
- all user-uploaded v1 media lives in one private blob container
- blob keys are opaque server-generated paths and do not include usernames, post IDs, original filenames, or other public identifiers
- original filenames are not stored in media records
- direct Azure Blob signed URLs are used in v1; no CDN is required for launch
- blob responses are served inline and do not expose original filenames
- blob cache headers should favor private browser caching, not shared/public caching
- browser-to-blob CORS should be limited to the app's configured web origins and required upload/read methods and headers

Media ownership and purpose:

- media records are single-owner and single-purpose
- purpose is declared when the upload is created and cannot be changed later
- supported v1 purposes are post attachment, profile avatar, and profile banner
- a media record can attach to exactly one target slot
- media is not a reusable user media library in v1
- only the uploading owner can attach media to their own post/profile slot

Upload flow:

1. Web asks API to create an upload.
2. API validates declared MIME type and size for the immutable purpose.
3. API creates a pending media record.
4. API returns a 15-minute signed upload URL.
5. Browser uploads directly to blob storage.
6. Browser confirms completion with the API.
7. API verifies the blob exists and that uploaded byte size/content type match the pending media record.
8. API marks media ready.
9. Post creation or profile update attaches ready owned media atomically.

Upload lifecycle:

- pending uploads expire after 30 minutes
- signed upload URLs are scoped to the exact server-generated blob for that pending media record, with no list/read/delete permissions and no client-chosen blob path
- pending media can be overwritten while retrying upload, but no write URL is reissued after media is marked ready
- upload URLs can be reissued for the same unexpired pending media when an upload URL expires or a browser upload fails
- upload confirmation is idempotent for the media owner
- ready but unattached media is eligible for cleanup after 24 hours unless retained as profile media history
- removing media from the composer/settings UI before saving marks it abandoned
- media statuses stay small: `pending`, `ready`, `attached`, `failed`, and `deleted`
- cleanup is performed by an idempotent maintenance command/script, not a v1 worker service
- production cleanup runs daily from a scheduled GitHub Actions workflow using the cleanup CLI
- upload creation is rate limited to 30 requests per hour per authenticated user
- frontend validation mirrors API type and size limits before asking for an upload, but API validation remains canonical

Media record shape:

- store owner user ID, immutable purpose, status, blob key, MIME type, byte size, created timestamp, pending expiry, ready timestamp, attached target, and deleted/cleanup timestamps as needed
- do not store original filename, image dimensions, video duration, EXIF fields, generated variant paths, or scan results in v1
- profile media history needs an explicit internal link or replacement relation so historical avatar/banner media is not treated as ordinary unattached media

Post media limits:

- images: JPEG, PNG, WebP
- videos: MP4, WebM
- max image size: 10 MB
- max video size: 100 MB
- validation uses MIME type and byte size only in v1
- image dimensions are not enforced in v1
- no duration limit in v1
- no client-side duration enforcement
- no server-side video probing in v1
- no transcoding
- no generated thumbnails
- no user-supplied video poster images
- no generated image variants or resized avatar/feed/profile images
- no adaptive bitrate
- no live streaming
- no automated malware, CSAM, nudity, or policy scanning in v1

V1 explicitly accepts the launch risk of public media uploads without automated safety scanning. Controls are reactive moderation, report flows, rate limits, clear Terms, and fast staff removal.

Profile media:

- avatar: image only, max 5 MB
- banner: image only, max 10 MB
- JPEG, PNG, WebP only
- same storage adapter as post media
- separate upload flow and media type from post attachments
- replacing avatar or banner keeps previous media as internal-only profile media history
- profile media history is not user-visible in v1
- profile media history is retained until account deletion unless removed for moderation/legal reasons
- absent avatars and banners use UI-rendered fallbacks, not default media blobs
- avatar and banner display use CSS object-fit/object-position defaults with no v1 crop editor or stored crop metadata

Media visibility:

- blobs are private
- API responses include 15-minute signed read URLs for visible media
- signed read URL issuance applies the same visibility rules as the parent content, including deleted/removed content, suspended/account-deleted users, and block relationships
- logged-out users can receive signed read URLs only for media shown on allowed limited public profile/game/post previews
- already-issued read URLs may remain usable until their 15-minute expiry after visibility changes; v1 does not attempt active signed URL revocation
- no API proxying for normal playback
- no public blob containers
- staff access to hidden/deleted/moderated media uses the same short-lived signed read URL mechanism with staff authorization checks
- staff moderation actions are audited; individual staff media views are not audited in v1

Media display and accessibility:

- feed videos use native browser controls, `preload="metadata"`, and no autoplay
- composer/settings UI shows a local preview and upload progress immediately after file selection
- Post/Save remains disabled until attached media is confirmed ready
- failed uploads remain visible with Retry and Remove actions
- v1 supports file picker and drag-and-drop uploads
- mobile upload relies on native browser file picker/camera behavior via file input accept filters
- paste-to-upload and custom camera capture are deferred
- feed media renders inside constrained frames so extreme source dimensions do not dominate the feed
- post images can open in a simple accessible lightbox using a fresh or still-valid signed read URL
- videos stay inline with native browser controls rather than opening in a custom media viewer
- v1 has no explicit media Download button
- uploaded originals are served as-is within client-side layout constraints
- image metadata such as EXIF/GPS is accepted as part of original uploads; upload UX/privacy copy should warn users
- v1 does not ask users to enter alt text
- images use generic context-specific accessible labels, such as post image, avatar, or decorative banner behavior based on where the media appears
- videos rely on native accessible controls and nearby post/context text
- captions/subtitles are deferred

Media retention:

- media removed from a draft/composer is marked abandoned and cleaned up by maintenance cleanup
- user-deleted post media is hidden immediately and retained for 90 days before cleanup unless held for moderation/legal reasons
- moderation-removed media is hidden from users and retained as moderation evidence while the case/audit trail requires it
- account-deleted media blobs are cleaned up within 24 hours unless under moderation/legal hold

### Feeds

All feeds use chronological ordering with cursor pagination.

Pagination:

- cursor-based
- ordered by `(createdAt, id)`
- cursors exposed to clients as opaque strings
- feed cursors encode `(createdAt, internalId)` and never expose raw cursor internals
- no offset pagination for feeds

Feeds:

- `/`: main feed with `For You` and `Following` tabs
- `/discover`: global search-and-browse hub with latest public posts from everyone
- `/game/{slug}`: latest public posts tagged with that game
- `/@{username}`: latest public posts by that user

The `/` main feed defaults to `For You`.

`For You` rules:

- If the viewer has favorite games, show latest posts tagged with any of those games.
- Include matching posts from users the viewer follows.
- Do not include untagged posts when the viewer has favorite games.
- If the viewer has favorite games but no matching posts, show an empty/setup state instead of falling back to global latest posts.
- If the viewer has no favorite games, fall back to global latest posts, including untagged posts.
- If the viewer has no favorite games, show a dismissible add-favorites prompt in `For You`; do not nag across unrelated routes.
- The UI should present `For You` confidently and avoid explaining the feed logic except in empty/setup states.

`Following` rules:

- Show latest posts from followed users only.
- Do not inject recommendations or non-followed users.

`Discover` rules:

- Discover is logged-in only.
- Discover is intentionally not personalized in v1.
- It is the search-and-browse hub for users, games, and global posts.
- The default content is global latest posts from everyone, including untagged posts.
- Users can search users/games and manually filter by game.
- Discover search/filter state is shareable through URL params: `q` for search text and `game` for selected game slug.
- When `q` is active, the query searches users/games only; the posts feed remains latest/global or explicitly game-filtered browse content.

`For You` should stay mostly passive. Detailed game filtering belongs in Discover and `/game/{slug}`.

No v1 feed uses:

- personalized ranking
- trending score
- recommendation engine
- algorithmic For You ranking
- real-time updates
- Redis fanout
- activity-based scoring

### Games

V1 uses a seeded internal game catalog.

The catalog is curated seed data versioned in the repo and applied by a repeatable seed command/migration. V1 does not rely on manual production-only database edits for the initial catalog.

Game fields:

- ID
- slug
- name
- optional cover image URL
- optional release year
- optional genre list
- optional short description
- optional curated search aliases/acronyms

Game cover images, when present, must be rights-cleared assets. V1 does not hotlink external game box art. Game cover assets live in a separate Azure Blob public container with cache headers, no CDN initially, and are distinct from private user media.

Game URLs use slugs:

- `/game/{slug}`

Game slugs are immutable once shipped. Game names, descriptions, aliases, and metadata may change through seed updates.

Inactive games cannot be newly selected or returned in normal game search, but existing tagged posts keep their tag and `/game/{slug}` remains viewable unless removed for safety/legal reasons.

Game pages are content hubs. They show:

- game name
- optional cover image
- optional seeded description
- add/remove favorite action
- latest public posts tagged with the game
- create-post shortcut prefilled with the game tag

Users can select up to 5 favorite games. Favorite games are shown on profiles. Users do not follow games as feed subscriptions.

Favorite games also shape the main feed's `For You` tab in v1 through simple chronological filtering. This is not a recommendation algorithm.

Deferred:

- `/games` catalog page
- game request flow
- game catalog admin UI
- external game database APIs
- trailers
- ratings
- release calendars
- reviews
- achievements
- playtime
- ownership states
- imported libraries

### Comments

V1 comments are flat text-only comments on posts.

Rules:

- comment body is required
- max 300 visible characters
- comment body must be non-empty after trimming
- visible characters are counted as Unicode grapheme clusters after trimming and line-ending normalization
- auto-linked URLs count as their literal typed text
- no nested replies
- no media
- users can like/unlike comments
- self-likes are allowed
- liking your own comment does not create a notification
- unique `(commentId, userId)`
- like counts are visible
- comments sort by like count descending, then oldest-first by `(createdAt, id)` for ties
- comment pagination uses keyset cursors over `(likeCount, createdAt, id)` and accepts that comments can shift between loads as likes change
- v1 does not build comment ranking snapshots
- safe URL auto-linking is allowed
- auto-linking only links explicit `http://` and `https://` URLs
- auto-linked URLs use safe external-link attributes such as `rel="nofollow ugc noopener noreferrer"`
- bare domains, email addresses, and unsafe schemes stay plain text
- no rich text or Markdown
- comments cannot be edited
- users can delete their own comments
- deleted comments disappear publicly
- user-deleted comments are not restorable in v1
- admins/moderators can view deleted comments in moderation context

Comments are read/write on `/post/{publicId}` in v1. Feeds show comment count and link to post detail, but do not render inline comment threads or inline comment composers.

Post `commentCount` is denormalized on posts, counts globally visible comments only, excludes user-deleted/moderation-removed comments, and is not viewer-specific for blocks.

### Likes

Likes apply to posts and comments in v1.

Rules:

- users can like/unlike posts
- users can like/unlike comments
- self-likes are allowed
- unique `(postId, userId)` for post likes
- unique `(commentId, userId)` for comment likes
- like counts are visible
- post and comment `likeCount` values are denormalized on target rows and updated transactionally with unique like rows
- no liked-by lists
- no liked-posts profile page
- feeds and post detail both include like/unlike controls
- comment like controls appear on post detail comments

### Follows And Blocks

Follows are one-way subscriptions.

Rules:

- no approval flow
- no private accounts
- no friend requests
- no mutual-only features
- follower/following counts are visible to logged-in and logged-out users
- full follower/following lists are deferred

Blocking is included in v1.

If user A blocks user B:

- existing follow relationships in both directions between A and B are removed
- B cannot follow A
- B cannot like A's posts or comments
- B cannot comment on A's posts
- logged-in visibility is mutual: neither user can view the other's profile or post pages while logged in
- neither user sees the other's posts/comments in feeds, game pages, profile contexts, or search where practical
- prior comments from the blocked user are hidden from normal views where practical
- prior post/comment likes remain counted
- old notification rows remain as database history, but blocked/hidden notifications are hidden from the user's list, excluded from unread counts, and marked read when detected
- unblocking does not restore removed follow relationships
- block data and blocked-user counts are private
- logged-out public access remains a known limitation

Search results should respect suspensions, account deletion, and blocks where practical.

### Notifications

V1 has in-app notifications only.

Notification events:

- someone follows you
- someone comments on your post
- someone likes your post
- someone likes your comment
- staff removes your post or comment

Rules:

- stored in PostgreSQL
- v1 notification types are `follow`, `post_like`, `post_comment`, `comment_like`, and `content_removed`
- immutable event records with read/unread state
- created synchronously in the same PostgreSQL transaction as the source action
- natural-key dedupe for repeatable toggles: one notification per recipient/actor/type/target for follows, post likes, and comment likes
- one notification per comment ID for comments
- one notification per moderation action/content target for content removals
- self-generated user actions do not create notifications
- undoing a follow or like does not remove the historical notification, create a new notification on redo, or reset read state
- notifications from either side of a block relationship are not created after a block
- old notification rows remain as database history, but notifications involving blocked or otherwise hidden actors/targets are hidden from the user list, excluded from unread counts, and marked read when detected
- hiding is dynamic for reversible visibility states such as unblock, restored content, or expired suspension; reappearing notifications remain read
- notification rows store stable internal IDs; API responses expose only safe public route identifiers such as post `publicId` and usernames
- removal notification API responses do not expose moderation action IDs or case IDs
- notification schema uses explicit nullable foreign-key columns rather than unconstrained polymorphic target IDs: `recipientUserId`, nullable `actorUserId`, nullable target columns such as `targetProfileId`, `targetPostId`, `targetCommentId`, and nullable `moderationActionId`
- schema check constraints ensure each notification type has the required actor/target shape and no unrelated target columns
- recipient account deletion cascades to delete recipient-owned notification rows; actor/target hard deletes set nullable foreign keys to null so rows remain database history but become hidden/read
- target model: `follow` targets the actor's profile; `post_like` targets the liked post; `post_comment` targets the comment with its parent post joined for navigation; `comment_like` targets the liked comment with its parent post joined for navigation; `content_removed` targets the removed post or comment
- dedupe is enforced with service-level idempotent inserts plus database uniqueness constraints for each notification type's natural key
- indexes should support recipient-scoped newest-first list queries and unread-count queries
- notification text does not include user-generated content snippets in v1
- notification rows store structured type/data, not generated display text; clients render text from current safe data
- `content_removed` notifications use a system actor and never expose reporter identity, report notes, staff notes, staff identity, or case details
- `content_removed` notifications link to the removed placeholder visible to the owner/staff and show only the public reason category plus support/contact path
- authenticated nav shows a bell with unread badge capped at `99+`
- unread badge fetches on app load, refetches after notification-affecting actions, and polls every 60 seconds while the tab is visible
- `/notifications` uses cursor pagination ordered by `(createdAt, id)` descending with a page size of 20
- opening `/notifications` marks currently visible notifications as read; clicking a notification marks that item read before navigation; v1 includes a `Mark all as read` action
- notification API surface is limited to authenticated `list(cursor)`, `unreadCount()`, `markRead(notificationId)`, and `markAllRead()` procedures; creation is internal to domain services
- mark-read procedures are recipient-scoped and cannot mutate another user's notifications
- `markAllRead()` applies only to notifications currently visible to the recipient under dynamic visibility rules
- suspended users cannot access `/notifications`
- no email notifications
- no push notifications
- no real-time delivery
- polling or refresh is enough
- no notification preferences in v1

### Search

V1 search covers:

- users by username/display name
- games by name and curated aliases/acronyms

Surfaces:

- logged-in nav includes persistent search entry
- desktop nav search uses compact typeahead
- mobile nav search uses a search icon that opens a focused sheet/full-screen search surface
- `/discover` owns the full search-and-browse UI
- logged-out public pages do not expose search

Nav typeahead:

- starts after 2 visible trimmed characters
- debounces requests by about 200 ms
- ignores stale responses
- shows a subtle loading state only after a short delay
- groups results as `Users` then `Games`
- shows at most 3 users and 3 games
- includes a `View all results` action that routes to `/discover?q={query}`
- `Enter` opens the highlighted result, or `/discover?q={query}` if no result is highlighted
- `/` focuses search when not already typing in another input
- `Esc` closes the typeahead or clears focus
- arrow keys move through results

Discover search UI:

- page hierarchy is search input, active game filter controls, user/game results when `q` is active, then latest posts feed
- URL state uses `/discover?q={query}&game={slug}`
- blank Discover shows default latest public posts
- 1-character queries show keep-typing guidance instead of sending search requests
- no-match search states keep the posts feed visible below
- search failures are inline and do not take down the posts feed
- user/game result groups show up to 20 results each and do not paginate in v1

Result behavior:

- user result primary action opens `/@{username}`
- game result primary action opens `/game/{slug}`
- Discover offers a separate explicit action to filter posts by a game
- game filtering affects the posts feed only; search query text does not full-text search posts
- result rows may highlight simple matched substrings
- if a curated game alias matched, Discover may show a small alias match note

Result display:

- nav user rows show avatar/fallback, display name, and `@username`
- Discover user rows may also show short bio
- nav game rows show cover/fallback and game name
- Discover game rows may also show release year/genre and filter action
- v1 normal search does not show follower counts, popularity labels, score explanations, or recent activity previews

Matching/ranking:

- normalize whitespace and trim query text
- matching is case-insensitive
- display name and game name search is accent-insensitive
- username search follows the existing lowercase ASCII username rules
- use substring matching, with exact and prefix matches ranked above contains matches
- ties are deterministic and alphabetic: `username` for users, game `name` for games
- do not use follower counts, favorite counts, recency, or personalization as ranking inputs in v1

Eligibility:

- normal user search returns only profiles the viewer can open
- exclude suspended and account-deleted profiles
- filter mutual block relationships for logged-in viewers
- normal game search returns active seeded games only
- no external game database fallback
- no user-submitted game request flow from search in v1

API/storage:

- use one tRPC entity-search query returning explicit `{ users, games }` fields
- nav calls the same query with small limits; Discover calls it with larger limits
- post feed queries remain separate and accept an optional game slug filter
- use PostgreSQL-backed normalized search fields and `pg_trgm` GIN indexes for substring search
- use stored normalized values or PostgreSQL `unaccent` for accent-insensitive display/game matching
- migrations enable required PostgreSQL extensions: `pg_trgm` and `unaccent`
- protect search with a lightweight authenticated rate limit suitable for typeahead, such as 120 requests per minute per user/IP with burst control
- target p95 API response under 200 ms on dev/seeded data and under 500 ms on expected launch data
- do not store recent searches or raw query analytics in v1

Testing:

- API tests cover minimum query length, matching, ranking, limits, accent normalization, alias matching, eligibility filters, block filters, and rate limiting
- UI tests cover nav typeahead, keyboard behavior, mobile search sheet, `/discover?q=`, game filter URL state, no-results state, and inline search error behavior

Deferred:

- post full-text search
- comment search
- external search service
- hashtag search

### Logged-Out Access

Logged-out users can view only shared public detail pages and static pages.

Allowed:

- `/post/{publicId}`
- `/@{username}`, limited public profile shell
- `/game/{slug}`
- auth pages
- legal/support/about pages

Not allowed:

- `/`
- `/discover`
- feed browsing
- posting
- liking
- commenting
- following
- reporting
- notifications
- settings
- admin

`/` redirects logged-out users to login.

Logged-out public previews can show public counts such as likes, comments, followers, and following. Actions require login.

Logged-out profile pages show a limited public shell including identity, bio, favorite games, follower/following counts, and a limited recent-post preview with media. They do not expose full feed pagination or follower/following list pages.

Logged-out post detail pages show the post and a limited comments preview. The preview shows the top 3 comments using the normal comment sort plus total comment count and a login prompt for deeper participation.

Logged-out game pages show game metadata and a limited recent-post preview with media, not full pagination.

Public post, profile, and game pages provide shareable logged-out previews with best-effort indexing only. Rich dynamic SEO metadata, server-rendered previews, social cards, and HTTP-status-level unavailable SEO semantics are deferred. Deleted, removed, suspended, account-deleted, and unavailable content shows client-side unavailable UI and best-effort client `noindex` metadata. `/`, `/discover`, settings, auth internals, admin, and other private/internal pages should not be indexed.

### Settings

V1 uses one `/settings` page with tabs.

Tabs:

- Profile: display name, bio, avatar, banner, favorite games
- Account: email, password change/reset, account deletion
- Display: system/light/dark theme
- Safety: blocked users list
- About: version and legal links if useful

Deferred:

- separate settings subroutes
- notification preferences
- custom color themes
- custom font-size preference
- account data export

Display theme options:

- system
- light
- dark

### Account Deletion

Users can delete their account in v1. V1 does not include reversible self-deactivation.

Behavior:

- login is disabled after deletion
- profile becomes unavailable
- posts disappear from feeds and direct post pages
- comments disappear from threads
- follows are removed
- the deleted user's post/comment likes no longer count publicly
- email is held for 7 days after deletion, then released for reuse
- username is held for 7 days after deletion, then released for reuse
- after username reuse, `/@{username}` resolves to the current holder only
- historical audit, moderation, and notification references use internal IDs and must not resolve deleted-user history to a new holder
- display identity and media are anonymized or detached where appropriate
- account-deleted internal rows are retained only under defined retention buckets, with direct PII minimized after the 7-day hold window
- routine security and rate-limit logs are retained for 12 months
- moderation cases, reports, and actions are retained for 3 years after case closure or account deletion unless a legal hold applies
- legal, IP, and privacy complaints are retained while needed for the claim or dispute, then deleted or minimized
- media blobs are cleaned up within 24 hours unless under moderation/legal hold

Account deletion updates public visibility and denormalized counts synchronously. Blob cleanup remains scheduled through the cleanup command.

Automated data export is deferred. Users can contact support for data/export requests.

### Reporting And Moderation

Reporting requires login.

Users can report:

- posts
- comments
- profiles

Report fields:

- target
- reason enum
- optional note, max 500 characters
- reporter
- status
- timestamps

Reports attach to moderation cases. A user can have only one active report per target while a case is open, and global report rate limits apply.

Report reasons:

- `spam`
- `harassment`
- `hate_or_abuse`
- `sexual_content`
- `graphic_or_violent_content`
- `illegal_or_dangerous`
- `impersonation`
- `privacy`
- `self_harm`
- `underage_or_safety`
- `other`

Staff action reasons:

- `spam`
- `harassment`
- `hate_or_abuse`
- `sexual_content`
- `graphic_or_violent_content`
- `illegal_or_dangerous`
- `impersonation`
- `privacy_violation`
- `platform_abuse`
- `underage_or_safety`
- `other`

User-facing public reasons are coarser than internal staff reasons: `spam`, `harassment`, `hateful_or_abusive`, `sexual_content`, `graphic_or_violent`, `illegal_or_dangerous`, `privacy`, `safety`, `underage`, and `other`. Detailed internal reasons and notes stay private.

Reports are not anonymous internally.
Reporter notes and reporter identity are visible to moderators, admins, and owner, but never to normal users or reported users.
Reporters cannot directly set case priority. The backend derives priority from reason category, target type, and report volume. Staff can manually raise or lower priority.

V1 admin is moderation-focused.

Routes:

- `/admin`: moderation overview
- `/admin/reports`: report queue
- `/admin/users`: narrow moderation user search
- `/admin/users/{id}`: minimal user moderation view
- post/comment moderation detail can be a page or modal

Actions:

- review moderation cases grouped by target
- claim/reassign/unclaim cases
- dismiss cases
- remove/restore posts
- remove/restore comments
- temporarily or indefinitely suspend users
- unsuspend users
- view recent moderation history and case timelines
- manage staff roles according to role hierarchy

Moderation cases:

- group reports by target
- support targets: `post`, `comment`, `profile`
- have status: `open`, `reviewing`, `dismissed`, `actioned`
- have priority: `normal` or `urgent`
- default urgent priority applies to `self_harm`, `illegal_or_dangerous`, `privacy`, `underage_or_safety`, or high report volume on the same target
- high report volume means 3 unique reporters on the same target within 24 hours
- staff can manually raise or lower priority
- can have an assignee
- default queue sorting is urgent first, then oldest open/reviewing case
- assigned/reviewing cases remain visible to staff and are filterable
- show a read-only timeline generated from reports and audit actions
- do not include free-form internal case comments in v1

When a case is resolved, all attached open reports are resolved together. If the same target is reported again after a case is closed and the target is visible/reportable, create a new case. If the target is self-deleted after being reported, keep the case open and label the target as user-deleted.

Moderation actions require reason enums, internal notes, and audit records. Suspensions require a user-facing public reason as well. Report reason enums and staff action reason enums are separate but overlapping.
Internal notes are required for dismissals, removals, restorations, suspensions, unsuspensions, and role changes.
Moderation actions are idempotent for same-state retries and use explicit conflict handling for targets changed since staff loaded them; allowed conflict overrides are audited.
Only content removals and suspensions are reversible in v1. Role changes are changed through another audited role action rather than a generic undo stack.

Audit records include:

- actor
- action
- target
- reason enum
- public reason, when user-facing
- internal note
- timestamp
- conflict override flag, when applicable

Audit records are append-only. V1 does not hard-delete moderation audit records.

Role assignment:

- roles are `user`, `moderator`, `admin`, and unique `owner`
- owner is bootstrapped by a setup command against an existing verified user
- owner bootstrap is an idempotent CLI requiring a verified user email and one-time environment secret
- owner bootstrap refuses to create a second owner
- owner cannot be created, transferred, or removed through the v1 UI
- owner account deletion is blocked in v1 because owner transfer/removal is out of scope
- moderators and admins must be demoted to `user` before they can self-delete
- owner can promote/demote moderators and admins
- admins can promote/demote moderators
- moderators cannot change roles
- admins cannot promote/demote other admins
- staff promotion requires verified email and active account status
- role changes require internal notes and audit records
- role changes take effect immediately, including active sessions
- demoting staff automatically unassigns their open/reviewing moderation cases in the same transaction
- suspending staff automatically unassigns their open/reviewing moderation cases in the same transaction

Role hierarchy for account actions:

- moderators can suspend/unsuspend normal `user` accounts only
- admins can suspend/unsuspend users and moderators
- owner can suspend/unsuspend users, moderators, and admins
- nobody can suspend the owner through v1 UI

Role hierarchy for content actions:

- moderators, admins, and owner can remove/restore posts and comments

Suspensions:

- can be temporary or indefinite
- suspension duration options are `24h`, `7d`, `30d`, and `indefinite`
- v1 does not include custom suspension expiry dates
- temporary suspension expiry restores access automatically
- expiry is handled lazily in v1 by a centralized account-status helper rather than by a worker
- expired suspensions are cleared before auth, permission, and visibility decisions on authenticated requests/session refreshes and relevant staff reads
- suspension takes effect immediately across active sessions
- suspended public profiles and content disappear while suspension is active
- expired suspension restores public profile/content visibility unless specific content was separately removed or deleted
- confirmed underage users receive an indefinite suspension with public reason `underage`

Suspended users can log in only to see account status, delete their account, and access support/contact. They cannot browse feeds, post, comment, like, follow, report, edit profile, or upload media. Suspended users may submit the contact form with rate limiting.

The suspended account-status page shows suspended status, public reason, expiry if temporary, and support/contact link. It never shows reporter identity, internal notes, staff identity, or full moderation history.

Content deletion/removal:

- self-delete uses content-owner deletion state such as `deletedAt`
- moderation removal uses separate fields such as `removedAt`, `removedByUserId`, and `removalReason`
- staff can restore moderation-removed content
- staff cannot restore user-deleted content
- users cannot restore their own deleted posts/comments in v1
- user-deleted posts/comments disappear from all normal user views, including the author's
- user-deleted posts/comments can remain visible only to staff in moderation contexts, clearly labeled as deleted by user
- public routes for user-deleted content return unavailable
- normal users cannot report removed/deleted content because it is not visible
- report and delete actions live in overflow menus where applicable
- moderation-removed posts/comments are hidden from normal users
- the author and staff can see a removed placeholder with the public reason category
- author-facing removed placeholders show target type, public reason, timestamp, and support/contact path only
- author-facing removed placeholders remain only while the author account exists and the content has not been self-deleted
- removed content placeholder routes are available only to the author and staff; normal users see unavailable
- the app provides no share UI for removed content
- removed text/media is not shown in normal user UI; staff can view removed content in moderation context
- removed content cannot be liked, commented on, shared through app UI, or otherwise interacted with as normal content
- content removal creates a minimal in-app notification for the author
- staff action on already user-deleted content is audited but does not create a user-facing content-removal notification
- comment removal under an unavailable parent post is audited, but not user-notified unless the comment would otherwise be visible to its author
- moderation audit/case timelines record whether a content-removal notification was created, skipped, or failed, with reason
- if a required content-removal notification cannot be created in the same transaction, the moderation action fails
- defined notification skips are allowed and audited
- content-removal notifications never expose reporter identity, report notes, staff notes, staff identity, or case details

Profile reports:

- users can report profiles
- staff cannot remove/restore a profile as a separate v1 action
- staff cannot directly edit profile fields in v1
- profile reports are resolved by dismissal, post/comment removal where relevant, or user suspension
- suspension is the v1 account/profile-level enforcement action

Staff conflict rules:

- staff cannot target themselves with account-level staff actions
- staff cannot resolve/action cases where they are the reporter or target owner
- owner has a limited conflict override for cases where owner is the reporter, not where owner owns the target
- conflict overrides are audited and require internal notes

Admin user search/detail:

- `/admin/users` is a narrow moderation tool, not a full CRM
- moderators can search users by username/id for moderation context, without email or role-management powers
- admins and owner can see email where account-level moderation or staff management requires it
- `/admin/users/{id}` shows role-appropriate moderation context, case history, reports, and allowed actions

Reporters are not notified when reports are resolved in v1. Suspended users receive status details through the restricted account-status surface. Content removals notify the author with minimal user-facing information. Restoring removed content does not create a notification in v1.
Restoring removed content does not delete or replace the historical removal notification; its target reflects current restored/visible state.
If a user self-deletes removed content, the prior removal notification remains database history but is hidden, excluded from unread counts, and marked read when detected.

Formal appeals are deferred. Removed or suspended users can use the general support/contact form instead of a dedicated appeal ticket workflow.

### Support And Static Pages

Static pages:

- `/terms`
- `/privacy`
- `/cookies`
- `/legal-notice`
- `/accessibility`
- `/support`
- `/contact`
- `/about`

Deferred:

- `/download`

Support/contact:

- `/support` is static help/safety content
- `/contact` has a public rate-limited form
- logged-out submitters provide an email address; authenticated submitters can be linked by `userId`
- contact form sends email through Resend
- contact form stores a minimal internal database log
- contact submission fields are `id`, optional `userId`, supplied email, category, message, request IP hash, user agent, created timestamp, and email delivery status/error
- contact categories are `account_access`, `moderation_or_safety`, `privacy_or_data`, `bug_report`, `general_support`, and `other`
- contact category is required
- supplied email is capped at 254 characters
- contact message is capped at 2,000 visible characters
- contact form does not allow attachments
- contact submissions are retained for 180 days before deletion/anonymization
- no support ticket dashboard
- no user-facing ticket status

Legal/support links should always appear in the footer. On feed pages (`/` and `/discover`), they should also appear in a secondary sidebar/rail when there is enough screen width.

Real launch-ready Terms, Privacy, Cookies, and Legal Notice pages are required before public signup and media uploads are enabled. Placeholder legal pages are not acceptable for public v1 launch.

`/legal-notice` identifies the operating company, legal form, registration number, registered office, publication director, hosting/provider information, and legal contact details once the company exists.

V1 content/community rules live in `/terms` and `/support`. There is no separate guidelines page.

### Accessibility

ShadCN/Radix components are the UI foundation, but app-level accessibility remains an explicit requirement.

V1 baseline:

- keyboard-accessible navigation and dialogs
- visible focus states
- semantic buttons, links, and forms
- labels, descriptions, and error messages for inputs
- accessible names for icon-only buttons
- generic context-specific media alt behavior without user-entered alt text
- native accessible video controls
- reduced-motion support where animations exist
- WCAG AA color contrast where practical

CI includes axe accessibility smoke checks on key unauthenticated/authenticated pages. Complex flows still require manual keyboard and focus review.

### Analytics And Monitoring

V1 collects minimal first-party product/operational events:

- signup completed
- post created
- media upload completed/failed
- follow created
- comment created
- report submitted
- moderation action taken

V1 does not include a generic analytics event table or event pipeline. Product counts should come from domain rows, safety history from audit rows, and operational events from structured application logs.

V1 does not include:

- third-party ad/tracking pixels
- detailed scroll/watch telemetry
- personalized ranking event streams
- creator analytics dashboards

Sentry is used for error monitoring.

Sentry scope:

- frontend runtime errors
- backend exceptions
- release/environment tags
- PII scrubbing
- no session replay in v1
- no behavioral analytics through Sentry

API logs are structured JSON written to stdout/stderr and collected by Azure App Service. V1 does not add Azure Application Insights custom telemetry unless the scope changes.

## Architecture

Timestamps are stored in UTC and exposed as ISO strings. Feeds use relative display, while detail/admin views can show local absolute times.

### Monorepo

Use Turborepo.

`pnpm` is the canonical package manager and should be enforced through package metadata and CI.

ESLint is used for TypeScript/React linting and Prettier for formatting.

TypeScript is strict across all packages and CI fails on typecheck errors.

Vitest is used for unit/service/integration tests; Playwright is used for browser smoke tests.

Canonical initial structure:

- `apps/web`: React + Vite web app
- `apps/api`: TypeScript Fastify API server hosting tRPC plus auth/health/upload routes
- `packages/db`: Drizzle schema, migrations, database client
- `packages/ui`: ShadCN-based shared UI components
- `packages/config`: shared environment validation/config helpers
- `packages/api-contract`: shared tRPC types/client helpers
- `packages/types`: cross-package domain/value types

Package boundaries:

- `packages/api-contract` exports only tRPC router/client type wiring
- `packages/types` exports stable cross-package domain/value types and shared constants only
- neither package may contain service logic, DB clients, React components, or catch-all utilities
- `packages/ui` contains ShadCN primitives, design-system wrappers, and reusable low-domain components only
- product/domain composition such as feeds, profile cards, moderation screens, and route layouts stays in `apps/web`

Avoid a generic catch-all `shared` package.

### Frontend

V1 is web-only with responsive mobile layouts.

V1 includes internationalization for the supported signup region. Product and legal copy must be localized for the launch locales selected for the EU, EEA, UK, and Switzerland, rather than hardcoded as English-only UI.

V1 launch locales are `en`, `fr`, `de`, `es`, `it`, `nl`, `pt`, and `pl`. For legal pages, French is the authoritative version when the operator is France-based; other locale versions are translations for user convenience unless counsel requires otherwise.

Locale defaults from the browser language when supported, can be changed by the user in settings, and is separate from signup country. Legal pages should have locale-specific routes such as `/fr/terms` and `/en/terms`.

Frontend stack:

- React
- Vite
- TanStack Router
- Tailwind CSS
- ShadCN
- tRPC React Query/TanStack Query for server state
- Zustand where local client state is actually needed
- React Hook Form for forms, with Zod schemas/constants mirrored for UX where useful

Initialize ShadCN with the chosen preset:

```bash
pnpm dlx shadcn@latest init --preset b1zww1gyLw --template vite --monorepo --pointer
```

This command is the canonical scaffold instruction, not an example. Do not swap the preset, theme, template, or monorepo mode unless this PRD changes.

The v1 visual theme is defined by the chosen ShadCN preset/theme. Coders and agents should not override or replace that theme unless the product scope explicitly changes.

Deferred:

- React Native
- formal PWA support
- native mobile apps
- push notifications
- offline mode

### Backend

V1 uses one TypeScript API app.

Canonical API route prefixes:

- `/trpc` for app procedures
- `/auth/*` for auth routes
- `/healthz` for platform health checks
- narrow REST endpoints only where browser/blob/provider flows require them

Backend stack:

- Fastify as the API HTTP host
- tRPC
- BetterAuth
- Drizzle ORM
- PostgreSQL
- Azure Blob Storage in production
- Azurite in local development
- Resend for production transactional email
- Mailpit for local email testing
- Sentry for error monitoring

Email conventions:

- transactional email sends from `MyTuums <noreply@mytuums.com>`
- support/contact email routes to `support@mytuums.com`
- Resend domain/sender verification and support mailbox routing must be confirmed before public signup and media uploads are enabled

No v1:

- Go microservices
- Redis
- RabbitMQ
- worker service
- real-time messaging
- WebSockets
- live streaming service
- video processing pipeline

The API should be stateless:

- no local file storage
- no in-memory production sessions
- no in-memory production rate limits
- no process-local state required for correctness
- uploads go to blob storage
- sessions/auth state are persisted appropriately

Routers should stay thin. Business rules live in service modules.

Use centralized authorization helpers/policies for:

- required session/user
- admin/moderator access
- blocked users
- deleted/removed content
- suspended/account-deleted users
- content visibility
- moderation permissions

Validation:

- API owns canonical validation schemas
- frontend forms may use form-specific schemas where UX requires it
- shared constants define limits and allowlists

### Rate Limiting

V1 uses production-safe rate limiting without Redis.

Recommended:

- Postgres-backed rate limits behind a small limiter module
- swappable later for Redis
- route-appropriate keys: user ID for logged-in actions, IP for logged-out/auth/contact actions, and combined user/IP keys for high-abuse actions such as uploads and reports
- upload and search limits are product-specified; other route thresholds use conservative config defaults set during implementation

Apply limits to:

- login attempts
- registration
- password reset requests
- upload URL creation
- post creation
- comment creation
- report submission
- contact form submission

### Deployment

V1 deployable pieces:

- Azure Static Web Apps for the static Vite web app
- Azure App Service for the Node-capable TypeScript API service
- Azure Database for PostgreSQL Flexible Server for managed PostgreSQL
- Azure Blob Storage

Deployment requirements:

- HTTPS
- static hosting/CDN for web
- Node runtime for API
- managed PostgreSQL
- environment variables for Azure Blob, Resend, Sentry, auth/session secrets
- web origins: `mytuums.com` and `www.mytuums.com`
- API origin: `api.mytuums.com`
- Azure Static Web Apps must fall back client routes to `index.html` so direct links do not 404
- auth routes are served from the API origin, not a separate auth subdomain
- credentialed CORS is allowed only from configured web origins

Deployment environments:

- `local`
- `staging`
- `production`

Per-PR cloud preview environments are deferred for v1.

Database migrations run as explicit CI/CD deployment steps against staging and production. The API does not run migrations on startup.

Runtime secrets live in Azure app settings. GitHub Actions environment secrets are used only for CI/CD deployment, migrations, and scheduled cleanup. `.env` files are never committed.

Commit `.env.example` files with non-secret placeholders as needed. Real `.env` files stay ignored.

Local development:

- Docker Compose runs infrastructure only
- local infra: PostgreSQL, Azurite, Mailpit
- apps run directly with package scripts through Turborepo

## Core Data Entities

V1 core entities:

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

`User` and `Profile` should be separate:

- `User`: auth/account/security fields, role, status
- `Profile`: username, display name, bio, avatar media, banner media

Not included:

- `Message`
- `Stream`
- separate `Video` entity
- `Activity`
- `Bookmark`
- `Hashtag`
- `Mention`
- `GameRequest`
- `UserGameLibrary`
- follower list materialization
- recommendation event stream

## Routes

### Public Auth Routes

- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`
- email verification route as required by BetterAuth flow

### Logged-In App Routes

- `/`
- `/discover`
- `/post/{publicId}`
- `/@{username}`
- `/game/{slug}`
- `/notifications`
- `/settings`

### Admin Routes

- `/admin`
- `/admin/reports`
- `/admin/users`
- `/admin/users/{id}`

### Static Routes

- `/terms`
- `/privacy`
- `/cookies`
- `/legal-notice`
- `/accessibility`
- `/support`
- `/contact`
- `/about`

### Deferred Routes

- `/messages`
- `/activity`
- `/games`
- `/video`
- `/video/{id}`
- `/library`
- `/download`
- `/settings/account`
- `/settings/privacy`
- `/settings/notifications`
- `/settings/display`
- `/settings/about`
- `/settings/profile`
- `/admin/analytics`
- broad user management beyond moderation needs

## Testing

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

## Deferred Major Features

Explicitly out of scope for v1:

- instant messaging
- Discord/Slack-style conversations
- live streaming
- long-form video platform features
- separate video pages
- game tracker/stats
- achievements/playtime/imported libraries
- third-party gaming account integrations
- React Native/mobile apps
- PWA/offline/push notifications
- Redis
- RabbitMQ
- Go microservices
- real-time feeds or notifications
- recommendations/personalized ranking
- trending algorithms
- hashtags
- mentions
- reposts/quote posts
- bookmarks/saves
- private accounts
- follower/following list pages
- creator verification
- profile pinned posts
- post/comment editing
- data export self-service
- support ticket dashboard
- analytics dashboard
- game catalog management UI
- external game database API
