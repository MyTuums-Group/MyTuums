# V1 Account Settings And Deletion Scope

This file is part of the authoritative MyTuums v1 scope. Start from [`../v1-scope.md`](../v1-scope.md) for the complete scope map.

## Settings

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

## Account Deletion

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
