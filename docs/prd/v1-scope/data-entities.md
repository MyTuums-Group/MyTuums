# V1 Core Data Entities

This file is part of the authoritative MyTuums v1 scope. Start from [`../v1-scope.md`](../v1-scope.md) for the complete scope map.

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
