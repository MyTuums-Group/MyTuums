# V1 Routes

This file is part of the authoritative MyTuums v1 scope. Start from [`../v1-scope.md`](../v1-scope.md) for the complete scope map.

## Public Auth Routes

- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`
- email verification route as required by BetterAuth flow

## Logged-In App Routes

- `/`
- `/discover`
- `/post/{publicId}`
- `/@{username}`
- `/game/{slug}`
- `/notifications`
- `/settings`

## Admin Routes

- `/admin`
- `/admin/reports`
- `/admin/users`
- `/admin/users/{id}`

## Static Routes

- `/terms`
- `/privacy`
- `/cookies`
- `/legal-notice`
- `/accessibility`
- `/support`
- `/contact`
- `/about`

## Deferred Routes

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
