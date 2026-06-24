# V1 Feeds, Games, Search, And Public Previews

This file is part of the authoritative MyTuums v1 scope. Start from [`../v1-scope.md`](../v1-scope.md) for the complete scope map.

## Feeds

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

## Games

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

## Search

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

## Logged-Out Access

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
