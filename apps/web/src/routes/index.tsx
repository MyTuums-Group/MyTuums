import { useState } from "react";
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

function HomePage() {
  const [client] = useState(() => createTrpcClient());
  const [extraPages, setExtraPages] = useState<PostFeedPage[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const feedQuery = trpc.post.forYouFeed.useQuery({
    limit: DEFAULT_POST_PAGE_LIMIT,
  });

  const pages = feedQuery.data ? [feedQuery.data, ...extraPages] : extraPages;
  const posts = pages.flatMap((page) => page.items);
  const nextCursor =
    extraPages.length > 0
      ? extraPages[extraPages.length - 1]?.nextCursor ?? null
      : feedQuery.data?.nextCursor ?? null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
      <PostComposer
        onCreated={() => {
          setExtraPages([]);
          setLoadMoreError(null);
        }}
      />

      {feedQuery.isLoading && !feedQuery.data ? (
        <HomeFeedSkeleton />
      ) : feedQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>{feedQuery.error.message}</AlertDescription>
        </Alert>
      ) : posts.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No posts yet</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Your feed is ready. Create the first post to get things moving.
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
                  if (!nextCursor) return;

                  try {
                    setIsLoadingMore(true);
                    setLoadMoreError(null);
                    const nextPage = await client.post.forYouFeed.query({
                      limit: DEFAULT_POST_PAGE_LIMIT,
                      cursor: nextCursor,
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
