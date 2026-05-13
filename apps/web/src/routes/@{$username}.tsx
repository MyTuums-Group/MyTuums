import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { trpc } from "@/lib/trpc";
import { createTrpcClient } from "@/lib/trpc";
import { PostCard } from "@/features/posts/post-card";
import { DEFAULT_POST_PAGE_LIMIT } from "@/features/posts/constants";
import { removePostFromFeedPage } from "@/features/posts/post-cache";
import type { PostFeedPage } from "@/features/posts/types";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";

export const Route = createFileRoute("/@{$username}")({
  component: ProfilePage,
});

function ProfilePage() {
  const { username } = Route.useParams();
  const [client] = useState(() => createTrpcClient());
  const [extraPages, setExtraPages] = useState<PostFeedPage[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const query = trpc.profile.getByUsername.useQuery({ username });
  const postsQuery = trpc.post.profileFeed.useQuery({
    username,
    limit: DEFAULT_POST_PAGE_LIMIT,
  });

  if (query.isLoading) return <ProfileSkeleton />;

  if (query.isError) {
    const code = query.error?.data?.code;
    if (code === "NOT_FOUND") return <ProfileNotFound />;
    return <ProfileError message={query.error.message} />;
  }

  if (!query.data) return null;

  const profile = query.data;
  const pages = postsQuery.data ? [postsQuery.data, ...extraPages] : extraPages;
  const posts = pages.flatMap((page) => page.items);
  const nextCursor =
    extraPages.length > 0
      ? extraPages[extraPages.length - 1]?.nextCursor ?? null
      : postsQuery.data?.nextCursor ?? null;

  return (
    <div className="mx-auto max-w-2xl p-4 flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-1">
            <CardTitle className="text-2xl">@{profile.username}</CardTitle>
            {profile.displayName && (
              <p className="text-lg font-semibold">{profile.displayName}</p>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {profile.bio && <p className="text-muted-foreground">{profile.bio}</p>}
          <div className="text-sm text-muted-foreground">
            <p>Follower / following counts: coming soon</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Posts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {postsQuery.isLoading && !postsQuery.data ? (
            <ProfilePostsSkeleton />
          ) : postsQuery.isError ? (
            <Alert variant="destructive">
              <AlertDescription>{postsQuery.error.message}</AlertDescription>
            </Alert>
          ) : posts.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No public posts yet.
            </p>
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
                        const nextPage = await client.post.profileFeed.query({
                          username,
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
        </CardContent>
      </Card>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-2xl p-4 flex flex-col gap-4">
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    </div>
  );
}

function ProfileNotFound() {
  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Profile not found</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This user doesn't exist or their account has been removed.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function ProfileError({ message }: { message: string }) {
  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Alert variant="destructive" className="w-full max-w-md">
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    </div>
  );
}

function ProfilePostsSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-2/5" />
    </div>
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
