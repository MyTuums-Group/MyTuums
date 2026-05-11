# Fix plan: Issue #5 — Text posts + post detail pages

Issue: https://github.com/ElCabrii/MyTuums/issues/5
State at planning time: OPEN, label `ready-for-agent`
Created: 2026-05-11 12:26 local

## Goal

Implement public text-only posts for v1:

- authenticated users can compose posts from `/`
- text is normalized, trimmed, grapheme-limited to 500 visible characters, and stored as plain text
- safe `http://` / `https://` links render as external links, while bare domains, emails, and unsafe schemes remain text
- new posts optimistically appear at the top of the For You feed
- `/post/$publicId` renders a logged-out-visible post preview/detail page
- authors can permanently self-delete posts from feed/detail
- deleted posts disappear from all normal views, including the author’s own normal views
- staff/moderation access to deleted content remains possible through moderation context, not normal user surfaces

## Current codebase findings

Relevant existing pieces:

- `packages/db/src/schema.ts` already has `post.publicId`, `post.authorId`, `post.text`, optional `post.gameTagId`, optional `post.mediaAttachmentId`, counts, timestamps, `deletedAt`, and `removedAt`.
- `packages/db/migrations/0000_powerful_ender_wiggin.sql` already creates the `post` table and `post_public_id_unique` index.
- `apps/api/src/services/post/post.policy.ts` already validates post body text using normalized line endings + trimmed Unicode grapheme clusters and `POST_TEXT_MAX_LENGTH = 500`.
- `apps/api/src/services/feed/*` already has feed/detail/profile read primitives and visibility tests, but this is not exposed through tRPC yet.
- `apps/api/src/app-router.ts` currently exposes `profile`, `search`, `me`, and `health`, but no post/feed router.
- `apps/web/src/routes/index.tsx` is still a “main feed coming soon” scaffold.
- `apps/web/src/routes/@{$username}.tsx` has a posts placeholder saying posts come in #5.
- `apps/web/src/routes/-root-guard.ts` allows public profile previews but does not yet allow logged-out `/post/...` previews.

Important discovered bug to fix as part of #5:

- Existing feed visibility currently lets authors see their own `deletedAt` posts in normal views:
  - `apps/api/src/services/feed/index.ts` allows `viewer.userId === post.authorId` before checking deletion/removal.
  - `apps/api/src/services/feed/production.ts` has a similar author branch in `postVisibilityPredicate`.
- Issue #5 explicitly says self-deleted posts disappear from all normal user views including the author’s.

Scope boundaries / adjacent issues:

- #6 owns media upload, attaching media to posts, lightbox/video behavior, signed read URL display polish, and cleanup. #5 should not implement uploads. It may preserve/return nullable media fields only if cheap, but media UI can be a placeholder until #6.
- #7 owns the full feed engine/tabs/discover behavior. #5 only needs enough For You/profile/feed plumbing to create posts, show them, and optimistically insert on `/`.
- #8 owns comments. #5 should render a comment-section placeholder/count on post detail but not implement comment creation/listing.
- #9 owns like/follow/block interactions. #5 should display existing `likeCount`/`commentCount` and avoid adding any self-like prohibition, but not build the like mutation/UI.
- Search currently appears to search users/games only, not posts; therefore “deleted posts excluded from search results” is already satisfied unless post search is added while implementing #5.

## Recommended architecture

Keep routers thin and keep raw DB imports behind service adapters.

Use a small post module rather than spreading post behavior across routers:

- `apps/api/src/services/post/post.core.ts`
  - pure-ish orchestration: create post, delete own post, map service errors
  - depends on a `PostRepository` interface, not Drizzle
  - calls existing `createPostBody` validation
- `apps/api/src/services/post/post.adapter.ts`
  - Drizzle-backed repository
  - owns public ID generation collision retry and DB writes
  - allowed to import `@workspace/db` under the existing DB seam rule
- `apps/api/src/routers/post.ts`
  - tRPC endpoints and zod input validation
  - maps service errors to `TRPCError`
  - exposes only public/opaque DTOs; never expose `post.id` or raw `authorId` to the client
- `apps/web/src/features/posts/*`
  - post composer, post card/detail display, linkify helper, local text-count helper

Suggested tRPC shape:

```ts
post: {
  forYouFeed: protectedProcedure
    .input({ cursor?: string, limit?: number })
    .query(...) // returns { items: PostView[], nextCursor: string | null }

  profileFeed: publicProcedure
    .input({ username: string, cursor?: string, limit?: number })
    .query(...) // logged-out visible, honors visibility

  detail: publicProcedure
    .input({ publicId: string })
    .query(...) // returns PostView or NOT_FOUND

  create: protectedProcedure
    .input({ text: string, gameTagId?: string | null })
    .mutation(...) // returns PostView suitable for optimistic replacement

  deleteOwn: protectedProcedure
    .input({ publicId: string })
    .mutation(...) // returns { publicId: string }
}
```

Suggested `PostView` DTO:

```ts
type PostView = {
  publicId: string;
  text: string;
  author: {
    username: string;
    displayName: string | null;
    avatarUrl?: string | null; // only if already cheap/available; otherwise defer to #6/profile-media work
  };
  gameTag: null | {
    id: string;
    slug: string;
    name: string;
  };
  media: null; // keep null for #5 text-only posts; #6 can expand this
  likeCount: number;
  commentCount: number;
  createdAt: Date;
  updatedAt: Date;
  canDelete: boolean;
};
```

Cursor interface note:

- The existing feed service uses internal `(createdAt, id)` cursors. That is fine inside the API service layer.
- The public tRPC API should encode/decode cursors as opaque strings, e.g. base64url JSON with validation.
- Do not return internal UUIDs as client-visible cursor data.

Public ID note:

- Generate opaque route-safe IDs with Node crypto, not internal UUIDs and not sequential IDs.
- Recommended format: `randomBytes(16).toString("base64url")` → 22 chars, URL-safe, non-UUID-looking.
- Retry on `post_public_id_unique` collision, with a small hard cap (e.g. 3 attempts) and a server error if exhausted.

TanStack Router note verified from current docs:

- Dynamic file routes use `$` params, e.g. file `posts.$postId.tsx` with `createFileRoute('/posts/$postId')`.
- For this app, use `apps/web/src/routes/post.$publicId.tsx` and `createFileRoute('/post/$publicId')`.

## Implementation tasks

### Task 1 — Add failing backend post-service tests

Files:

- create `apps/api/src/__tests__/post-service.test.ts`
- update only test helpers as needed

Test cases:

1. `createPost` rejects whitespace-only text.
2. `createPost` rejects text over 500 trimmed grapheme clusters.
3. `createPost` normalizes CRLF/CR to LF and stores trimmed text.
4. `createPost` stores `authorId`, optional `gameTagId`, `createdAt`, and an opaque `publicId`.
5. generated `publicId` is not a UUID and matches only URL-safe chars.
6. `deleteOwnPost` marks the author’s post deleted permanently.
7. `deleteOwnPost` refuses deletion by a non-author.
8. already-deleted posts are unavailable to normal post reads.

Use an in-memory repository fake for this test so the service interface is shaped before Drizzle code exists.

Run and verify red:

```bash
pnpm vitest run apps/api/src/__tests__/post-service.test.ts
```

Expected: fails because service/core implementation does not exist yet.

### Task 2 — Implement post core service behind a repository interface

Files:

- create `apps/api/src/services/post/post.core.ts`
- update `apps/api/src/services/post/index.ts`

Implementation details:

- Reuse `createPostBody` from `post.policy.ts` for all body validation.
- Keep text storage plain; no HTML, markdown, or link expansion server-side.
- Service input should be minimal:
  - `authorId: string`
  - `text: string`
  - `gameTagId?: string | null`
- If `gameTagId` is supplied, ask the repository to verify it points to an active game. Return a typed `invalid_game_tag` service error if missing/inactive.
- Do not accept `mediaAttachmentId` in #5. #6 will atomically attach ready media.
- Return a clean service row suitable for later mapping into `PostView`.
- Model service errors as tagged unions, not thrown generic errors.

Run:

```bash
pnpm vitest run apps/api/src/__tests__/post-service.test.ts
pnpm --filter @workspace/api typecheck
```

Expected: green for service tests and API typecheck.

### Task 3 — Fix existing feed visibility semantics for self-deleted posts

Files:

- update `apps/api/src/__tests__/feed-visibility.test.ts`
- update `apps/api/src/services/feed/index.ts`
- update `apps/api/src/services/feed/production.ts`

Tests to add:

1. A normal author viewer does not see their own `deletedAt` post in For You/profile/detail.
2. Another normal viewer does not see a deleted post.
3. A staff/moderation viewer can still fetch deleted content through moderation-capable visibility behavior if that is the existing intended seam.

Implementation shape:

- For normal visibility, `deletedAt !== null` should hide the post before the self-author allow branch.
- Keep moderation/staff access separate and explicit.
- Do not accidentally break existing blocked/suspended/removed tests.

Run:

```bash
pnpm vitest run apps/api/src/__tests__/feed-visibility.test.ts
pnpm --filter @workspace/api typecheck
```

Expected: all feed visibility tests pass.

### Task 4 — Enrich feed/detail read rows for client post rendering

Files:

- update `apps/api/src/services/feed/index.ts`
- update `apps/api/src/services/feed/production.ts`
- update `apps/api/src/__tests__/feed-visibility.test.ts` or add `apps/api/src/__tests__/post-read-model.test.ts`

Needed fields for #5 UI:

- post public ID, text, counts, timestamps
- author username + display name
- optional game tag `{ id, slug, name }`
- nullable media field left as null for text-only #5 unless an attached-media row is already available without touching #6
- `canDelete`, computed from viewer context and author ownership, and false for logged-out viewers

Implementation guidance:

- Join `profile` on `post.authorId = profile.userId` for author info.
- Left join `game` on `post.gameTagId = game.id` for game tag display.
- Keep internal fields (`id`, `authorId`, `deletedAt`, `removedAt`) available inside the service for visibility/cursor computation, but strip them before tRPC output.
- If profile is unexpectedly missing for an author, either exclude the post from normal views or return a safe fallback; prefer excluding because issue #5 is blocked by onboarding and authors should have profiles.

Run:

```bash
pnpm vitest run apps/api/src/__tests__/feed-visibility.test.ts
pnpm --filter @workspace/api typecheck
```

### Task 5 — Add Drizzle-backed post create/delete adapter

Files:

- create `apps/api/src/services/post/post.adapter.ts`
- update `apps/api/src/services/post/index.ts`

Implementation details:

- Generate public IDs using `node:crypto` (`randomBytes(16).toString('base64url')`).
- Insert `post` with:
  - generated `publicId`
  - `authorId`
  - validated trimmed `text`
  - nullable `gameTagId`
  - server-side timestamps/defaults
- Retry public ID generation on unique violation only.
- `deleteOwnPost` should update `deletedAt` and `updatedAt` where `publicId`, `authorId`, and `deletedAt IS NULL` match.
- Return a typed not-found/not-author/already-deleted error from the service. For public UX, the router can map not-author to `FORBIDDEN` or a generic unavailable response depending on the endpoint.
- Do not hard-delete rows.
- Do not set `removedAt`; that belongs to moderation (#14).

Run:

```bash
pnpm --filter @workspace/api typecheck
pnpm --filter @workspace/api lint
```

### Task 6 — Add tRPC post router and app-router wiring

Files:

- create `apps/api/src/routers/post.ts`
- update `apps/api/src/app-router.ts`
- add transport error helpers if useful, e.g. `apps/api/src/transport/post-errors.ts`

Endpoint details:

- `post.create`
  - protected
  - input: `{ text: string; gameTagId?: string | null }`
  - returns `PostView`
  - rejects inactive/profileless/unverified users by relying on existing root/app-user state where possible, but also guard server-side if a helper exists.
- `post.deleteOwn`
  - protected
  - input: `{ publicId: string }`
  - returns `{ publicId }`
- `post.detail`
  - public
  - input: `{ publicId: string }`
  - logged-out session should build a logged-out `ViewerContext`
  - returns `NOT_FOUND`/unavailable for missing/deleted/invisible posts
- `post.forYouFeed`
  - protected
  - input: `{ cursor?: string; limit?: number }`
  - limit clamp should reuse existing feed page limit rules
  - returns opaque `nextCursor`
- `post.profileFeed`
  - public
  - input: `{ username: string; cursor?: string; limit?: number }`
  - resolves username to profile/user internally and honors visibility

Validation:

- `publicId` zod regex: URL-safe, reasonable length (e.g. `^[A-Za-z0-9_-]{8,64}$`).
- `text` input should still be string; service owns final normalization/validation.
- `cursor` decode failures should return `BAD_REQUEST`.

Run:

```bash
pnpm --filter @workspace/api typecheck
pnpm --filter @workspace/api lint
```

### Task 7 — Add frontend post text/link helpers with tests

Files:

- create `apps/web/src/features/posts/post-text.ts`
- create `apps/web/src/features/posts/linkify.ts`
- create `apps/web/src/__tests__/post-text.test.ts`
- create `apps/web/src/__tests__/linkify.test.ts`
- optionally add `@workspace/types` as an explicit web dependency if importing `POST_TEXT_MAX_LENGTH`

Helper requirements:

- Normalize line endings exactly like backend (`\r\n?` → `\n`).
- Trim before counting/submitting.
- Count Unicode grapheme clusters with `Intl.Segmenter` and the same fallback style as backend.
- Enforce 500 visible characters client-side for UX, while backend remains authoritative.
- Linkify only `http://` and `https://` URLs.
- Preserve plain text segments and never use `dangerouslySetInnerHTML`.
- Exclude bare domains, emails, and unsafe schemes (`javascript:`, `data:`, etc.).
- Avoid including common trailing punctuation in links when practical.

Link rendering attributes in the React component must be:

```tsx
<a href={url} target="_blank" rel="nofollow noopener noreferrer">
```

Run and verify red then green:

```bash
pnpm vitest run apps/web/src/__tests__/post-text.test.ts apps/web/src/__tests__/linkify.test.ts
pnpm --filter web typecheck
```

Note: the web package name is `web`, so use `pnpm --filter web ...`.

### Task 8 — Build reusable post UI components

Files:

- create `apps/web/src/features/posts/post-card.tsx`
- create `apps/web/src/features/posts/post-composer.tsx`
- create `apps/web/src/features/posts/post-feed-list.tsx` if useful

Component behavior:

`PostComposer`:

- textarea at top of `/`
- visible character count
- disabled Post button when empty, too long, or mutation pending
- calls `trpc.post.create.useMutation`
- trims/normalizes before submit
- shows a small inline error on API failure
- no edit affordance
- optional game tag can be omitted in the first UI pass unless there is already a game picker component to reuse

Optimistic insert:

- Use `trpc.useUtils()` / query client helpers.
- On mutate, insert a temporary post at the top of the current For You feed cache.
- On success, replace the temporary post with the server post.
- On error, rollback to previous cache.
- Always invalidate For You feed after settled to reconcile server ordering/filtering.

`PostCard`:

- shows author display name/username, timestamp, linked text, game tag if present, counts
- links card/detail action to `/post/$publicId`
- shows Delete only when `post.canDelete` is true
- delete removes from feed/profile caches optimistically and invalidates detail/feed queries
- if media is null, render nothing; #6 can extend this component later

Run:

```bash
pnpm --filter web typecheck
pnpm --filter web lint
```

### Task 9 — Replace `/` scaffold with authenticated For You feed

Files:

- update `apps/web/src/routes/index.tsx`

Behavior:

- Render `PostComposer` at the top.
- Query `trpc.post.forYouFeed` for the first page.
- Render posts newest-first via `PostCard`.
- Add basic loading skeleton and error state using existing ShadCN components.
- Empty state: “No posts yet” with a nudge to create the first post.
- Add a “Load more” button only if `nextCursor` exists. Infinite scrolling can wait for #7.

Run:

```bash
pnpm --filter web typecheck
pnpm --filter web lint
```

### Task 10 — Add public post detail route and route guard allowance

Files:

- create `apps/web/src/routes/post.$publicId.tsx`
- update `apps/web/src/routes/-root-guard.ts`
- update `apps/web/src/__tests__/root-guard.test.ts`

Route behavior:

- `createFileRoute('/post/$publicId')`, per TanStack Router docs.
- Query `trpc.post.detail({ publicId })` using `Route.useParams()`.
- Logged-out users can view the page if the post is visible.
- Render all #5 fields from `PostView`: text, author info, timestamp, game tag, like/comment counts, and no edit controls.
- Show a comment-section placeholder below the post, e.g. “Comments coming soon” / count, linking to #8 scope in code comments only if useful.
- If API returns `NOT_FOUND`, render an unavailable state, not a raw error dump.
- If `canDelete`, show delete button and navigate back to `/` or show unavailable after deletion.

Route guard tests to add:

- logged-out `/post/abc123xyz` is allowed
- logged-out malformed protected paths still redirect to `/login`
- existing public profile tests still pass

Run:

```bash
pnpm vitest run apps/web/src/__tests__/root-guard.test.ts
pnpm --filter web typecheck
```

### Task 11 — Add posts to public profile pages

Files:

- update `apps/web/src/routes/@{$username}.tsx`

Behavior:

- Replace the “Posts coming in #5” placeholder with `trpc.post.profileFeed({ username })`.
- Logged-out profile viewers should see visible posts.
- Deleted posts must not render because backend visibility already excludes them.
- Reuse `PostCard` and the same empty/loading/error patterns.
- If the viewer owns a post, Delete should work here too and remove the post from profile/feed caches.

Run:

```bash
pnpm --filter web typecheck
pnpm --filter web lint
```

### Task 12 — Integration verification

Run targeted tests first:

```bash
pnpm vitest run apps/api/src/__tests__/post-service.test.ts apps/api/src/__tests__/feed-visibility.test.ts
pnpm vitest run apps/web/src/__tests__/post-text.test.ts apps/web/src/__tests__/linkify.test.ts apps/web/src/__tests__/root-guard.test.ts
```

Then run package checks:

```bash
pnpm --filter @workspace/api typecheck
pnpm --filter @workspace/api lint
pnpm --filter web typecheck
pnpm --filter web lint
```

Then full repo checks if the targeted checks are green:

```bash
pnpm typecheck
pnpm lint
pnpm build
pnpm test
```

Manual smoke test with dev servers:

1. Log in as an onboarded user.
2. Visit `/`; composer is visible.
3. Submit whitespace-only text; it is rejected.
4. Submit a normal post with a `https://` URL and a bare domain.
5. New post appears immediately at feed top.
6. URL is a safe external link; bare domain is plain text.
7. Open `/post/$publicId`; detail renders all fields.
8. Open the same URL logged out/incognito; preview renders.
9. Delete the post as the author.
10. Confirm it disappears from `/`, `/@username`, and `/post/$publicId` for normal logged-in/logged-out users.
11. Confirm no edit controls exist.

## Risks and tradeoffs

- The existing feed service overlaps with #7’s larger feed-engine requirement. For #5, do not redesign the whole feed engine unless the current service blocks correctness. Keep changes local and leave #7’s deeper feed architecture for that issue.
- Media display in #5 conflicts with #6 ownership. Best path: keep the post DTO extensible with `media: null` and do not build upload/lightbox/video behavior here.
- Optimistic cache updates can become brittle if cache keys vary by input. Keep a small helper for updating first-page For You/profile caches, and invalidate after settled.
- Public profile posts require username-to-user resolution. Put this behind the service/router, not in the client.
- Be careful not to leak internal `post.id` through cursors, detail data, route params, or React keys. Use `publicId` for client keys.

## Execution approach

This is a multi-slice implementation. Recommended execution style:

1. Backend TDD slice: Tasks 1–6.
2. Frontend helper TDD slice: Task 7.
3. Frontend UI/routes slice: Tasks 8–11.
4. Integration verification: Task 12.

If using subagents, do not run parallel implementers on overlapping files. Good independent splits are:

- backend post service/router
- frontend text/link helpers
- frontend UI/routes after the API contract is stable

Each implementation slice should get a spec compliance review first, then a code quality review, before moving on.

## Definition of done

- Every acceptance criterion in #5 is either implemented or explicitly deferred to its owning issue (#6 media, #8 comments, #9 likes) without blocking text-post/detail behavior.
- tRPC exposes post create/delete/detail/feed/profile-feed endpoints.
- `/` renders composer + For You posts for authenticated users.
- `/post/$publicId` renders for logged-out visitors when visible.
- Deleted posts are hidden from all normal views, including the author’s.
- No internal UUIDs are exposed in route URLs or public API cursors.
- Targeted tests and repo checks pass.
