import { trpc } from "@/lib/trpc";
import { DEFAULT_POST_PAGE_LIMIT } from "./constants";
import {
  prependPostToFeedPage,
  removePostFromFeedPage,
  replacePostInFeedPage,
} from "./post-cache";
import type { PostFeedPage, PostView } from "./types";

/** Same shape as `trpc.useUtils()` in components; avoids unresolved generics under ESLint. */
export type PostTrpcUtils = ReturnType<typeof trpc.useUtils>;

const feedLimitInput = { limit: DEFAULT_POST_PAGE_LIMIT } as const;

/**
 * After a post like mutation settles, refresh feeds that surface like counts
 * and the post detail view.
 */
export async function reconcileCachesAfterPostLikeMutationSettled(
  utils: PostTrpcUtils,
  event: { postPublicId: string; authorUsername: string },
): Promise<void> {
  await Promise.all([
    utils.post.forYouFeed.invalidate(feedLimitInput),
    utils.post.profileFeed.invalidate({
      username: event.authorUsername,
      limit: DEFAULT_POST_PAGE_LIMIT,
    }),
    utils.post.detail.invalidate({ publicId: event.postPublicId }),
  ]);
}

export type OptimisticPostDeleteFeedSnapshots = {
  previousForYou: PostFeedPage | undefined;
  previousFollowing: PostFeedPage | undefined;
  previousProfile: PostFeedPage | undefined;
};

export async function cancelPostListQueriesForOptimisticDelete(
  utils: PostTrpcUtils,
  event: { postPublicId: string; authorUsername: string },
): Promise<void> {
  await Promise.all([
    utils.post.forYouFeed.cancel(feedLimitInput),
    utils.post.followingFeed.cancel(feedLimitInput),
    utils.post.profileFeed.cancel({
      username: event.authorUsername,
      limit: DEFAULT_POST_PAGE_LIMIT,
    }),
    utils.post.detail.cancel({ publicId: event.postPublicId }),
  ]);
}

export function captureFeedSnapshotsForOptimisticPostDelete(
  utils: PostTrpcUtils,
  event: { authorUsername: string },
): OptimisticPostDeleteFeedSnapshots {
  return {
    previousForYou: utils.post.forYouFeed.getData(feedLimitInput),
    previousFollowing: utils.post.followingFeed.getData(feedLimitInput),
    previousProfile: utils.post.profileFeed.getData({
      username: event.authorUsername,
      limit: DEFAULT_POST_PAGE_LIMIT,
    }),
  };
}

export function applyOptimisticPostDeleteToFeeds(
  utils: PostTrpcUtils,
  event: { postPublicId: string; authorUsername: string },
): void {
  const { postPublicId, authorUsername } = event;
  utils.post.forYouFeed.setData(feedLimitInput, (current) =>
    removePostFromFeedPage(current, postPublicId),
  );
  utils.post.followingFeed.setData(feedLimitInput, (current) =>
    removePostFromFeedPage(current, postPublicId),
  );
  utils.post.profileFeed.setData(
    { username: authorUsername, limit: DEFAULT_POST_PAGE_LIMIT },
    (current) => removePostFromFeedPage(current, postPublicId),
  );
}

export function restoreFeedsAfterOptimisticPostDeleteFailure(
  utils: PostTrpcUtils,
  event: { authorUsername: string },
  snapshots: OptimisticPostDeleteFeedSnapshots,
): void {
  if (snapshots.previousForYou) {
    utils.post.forYouFeed.setData(feedLimitInput, snapshots.previousForYou);
  }
  if (snapshots.previousFollowing) {
    utils.post.followingFeed.setData(
      feedLimitInput,
      snapshots.previousFollowing,
    );
  }
  if (snapshots.previousProfile) {
    utils.post.profileFeed.setData(
      { username: event.authorUsername, limit: DEFAULT_POST_PAGE_LIMIT },
      snapshots.previousProfile,
    );
  }
}

/**
 * After a post delete mutation settles, ensure all surfaces that may have shown
 * the post are consistent with the server.
 */
export async function reconcileCachesAfterPostDeleteMutationSettled(
  utils: PostTrpcUtils,
  event: {
    postPublicId: string;
    authorUsername: string;
    gameSlug: string | null | undefined;
  },
): Promise<void> {
  await Promise.all([
    utils.post.forYouFeed.invalidate(feedLimitInput),
    utils.post.followingFeed.invalidate(feedLimitInput),
    utils.post.profileFeed.invalidate({
      username: event.authorUsername,
      limit: DEFAULT_POST_PAGE_LIMIT,
    }),
    utils.post.discoverFeed.invalidate(),
    utils.post.detail.invalidate({ publicId: event.postPublicId }),
    event.gameSlug
      ? utils.game.feed.invalidate({ slug: event.gameSlug })
      : Promise.resolve(),
  ]);
}

export type OptimisticPostCreateFeedSnapshots = {
  previousForYou: PostFeedPage | undefined;
  previousProfile: PostFeedPage | undefined;
};

export async function cancelPostListQueriesForOptimisticCreate(
  utils: PostTrpcUtils,
  profileUsername: string | null,
): Promise<void> {
  await Promise.all([
    utils.post.forYouFeed.cancel(feedLimitInput),
    profileUsername
      ? utils.post.profileFeed.cancel({
          username: profileUsername,
          limit: DEFAULT_POST_PAGE_LIMIT,
        })
      : Promise.resolve(),
  ]);
}

export function captureFeedSnapshotsForOptimisticPostCreate(
  utils: PostTrpcUtils,
  profileUsername: string | null,
): OptimisticPostCreateFeedSnapshots {
  return {
    previousForYou: utils.post.forYouFeed.getData(feedLimitInput),
    previousProfile: profileUsername
      ? utils.post.profileFeed.getData({
          username: profileUsername,
          limit: DEFAULT_POST_PAGE_LIMIT,
        })
      : undefined,
  };
}

export function applyOptimisticPostCreateToFeeds(
  utils: PostTrpcUtils,
  event: { optimisticPost: PostView; profileUsername: string | null },
): void {
  utils.post.forYouFeed.setData(feedLimitInput, (current) =>
    prependPostToFeedPage(current, event.optimisticPost),
  );
  if (event.profileUsername) {
    utils.post.profileFeed.setData(
      { username: event.profileUsername, limit: DEFAULT_POST_PAGE_LIMIT },
      (current) => prependPostToFeedPage(current, event.optimisticPost),
    );
  }
}

export function restoreFeedsAfterOptimisticPostCreateFailure(
  utils: PostTrpcUtils,
  profileUsername: string | null,
  snapshots?: OptimisticPostCreateFeedSnapshots | null,
): void {
  const previous = snapshots ?? {
    previousForYou: undefined,
    previousProfile: undefined,
  };
  utils.post.forYouFeed.setData(feedLimitInput, previous.previousForYou);
  if (profileUsername) {
    utils.post.profileFeed.setData(
      { username: profileUsername, limit: DEFAULT_POST_PAGE_LIMIT },
      previous.previousProfile,
    );
  }
}

export function applyCreatedPostReplacingOptimisticOnFeeds(
  utils: PostTrpcUtils,
  event: {
    createdPost: PostView;
    optimisticPublicId: string | undefined;
    profileUsername: string | null;
  },
): void {
  const targetId =
    event.optimisticPublicId ?? event.createdPost.publicId;

  utils.post.forYouFeed.setData(feedLimitInput, (current) =>
    replacePostInFeedPage(current, targetId, event.createdPost) ??
    prependPostToFeedPage(current, event.createdPost),
  );

  if (event.profileUsername) {
    utils.post.profileFeed.setData(
      { username: event.profileUsername, limit: DEFAULT_POST_PAGE_LIMIT },
      (current) =>
        replacePostInFeedPage(current, targetId, event.createdPost) ??
        prependPostToFeedPage(current, event.createdPost),
    );
  }
}

export async function reconcileCachesAfterPostCreateMutationSettled(
  utils: PostTrpcUtils,
  profileUsername: string | null,
): Promise<void> {
  await Promise.all([
    utils.post.forYouFeed.invalidate(feedLimitInput),
    profileUsername
      ? utils.post.profileFeed.invalidate({
          username: profileUsername,
          limit: DEFAULT_POST_PAGE_LIMIT,
        })
      : Promise.resolve(),
  ]);
}
