import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { trpc } from "@/lib/trpc";
import { createTrpcClient } from "@/lib/trpc";
import { PostCard } from "@/features/posts/post-card";
import { DEFAULT_POST_PAGE_LIMIT } from "@/features/posts/constants";
import { removePostFromFeedPage } from "@/features/posts/post-cache";
import type { PostFeedPage } from "@/features/posts/types";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { ReportSheet } from "@/features/moderation/report-sheet";
import { cn } from "@workspace/ui/lib/utils";

export const Route = createFileRoute("/@{$username}")({
  component: ProfilePage,
});

function ProfilePage() {
  const { username } = Route.useParams();
  const [client] = useState(() => createTrpcClient());
  const [extraPages, setExtraPages] = useState<PostFeedPage[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const query = trpc.profile.getByUsername.useQuery({ username });
  const favoritesQuery = trpc.game.profileFavorites.useQuery(
    { username },
    {
      enabled: query.data !== undefined,
      retry: false,
      refetchOnWindowFocus: false,
    }
  );
  const currentAppUser = trpc.currentAppUser.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const canUseProfileActions =
    currentAppUser.data?.kind === "active_onboarded_profile" &&
    currentAppUser.data.profile.username !== username &&
    query.data !== undefined;
  const engagementQuery = trpc.engagement.profileState.useQuery(
    { username },
    {
      enabled: canUseProfileActions,
      retry: false,
      refetchOnWindowFocus: false,
    }
  );
  const followMutation = trpc.engagement.toggleFollow.useMutation({
    async onSuccess(result) {
      utils.engagement.profileState.setData({ username }, (current) =>
        current
          ? {
              ...current,
              followerCount: result.followerCount,
              followingCount: result.followingCount,
              isFollowing: result.following,
            }
          : current
      );
      await Promise.all([
        utils.engagement.profileState.invalidate({ username }),
        utils.profile.getByUsername.invalidate({ username }),
      ]);
    },
  });
  const blockMutation = trpc.engagement.blockUser.useMutation({
    onSuccess() {
      utils.engagement.profileState.setData({ username }, (current) =>
        current
          ? {
              ...current,
              isFollowing: false,
              isBlocked: true,
            }
          : current
      );
    },
  });
  const unblockMutation = trpc.engagement.unblockUser.useMutation({
    async onSuccess() {
      utils.engagement.profileState.setData({ username }, (current) =>
        current
          ? {
              ...current,
              isBlocked: false,
            }
          : current
      );
      await utils.engagement.profileState.invalidate({ username });
    },
  });
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
  const engagement = engagementQuery.data;
  const followerCount = engagement?.followerCount ?? profile.followerCount;
  const followingCount = engagement?.followingCount ?? profile.followingCount;
  const isFollowing = engagement?.isFollowing ?? false;
  const isBlocked = engagement?.isBlocked ?? false;
  const favoriteGames = favoritesQuery.data ?? [];
  const pages = postsQuery.data ? [postsQuery.data, ...extraPages] : extraPages;
  const posts = pages.flatMap((page) => page.items);
  const nextCursor =
    extraPages.length > 0
      ? (extraPages[extraPages.length - 1]?.nextCursor ?? null)
      : (postsQuery.data?.nextCursor ?? null);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4">
      <Card className="overflow-hidden">
        {profile.bannerUrl ? (
          <div className="aspect-[5/2] w-full bg-muted">
            <img
              src={profile.bannerUrl}
              alt=""
              className="size-full object-cover"
            />
          </div>
        ) : null}
        <CardHeader
          className={cn(profile.bannerUrl && "-mt-10 gap-4 sm:-mt-12")}
        >
          <div
            className={cn(
              "flex gap-4",
              profile.bannerUrl ? "items-end" : "items-center",
            )}
          >
            <Avatar
              size="lg"
              className={cn(
                profile.bannerUrl && "ring-4 ring-background sm:size-20",
              )}
            >
              <AvatarImage
                src={profile.avatarUrl ?? undefined}
                alt=""
              />
              <AvatarFallback className="text-lg font-semibold uppercase">
                {profile.username.slice(0, 1)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 space-y-1 pb-0.5">
              <CardTitle className="text-2xl">@{profile.username}</CardTitle>
              {profile.displayName ? (
                <p className="text-lg font-semibold">{profile.displayName}</p>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {profile.bio && (
            <p className="text-muted-foreground">{profile.bio}</p>
          )}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>{formatCount(followerCount, "follower")}</span>
            <span>{formatCount(followingCount, "following")}</span>
          </div>
          {favoriteGames.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {favoriteGames.map((game) => (
                <a
                  key={game.id}
                  href={`/game/${game.slug}`}
                  className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground ring-1 ring-foreground/10 transition-colors ring-inset hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  {game.name}
                </a>
              ))}
            </div>
          )}
          {canUseProfileActions && (
            <div className="flex flex-wrap gap-2">
              {!isBlocked && (
                <Button
                  type="button"
                  variant={isFollowing ? "outline" : "default"}
                  disabled={
                    followMutation.isPending || engagementQuery.isLoading
                  }
                  onClick={() => {
                    followMutation.mutate({ username });
                  }}
                >
                  {isFollowing ? "Unfollow" : "Follow"}
                </Button>
              )}
              <Button
                type="button"
                variant={isBlocked ? "outline" : "ghost"}
                disabled={
                  blockMutation.isPending ||
                  unblockMutation.isPending ||
                  engagementQuery.isLoading
                }
                onClick={() => {
                  if (isBlocked) {
                    unblockMutation.mutate({ username });
                  } else {
                    blockMutation.mutate({ username });
                  }
                }}
              >
                {isBlocked ? "Unblock" : "Block"}
              </Button>
              <ReportSheet
                target={{ type: "profile", username }}
                buttonClassName="text-muted-foreground hover:text-foreground"
              />
            </div>
          )}
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
            <p className="text-sm text-muted-foreground">
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
                      current.map(
                        (page) => removePostFromFeedPage(page, publicId)!
                      )
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

function formatCount(value: number, noun: string): string {
  const count = new Intl.NumberFormat("en").format(value);
  return `${count} ${noun}${value === 1 || noun === "following" ? "" : "s"}`;
}

function ProfileSkeleton() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4">
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
