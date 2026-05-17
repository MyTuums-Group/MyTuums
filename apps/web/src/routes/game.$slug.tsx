import { useState } from "react"
import { HeartStraight } from "@phosphor-icons/react"
import { createFileRoute } from "@tanstack/react-router"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { PostCard } from "@/features/posts/post-card"
import { PostComposer } from "@/features/posts/post-composer"
import { DEFAULT_POST_PAGE_LIMIT } from "@/features/posts/constants"
import { removePostFromFeedPage } from "@/features/posts/post-cache"
import type { PostFeedPage } from "@/features/posts/types"
import { createTrpcClient, trpc } from "@/lib/trpc"

export const Route = createFileRoute("/game/$slug")({
  component: GamePage,
})

function GamePage() {
  const { slug } = Route.useParams()
  const [client] = useState(() => createTrpcClient())
  const [extraPages, setExtraPages] = useState<PostFeedPage[]>([])
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)
  const utils = trpc.useUtils()
  const detailQuery = trpc.game.detail.useQuery({ slug })
  const feedQuery = trpc.game.feed.useQuery({
    slug,
    limit: DEFAULT_POST_PAGE_LIMIT,
  })
  const currentAppUser = trpc.currentAppUser.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  })
  const favoriteMutation = trpc.game.setFavorite.useMutation({
    async onSuccess() {
      await Promise.all([
        utils.game.detail.invalidate({ slug }),
        utils.game.myFavorites.invalidate(),
      ])
    },
  })

  if (detailQuery.isLoading) return <GameSkeleton />

  if (detailQuery.isError) {
    const code = detailQuery.error?.data?.code
    if (code === "NOT_FOUND") return <GameNotFound />
    return <GameError message={detailQuery.error.message} />
  }

  if (!detailQuery.data) return null

  const { game, isFavorite } = detailQuery.data
  const canUseFavoriteAction =
    currentAppUser.data?.kind === "active_onboarded_profile"
  const canComposePosts = canUseFavoriteAction && game.isActive
  const favoriteActionDisabled =
    favoriteMutation.isPending ||
    currentAppUser.isLoading ||
    (!game.isActive && !isFavorite)
  const pages = feedQuery.data ? [feedQuery.data, ...extraPages] : extraPages
  const posts = pages.flatMap((page) => page.items)
  const nextCursor =
    extraPages.length > 0
      ? (extraPages[extraPages.length - 1]?.nextCursor ?? null)
      : (feedQuery.data?.nextCursor ?? null)

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
      <Card className="overflow-hidden shadow-sm">
        <div className="grid gap-0 sm:grid-cols-[12rem_1fr]">
          <div className="bg-muted">
            <img
              src={game.coverImageUrl ?? "/game-covers/default.svg"}
              alt=""
              className="aspect-[4/5] h-full w-full object-cover"
            />
          </div>
          <div className="flex flex-col gap-4 p-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="font-heading text-2xl font-semibold tracking-tight">
                    {game.name}
                  </h1>
                  {!game.isActive && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Existing posts remain available for this game.
                    </p>
                  )}
                </div>
                {canUseFavoriteAction && (
                  <Button
                    type="button"
                    variant={isFavorite ? "outline" : "default"}
                    disabled={favoriteActionDisabled}
                    onClick={() => {
                      favoriteMutation.mutate({
                        slug: game.slug,
                        favorite: !isFavorite,
                      })
                    }}
                  >
                    <HeartStraight weight={isFavorite ? "fill" : "bold"} />
                    {isFavorite ? "Remove favorite" : "Add favorite"}
                  </Button>
                )}
              </div>
              {game.description && (
                <p className="text-sm leading-6 text-muted-foreground">
                  {game.description}
                </p>
              )}
            </div>
            {favoriteMutation.isError && (
              <Alert variant="destructive">
                <AlertDescription>
                  {favoriteMutation.error.message}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </Card>

      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>Latest posts</CardTitle>
        </CardHeader>
      </Card>

      {canComposePosts && (
        <PostComposer
          initialGameId={game.id}
          onCreated={() => {
            setExtraPages([])
            setLoadMoreError(null)
            void utils.game.feed.invalidate({
              slug,
              limit: DEFAULT_POST_PAGE_LIMIT,
            })
          }}
        />
      )}

      {feedQuery.isLoading && !feedQuery.data ? (
        <GameFeedSkeleton />
      ) : feedQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>{feedQuery.error.message}</AlertDescription>
        </Alert>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            No public posts are tagged with this game yet.
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
                    const nextPage = await client.game.feed.query({
                      slug,
                      limit: DEFAULT_POST_PAGE_LIMIT,
                      cursor: nextCursor,
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

function GameSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
      <Card>
        <CardHeader className="space-y-3">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardHeader>
      </Card>
    </div>
  )
}

function GameFeedSkeleton() {
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

function GameNotFound() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Game not found</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          This game is not in the catalog.
        </CardContent>
      </Card>
    </div>
  )
}

function GameError({ message }: { message: string }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
      <Alert variant="destructive">
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    </div>
  )
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
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
