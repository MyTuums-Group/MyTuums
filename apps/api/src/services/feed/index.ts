import type { AccountStatus, ViewerContext } from "@workspace/types";
import { canViewFeedComment, canViewFeedPost } from "../visibility/memory.js";

export interface FeedCursor {
  createdAt: Date;
  id: string;
  likeCount?: number;
}

export interface FeedPageInput {
  limit: number;
  cursor?: FeedCursor | null;
}

export type FeedContext =
  | { kind: "for_you"; hasFavoriteGames: boolean }
  | { kind: "following" }
  | { kind: "discover"; gameSlug: string | null }
  | { kind: "game_page"; gameId: string }
  | { kind: "profile"; profileUserId: string };

export interface FeedPage<T> {
  items: T[];
  nextCursor: FeedCursor | null;
  context?: FeedContext;
}

export type FeedEligibility =
  | { kind: "for_you" }
  | { kind: "following" }
  | { kind: "discover"; gameSlug?: string | null }
  | { kind: "game_page"; gameId: string }
  | { kind: "profile"; profileUserId: string };

export interface FeedParams {
  eligibility: FeedEligibility;
  viewer: ViewerContext;
  limit: number;
  cursor?: FeedCursor | null;
}

export const ForYouEligibility = {
  create(): FeedEligibility {
    return { kind: "for_you" };
  },
};

export const FollowingEligibility = {
  create(): FeedEligibility {
    return { kind: "following" };
  },
};

export const DiscoverEligibility = {
  create(input: { gameSlug?: string | null } = {}): FeedEligibility {
    return { kind: "discover", gameSlug: input.gameSlug ?? null };
  },
};

export const GamePageEligibility = {
  create(gameId: string): FeedEligibility {
    return { kind: "game_page", gameId };
  },
};

export const ProfileEligibility = {
  create(profileUserId: string): FeedEligibility {
    return { kind: "profile", profileUserId };
  },
};

export interface FeedPostRow {
  id: string;
  publicId: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string | null;
  authorAccountStatus: AccountStatus;
  text: string;
  gameTagId: string | null;
  gameTagSlug: string | null;
  gameTagName: string | null;
  mediaAttachmentId: string | null;
  mediaMimeType: string | null;
  mediaBlobKey: string | null;
  mediaStorageContainer: string | null;
  mediaStatus: string | null;
  likeCount: number;
  commentCount: number;
  deletedAt: Date | null;
  removedAt: Date | null;
  removalPublicReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeedCommentRow {
  id: string;
  postId: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string | null;
  authorAccountStatus: AccountStatus;
  text: string;
  likeCount: number;
  viewerHasLiked: boolean;
  deletedAt: Date | null;
  removedAt: Date | null;
  removalPublicReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeedFollowRow {
  followerId: string;
  followedId: string;
}

export interface FeedFavoriteGameRow {
  userId: string;
  gameId: string;
}

export interface FeedVisibilityQueryAdapter {
  queryFeed(params: FeedParams): Promise<FeedPage<FeedPostRow>>;
  forYouFeed(viewer: ViewerContext, page: FeedPageInput): Promise<FeedPage<FeedPostRow>>;
  followingFeed(viewer: ViewerContext, page: FeedPageInput): Promise<FeedPage<FeedPostRow>>;
  discoverFeed(viewer: ViewerContext, page: FeedPageInput): Promise<FeedPage<FeedPostRow>>;
  gameFeed(
    viewer: ViewerContext,
    gameId: string,
    page: FeedPageInput,
  ): Promise<FeedPage<FeedPostRow>>;
  profileFeed(
    viewer: ViewerContext,
    profileUserId: string,
    page: FeedPageInput,
  ): Promise<FeedPage<FeedPostRow>>;
  postDetail(viewer: ViewerContext, publicId: string): Promise<FeedPostRow | null>;
  commentList(
    viewer: ViewerContext,
    postId: string,
    page: FeedPageInput,
  ): Promise<FeedPage<FeedCommentRow>>;
}

export interface InMemoryFeedVisibilityState {
  posts: FeedPostRow[];
  comments: FeedCommentRow[];
  follows: FeedFollowRow[];
  favoriteGames?: FeedFavoriteGameRow[];
}

export function createInMemoryFeedVisibilityQueries(
  state: InMemoryFeedVisibilityState,
): FeedVisibilityQueryAdapter {
  function visiblePosts(
    viewer: ViewerContext,
    predicate: (post: FeedPostRow) => boolean,
    page: FeedPageInput,
  ): FeedPage<FeedPostRow> {
    return paginateByCreatedAt(
      state.posts
        .filter(predicate)
        .filter((post) => canViewFeedPost(viewer, post)),
      page,
    );
  }

  function favoriteGameIdsForViewer(viewer: ViewerContext): string[] {
    if (!viewer.userId) return [];
    return (state.favoriteGames ?? [])
      .filter((favorite) => favorite.userId === viewer.userId)
      .map((favorite) => favorite.gameId);
  }

  function queryFeed(params: FeedParams): FeedPage<FeedPostRow> {
    const page = { limit: params.limit, cursor: params.cursor ?? null };
    const eligibility = params.eligibility;

    switch (eligibility.kind) {
      case "for_you": {
        const favoriteGameIds = favoriteGameIdsForViewer(params.viewer);
        const hasFavoriteGames = favoriteGameIds.length > 0;
        return {
          ...visiblePosts(
            params.viewer,
            (post) => !hasFavoriteGames || favoriteGameIds.includes(post.gameTagId ?? ""),
            page,
          ),
          context: { kind: "for_you", hasFavoriteGames },
        };
      }
      case "following": {
        if (!params.viewer.userId) {
          return {
            items: [],
            nextCursor: null,
            context: { kind: "following" },
          };
        }

        const followedIds = state.follows
          .filter((follow) => follow.followerId === params.viewer.userId)
          .map((follow) => follow.followedId);

        return {
          ...visiblePosts(
            params.viewer,
            (post) => followedIds.includes(post.authorId),
            page,
          ),
          context: { kind: "following" },
        };
      }
      case "discover":
        return {
          ...visiblePosts(
            params.viewer,
            (post) =>
              !eligibility.gameSlug || post.gameTagSlug === eligibility.gameSlug,
            page,
          ),
          context: {
            kind: "discover",
            gameSlug: eligibility.gameSlug ?? null,
          },
        };
      case "game_page":
        return {
          ...visiblePosts(
            params.viewer,
            (post) => post.gameTagId === eligibility.gameId,
            page,
          ),
          context: { kind: "game_page", gameId: eligibility.gameId },
        };
      case "profile":
        return {
          ...visiblePosts(
            params.viewer,
            (post) => post.authorId === eligibility.profileUserId,
            page,
          ),
          context: {
            kind: "profile",
            profileUserId: eligibility.profileUserId,
          },
        };
    }
  }

  return {
    queryFeed(params) {
      return Promise.resolve(queryFeed(params));
    },

    forYouFeed(viewer, page) {
      return Promise.resolve(
        queryFeed({
          viewer,
          eligibility: ForYouEligibility.create(),
          limit: page.limit,
          cursor: page.cursor,
        }),
      );
    },

    followingFeed(viewer, page) {
      return Promise.resolve(
        queryFeed({
          viewer,
          eligibility: FollowingEligibility.create(),
          limit: page.limit,
          cursor: page.cursor,
        }),
      );
    },

    discoverFeed(viewer, page) {
      return Promise.resolve(
        queryFeed({
          viewer,
          eligibility: DiscoverEligibility.create(),
          limit: page.limit,
          cursor: page.cursor,
        }),
      );
    },

    gameFeed(viewer, gameId, page) {
      return Promise.resolve(
        queryFeed({
          viewer,
          eligibility: GamePageEligibility.create(gameId),
          limit: page.limit,
          cursor: page.cursor,
        }),
      );
    },

    profileFeed(viewer, profileUserId, page) {
      return Promise.resolve(
        queryFeed({
          viewer,
          eligibility: ProfileEligibility.create(profileUserId),
          limit: page.limit,
          cursor: page.cursor,
        }),
      );
    },

    postDetail(viewer, publicId) {
      const found = state.posts.find((post) => post.publicId === publicId);
      if (!found || !canViewFeedPost(viewer, found)) {
        return Promise.resolve(null);
      }
      return Promise.resolve(found);
    },

    commentList(viewer, postId, page) {
      const comments = state.comments
        .filter((comment) => comment.postId === postId)
        .filter((comment) => canViewFeedComment(viewer, comment));

      return Promise.resolve(paginateCommentsByLikeCount(comments, page));
    },
  };
}

function paginateByCreatedAt<T extends { id: string; createdAt: Date }>(
  rows: T[],
  page: FeedPageInput,
): FeedPage<T> {
  const limit = Math.max(0, page.limit);
  const sortedVisibleRows = [...rows].sort(compareNewestFirst);
  const cursorFilteredRows = page.cursor
    ? sortedVisibleRows.filter((row) => isOlderThanCursor(row, page.cursor!))
    : sortedVisibleRows;
  const items = cursorFilteredRows.slice(0, limit);
  const nextCursor =
    items.length === limit && cursorFilteredRows.length > limit
      ? toCursor(items[items.length - 1]!)
      : null;

  return { items, nextCursor };
}

function compareNewestFirst(
  left: { id: string; createdAt: Date },
  right: { id: string; createdAt: Date },
): number {
  const timeDifference = right.createdAt.getTime() - left.createdAt.getTime();
  if (timeDifference !== 0) return timeDifference;
  return right.id.localeCompare(left.id);
}

function isOlderThanCursor(
  row: { id: string; createdAt: Date },
  cursor: FeedCursor,
): boolean {
  const rowTime = row.createdAt.getTime();
  const cursorTime = cursor.createdAt.getTime();
  if (rowTime < cursorTime) return true;
  if (rowTime > cursorTime) return false;
  return row.id < cursor.id;
}

function toCursor(row: { id: string; createdAt: Date }): FeedCursor {
  return { id: row.id, createdAt: row.createdAt };
}

function paginateCommentsByLikeCount<T extends { id: string; createdAt: Date; likeCount: number }>(
  rows: T[],
  page: FeedPageInput,
): FeedPage<T> {
  const limit = Math.max(0, page.limit);
  const sortedVisibleRows = [...rows].sort(compareComments);
  const cursorFilteredRows = page.cursor
    ? sortedVisibleRows.filter((row) => isAfterCommentCursor(row, page.cursor!))
    : sortedVisibleRows;
  const items = cursorFilteredRows.slice(0, limit);
  const nextCursor =
    items.length === limit && cursorFilteredRows.length > limit
      ? toCommentCursor(items[items.length - 1]!)
      : null;

  return { items, nextCursor };
}

function compareComments(
  left: { id: string; createdAt: Date; likeCount: number },
  right: { id: string; createdAt: Date; likeCount: number },
): number {
  const likeDifference = right.likeCount - left.likeCount;
  if (likeDifference !== 0) return likeDifference;

  const timeDifference = left.createdAt.getTime() - right.createdAt.getTime();
  if (timeDifference !== 0) return timeDifference;

  return left.id.localeCompare(right.id);
}

function isAfterCommentCursor(
  row: { id: string; createdAt: Date; likeCount: number },
  cursor: FeedCursor,
): boolean {
  if (typeof cursor.likeCount === "number") {
    if (row.likeCount < cursor.likeCount) return true;
    if (row.likeCount > cursor.likeCount) return false;
  }

  const rowTime = row.createdAt.getTime();
  const cursorTime = cursor.createdAt.getTime();
  if (rowTime > cursorTime) return true;
  if (rowTime < cursorTime) return false;
  return row.id > cursor.id;
}

function toCommentCursor(row: {
  id: string;
  createdAt: Date;
  likeCount: number;
}): FeedCursor {
  return { id: row.id, createdAt: row.createdAt, likeCount: row.likeCount };
}
