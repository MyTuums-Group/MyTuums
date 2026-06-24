# V1 Auth And Identity Scope

This file is part of the authoritative MyTuums v1 scope. Start from [`../v1-scope.md`](../v1-scope.md) for the complete scope map.

## Authentication

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

## Onboarding

After email verification, onboarding requires:

- unique username

Optional onboarding fields:

- display name
- bio
- avatar
- up to 5 favorite games

Banner upload is only available later in settings.

After onboarding, users land on `/` with the `For You` tab selected. Favorite games are optional. If the user selected favorite games, `For You` uses them as a simple chronological taste signal. If the user skipped favorite games, `For You` falls back to global latest posts and shows an unobtrusive prompt to add favorite games later.

## Identity

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
