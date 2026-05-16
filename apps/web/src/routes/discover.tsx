import { useEffect, useState } from "react"
import { GameController, MagnifyingGlass, User } from "@phosphor-icons/react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { SEARCH_MIN_QUERY_LENGTH } from "@workspace/types"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "@workspace/ui/lib/utils"
import { PostCard } from "@/features/posts/post-card"
import { DEFAULT_POST_PAGE_LIMIT } from "@/features/posts/constants"
import { removePostFromFeedPage } from "@/features/posts/post-cache"
import type { PostFeedPage } from "@/features/posts/types"
import { createTrpcClient, trpc } from "@/lib/trpc"

export const Route = createFileRoute("/discover")({
  validateSearch: (search) => ({
    q: typeof search.q === "string" ? search.q : "",
    game: typeof search.game === "string" ? search.game : "",
  }),
  component: DiscoverPage,
})

function DiscoverPage() {
  const navigate = useNavigate()
  const { q, game } = Route.useSearch()
  const [client] = useState(() => createTrpcClient())
  const [queryDraft, setQueryDraft] = useState(q)
  const [gameDraft, setGameDraft] = useState(game)
  const [extraPages, setExtraPages] = useState<PostFeedPage[]>([])
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)

  const gamesQuery = trpc.game.listActive.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    setQueryDraft(q)
  }, [q])

  useEffect(() => {
    setGameDraft(game)
  }, [game])

  useEffect(() => {
    setExtraPages([])
    setLoadMoreError(null)
  }, [game, q])

  useEffect(() => {
    if (gamesQuery.status !== "success") return
    const allowed = new Set(gamesQuery.data.map((g) => g.slug))
    if (game && !allowed.has(game)) {
      void navigate({
        to: "/discover",
        search: { q, game: "" },
        replace: true,
      })
    }
  }, [game, gamesQuery.data, gamesQuery.status, navigate, q])

  const trimmedSearchQuery = q.trim()
  const canRunSearch = trimmedSearchQuery.length >= SEARCH_MIN_QUERY_LENGTH
  const searchQuery = trpc.search.useQuery(
    { query: trimmedSearchQuery, limit: 20 },
    { enabled: canRunSearch }
  )
  const feedQuery = trpc.post.discoverFeed.useQuery({
    limit: DEFAULT_POST_PAGE_LIMIT,
    game: game || undefined,
  })

  const pages = feedQuery.data ? [feedQuery.data, ...extraPages] : extraPages
  const posts = pages.flatMap((page) => page.items)
  const nextCursor =
    extraPages.length > 0
      ? (extraPages[extraPages.length - 1]?.nextCursor ?? null)
      : (feedQuery.data?.nextCursor ?? null)

  const allowedSlugs =
    gamesQuery.status === "success"
      ? new Set(gamesQuery.data.map((g) => g.slug))
      : null
  const selectValue =
    gameDraft === "" || !allowedSlugs
      ? gameDraft
      : allowedSlugs.has(gameDraft)
        ? gameDraft
        : ""

  const activeGameName = gamesQuery.data?.find((g) => g.slug === game)?.name

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>Discover</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 sm:grid-cols-[1fr_minmax(10rem,14rem)_auto]"
            onSubmit={(event) => {
              event.preventDefault()
              applyDiscoverSearch(navigate, queryDraft, gameDraft)
            }}
          >
            <Input
              value={queryDraft}
              onChange={(event) => setQueryDraft(event.target.value)}
              placeholder="Search players and games"
              aria-label="Search players and games"
            />
            <select
              className={cn(
                "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none md:text-sm",
                "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                "disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
              )}
              value={selectValue}
              onChange={(event) => setGameDraft(event.target.value)}
              disabled={gamesQuery.isLoading || gamesQuery.isError}
              aria-label="Filter posts by game"
            >
              <option value="">All games</option>
              {gamesQuery.data?.map((catalogGame) => (
                <option key={catalogGame.id} value={catalogGame.slug}>
                  {catalogGame.name}
                </option>
              ))}
            </select>
            <Button type="submit">
              <MagnifyingGlass weight="bold" />
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      {trimmedSearchQuery.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent>
            {!canRunSearch ? (
              <p className="text-sm text-muted-foreground">Keep typing...</p>
            ) : searchQuery.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
            ) : searchQuery.isError ? (
              <Alert variant="destructive">
                <AlertDescription>{searchQuery.error.message}</AlertDescription>
              </Alert>
            ) : searchQuery.data?.users.length ||
              searchQuery.data?.games.length ? (
              <div className="flex flex-col gap-5">
                {searchQuery.data.users.length ? (
                  <SearchResultGroup
                    title="Users"
                    icon={User}
                    items={searchQuery.data.users.map((item) => ({
                      id: item.id,
                      href: item.href,
                      label: item.label,
                      description: `@${item.username}`,
                    }))}
                  />
                ) : null}
                {searchQuery.data.games.length ? (
                  <SearchResultGroup
                    title="Games"
                    icon={GameController}
                    items={searchQuery.data.games.map((item) => ({
                      id: item.id,
                      href: item.href,
                      label: item.label,
                      description: "Game",
                    }))}
                  />
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No players or games match this search.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>
            {game
              ? `Latest posts tagged ${activeGameName ?? game}`
              : "Latest posts"}
          </CardTitle>
        </CardHeader>
      </Card>

      {feedQuery.isLoading && !feedQuery.data ? (
        <DiscoverFeedSkeleton />
      ) : feedQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>{feedQuery.error.message}</AlertDescription>
        </Alert>
      ) : posts.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No results</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            No posts match this discovery view yet.
          </CardContent>
        </Card>
      ) : (
        <>
          {posts.map((post) => (
            <PostCard
              key={post.publicId}
              post={post}
              onDeleted={(publicId) => {
                setExtraPages((current) =>
                  current.map((page) => removePostFromFeedPage(page, publicId)!)
                )
              }}
            />
          ))}

          {loadMoreError && (
            <Alert variant="destructive">
              <AlertDescription>{loadMoreError}</AlertDescription>
            </Alert>
          )}

          {nextCursor && (
            <Button
              variant="outline"
              disabled={isLoadingMore}
              onClick={() => {
                void (async () => {
                  try {
                    setIsLoadingMore(true)
                    setLoadMoreError(null)
                    const nextPage = await client.post.discoverFeed.query({
                      limit: DEFAULT_POST_PAGE_LIMIT,
                      cursor: nextCursor,
                      game: game || undefined,
                    })
                    setExtraPages((current) => [...current, nextPage])
                  } catch (error) {
                    setLoadMoreError(getErrorMessage(error))
                  } finally {
                    setIsLoadingMore(false)
                  }
                })()
              }}
            >
              {isLoadingMore ? "Loading..." : "Load more"}
            </Button>
          )}
        </>
      )}
    </div>
  )
}

function SearchResultGroup({
  icon: Icon,
  items,
  title,
}: {
  icon: typeof User
  items: Array<{
    id: string
    href: string
    label: string
    description: string
  }>
  title: string
}) {
  return (
    <section
      className="space-y-2"
      aria-labelledby={`discover-${title.toLowerCase()}`}
    >
      <h2
        id={`discover-${title.toLowerCase()}`}
        className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase"
      >
        {title}
      </h2>
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <a
            key={item.id}
            href={item.href}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground ring-1 ring-foreground/10">
              <Icon weight="bold" />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-medium">{item.label}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {item.description}
              </span>
            </span>
          </a>
        ))}
      </div>
    </section>
  )
}

function DiscoverFeedSkeleton() {
  return (
    <>
      {Array.from({ length: 2 }).map((_, index) => (
        <Card key={index}>
          <CardHeader className="space-y-3">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-28" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-1/3" />
          </CardContent>
        </Card>
      ))}
    </>
  )
}

type DiscoverNavigate = ReturnType<typeof useNavigate>

function applyDiscoverSearch(
  navigate: DiscoverNavigate,
  query: string,
  gameSlug: string
) {
  const trimmedQuery = query.trim()
  const trimmedGame = gameSlug.trim()
  void navigate({
    to: "/discover",
    search: { q: trimmedQuery, game: trimmedGame },
  })
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message
  }

  return "Something went wrong while loading more posts."
}
