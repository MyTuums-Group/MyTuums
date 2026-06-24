# V1 Social Interactions And Notifications

This file is part of the authoritative MyTuums v1 scope. Start from [`../v1-scope.md`](../v1-scope.md) for the complete scope map.

## Comments

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

## Likes

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

## Follows And Blocks

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

## Notifications

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
