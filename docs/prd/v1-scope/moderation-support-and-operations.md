# V1 Moderation, Support, Accessibility, And Operations Scope

This file is part of the authoritative MyTuums v1 scope. Start from [`../v1-scope.md`](../v1-scope.md) for the complete scope map.

## Reporting And Moderation

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

## Support And Static Pages

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

## Accessibility

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

## Analytics And Monitoring

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
