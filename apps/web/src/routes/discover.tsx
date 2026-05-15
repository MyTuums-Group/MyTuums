import { useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { PostCard } from "@/features/posts/post-card";
import { DEFAULT_POST_PAGE_LIMIT } from "@/features/posts/constants";
import { removePostFromFeedPage } from "@/features/posts/post-cache";
import type { PostFeedPage } from "@/features/posts/types";
import { createTrpcClient, trpc } from "@/lib/trpc";

export const Route = createFileRoute("/discover")({
  validateSearch: (search) => ({
    q: typeof search.q === "string" ? search.q : "",
    game: typeof search.game === "string" ? search.game : "",
  }),
  component: DiscoverPage,
});

function DiscoverPage() {
  const { q, game } = Route.useSearch();
  const [client] = useState(() => createTrpcClient());
  const [queryDraft, setQueryDraft] = useState(q);
  const [gameDraft, setGameDraft] = useState(game);
  const [extraPages, setExtraPages] = useState<PostFeedPage[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  const searchQuery = trpc.search.useQuery(
    { query: q, limit: 8 },
    { enabled: q.trim().length > 0 },
  );
  const feedQuery = trpc.post.discoverFeed.useQuery({
    limit: DEFAULT_POST_PAGE_LIMIT,
    game: game || undefined,
  });

  const pages = feedQuery.data ? [feedQuery.data, ...extraPages] : extraPages;
  const posts = pages.flatMap((page) => page.items);
  const nextCursor =
    extraPages.length > 0
      ? extraPages[extraPages.length - 1]?.nextCursor ?? null
      : feedQuery.data?.nextCursor ?? null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>Discover</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 sm:grid-cols-[1fr_12rem_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              navigateToDiscover(queryDraft, gameDraft);
            }}
          >
            <Input
              value={queryDraft}
              onChange={(event) => setQueryDraft(event.target.value)}
              placeholder="Search players and games"
              aria-label="Search players and games"
            />
            <Input
              value={gameDraft}
              onChange={(event) => setGameDraft(event.target.value)}
              placeholder="game-slug"
              aria-label="Filter posts by game slug"
            />
            <Button type="submit">
              <MagnifyingGlass weight="bold" />
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      {q.trim().length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent>
            {searchQuery.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
            ) : searchQuery.isError ? (
              <Alert variant="destructive">
                <AlertDescription>{searchQuery.error.message}</AlertDescription>
              </Alert>
            ) : searchQuery.data?.results.length ? (
              <div className="flex flex-col gap-2">
                {searchQuery.data.results.map((item) => (
                  <a
                    key={`${item.type}-${item.id}`}
                    href={discoverSearchResultHref(item, q)}
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <span className="font-medium">{item.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {item.type === "game" ? "Game" : "Player"}
                    </span>
                  </a>
                ))}
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
          <CardTitle>{game ? `Latest posts tagged ${game}` : "Latest posts"}</CardTitle>
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
                  current.map((page) => removePostFromFeedPage(page, publicId)!),
                );
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
                    setIsLoadingMore(true);
                    setLoadMoreError(null);
                    const nextPage = await client.post.discoverFeed.query({
                      limit: DEFAULT_POST_PAGE_LIMIT,
                      cursor: nextCursor,
                      game: game || undefined,
                    });
                    setExtraPages((current) => [...current, nextPage]);
                  } catch (error) {
                    setLoadMoreError(getErrorMessage(error));
                  } finally {
                    setIsLoadingMore(false);
                  }
                })();
              }}
            >
              {isLoadingMore ? "Loading..." : "Load more"}
            </Button>
          )}
        </>
      )}
    </div>
  );
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
  );
}

function navigateToDiscover(query: string, game: string) {
  const search = new URLSearchParams();
  const trimmedQuery = query.trim();
  const trimmedGame = game.trim();
  if (trimmedQuery) search.set("q", trimmedQuery);
  if (trimmedGame) search.set("game", trimmedGame);
  const suffix = search.toString();
  window.location.href = suffix ? `/discover?${suffix}` : "/discover";
}

function discoverSearchResultHref(
  item: { type: "user" | "game"; href: string },
  query: string,
) {
  if (item.type === "user") return item.href;

  const slug = item.href.split("/").filter(Boolean).at(-1);
  if (!slug) return "/discover";

  const search = new URLSearchParams();
  if (query.trim()) search.set("q", query.trim());
  search.set("game", slug);
  return `/discover?${search.toString()}`;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "Something went wrong while loading more posts.";
}
