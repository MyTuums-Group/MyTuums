# V1 Posting And Media Scope

This file is part of the authoritative MyTuums v1 scope. Start from [`../v1-scope.md`](../v1-scope.md) for the complete scope map.

## Posts

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

## Media

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
