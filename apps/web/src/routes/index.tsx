import { useState, type Dispatch, type SetStateAction } from "react";
import { Compass, X } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { PostCard } from "@/features/posts/post-card";
import { PostComposer } from "@/features/posts/post-composer";
import { DEFAULT_POST_PAGE_LIMIT } from "@/features/posts/constants";
import { removePostFromFeedPage } from "@/features/posts/post-cache";
import type { PostFeedPage } from "@/features/posts/types";
import { createTrpcClient, trpc } from "@/lib/trpc";

export const Route = createFileRoute("/")({
  component: HomePage,
});

type HomeFeedTab = "for_you" | "following";

const ADD_FAVORITES_PROMPT_DISMISSED_KEY =
  "mytuums.addFavoritesPrompt.dismissed";

function HomePage() {
  const [client] = useState(() => createTrpcClient());
  const [activeTab, setActiveTab] = useState<HomeFeedTab>("for_you");
  const [extraPages, setExtraPages] = useState<Record<HomeFeedTab, PostFeedPage[]>>({
    for_you: [],
    following: [],
  });
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [isAddFavoritesPromptDismissed, setIsAddFavoritesPromptDismissed] =
    useState(() => {
      if (typeof window === "undefined") return false;
      return window.localStorage.getItem(ADD_FAVORITES_PROMPT_DISMISSED_KEY) === "true";
    });

  const forYouQuery = trpc.post.forYouFeed.useQuery({
    limit: DEFAULT_POST_PAGE_LIMIT,
  });
  const followingQuery = trpc.post.followingFeed.useQuery({
    limit: DEFAULT_POST_PAGE_LIMIT,
  });

  const activeQuery = activeTab === "for_you" ? forYouQuery : followingQuery;
  const activeExtraPages = extraPages[activeTab];
  const pages = activeQuery.data
    ? [activeQuery.data, ...activeExtraPages]
    : activeExtraPages;
  const posts = pages.flatMap((page) => page.items);
  const nextCursor =
    activeExtraPages.length > 0
      ? activeExtraPages[activeExtraPages.length - 1]?.nextCursor ?? null
      : activeQuery.data?.nextCursor ?? null;
  const forYouContext =
    forYouQuery.data?.context?.kind === "for_you"
      ? forYouQuery.data.context
      : null;
  const shouldShowAddFavoritesPrompt =
    activeTab === "for_you" &&
    forYouContext?.hasFavoriteGames === false &&
    !isAddFavoritesPromptDismissed;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
      <PostComposer
        onCreated={() => {
          setExtraPages({ for_you: [], following: [] });
          setLoadMoreError(null);
        }}
      />

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Home feed</CardTitle>
            <div
              role="tablist"
              aria-label="Home feed tabs"
              className="inline-flex rounded-lg bg-muted p-1"
            >
              <FeedTabButton
                isActive={activeTab === "for_you"}
                onClick={() => {
                  setActiveTab("for_you");
                  setLoadMoreError(null);
                }}
              >
                For You
              </FeedTabButton>
              <FeedTabButton
                isActive={activeTab === "following"}
                onClick={() => {
                  setActiveTab("following");
                  setLoadMoreError(null);
                }}
              >
                Following
              </FeedTabButton>
            </div>
          </div>
        </CardHeader>
      </Card>

      {shouldShowAddFavoritesPrompt && (
        <Card className="border-border/70 bg-muted/35 shadow-sm">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="font-medium">Tune For You with favorite games</p>
              <p className="text-sm text-muted-foreground">
                You are seeing the global latest feed until you add favorites.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href="/discover">
                  <Compass weight="bold" />
                  Discover
                </a>
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Dismiss favorite games prompt"
                onClick={() => {
                  window.localStorage.setItem(
                    ADD_FAVORITES_PROMPT_DISMISSED_KEY,
                    "true",
                  );
                  setIsAddFavoritesPromptDismissed(true);
                }}
              >
                <X weight="bold" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeQuery.isLoading && !activeQuery.data ? (
        <HomeFeedSkeleton />
      ) : activeQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>{activeQuery.error.message}</AlertDescription>
        </Alert>
      ) : posts.length === 0 ? (
        <HomeEmptyState
          tab={activeTab}
          hasFavoriteGames={forYouContext?.hasFavoriteGames ?? false}
        />
      ) : (
        <>
          {posts.map((post) => (
            <PostCard
              key={post.publicId}
              post={post}
              onDeleted={(publicId) => {
                setExtraPages((current) => ({
                  ...current,
                  [activeTab]: current[activeTab].map(
                    (page) => removePostFromFeedPage(page, publicId)!,
                  ),
                }));
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
                void loadNextPage({
                  activeTab,
                  client,
                  nextCursor,
                  setExtraPages,
                  setIsLoadingMore,
                  setLoadMoreError,
                });
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

function FeedTabButton({
  children,
  isActive,
  onClick,
}: {
  children: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none ${
        isActive
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function HomeEmptyState({
  hasFavoriteGames,
  tab,
}: {
  hasFavoriteGames: boolean;
  tab: HomeFeedTab;
}) {
  if (tab === "following") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Follow players to build this feed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Following only shows posts from people you follow.</p>
          <Button variant="outline" size="sm" asChild>
            <a href="/discover">Discover players</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {hasFavoriteGames ? "No favorite-game posts yet" : "No posts yet"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>
          {hasFavoriteGames
            ? "Try Discover or add more favorite games to widen your feed."
            : "The global feed is ready. Create the first post to get things moving."}
        </p>
        {hasFavoriteGames && (
          <Button variant="outline" size="sm" asChild>
            <a href="/discover">Open Discover</a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function HomeFeedSkeleton() {
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

async function loadNextPage({
  activeTab,
  client,
  nextCursor,
  setExtraPages,
  setIsLoadingMore,
  setLoadMoreError,
}: {
  activeTab: HomeFeedTab;
  client: ReturnType<typeof createTrpcClient>;
  nextCursor: string;
  setExtraPages: Dispatch<SetStateAction<Record<HomeFeedTab, PostFeedPage[]>>>;
  setIsLoadingMore: Dispatch<SetStateAction<boolean>>;
  setLoadMoreError: Dispatch<SetStateAction<string | null>>;
}) {
  try {
    setIsLoadingMore(true);
    setLoadMoreError(null);
    const nextPage =
      activeTab === "for_you"
        ? await client.post.forYouFeed.query({
            limit: DEFAULT_POST_PAGE_LIMIT,
            cursor: nextCursor,
          })
        : await client.post.followingFeed.query({
            limit: DEFAULT_POST_PAGE_LIMIT,
            cursor: nextCursor,
          });
    setExtraPages((current) => ({
      ...current,
      [activeTab]: [...current[activeTab], nextPage],
    }));
  } catch (error) {
    setLoadMoreError(getErrorMessage(error));
  } finally {
    setIsLoadingMore(false);
  }
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
