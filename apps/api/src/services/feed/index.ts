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

export interface FeedPage<T> {
  items: T[];
  nextCursor: FeedCursor | null;
}

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

export interface FeedVisibilityQueryAdapter {
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

  return {
    forYouFeed(viewer, page) {
      return Promise.resolve(visiblePosts(viewer, () => true, page));
    },

    followingFeed(viewer, page) {
      if (!viewer.userId) {
        return Promise.resolve({ items: [], nextCursor: null });
      }

      const followedIds = state.follows
        .filter((follow) => follow.followerId === viewer.userId)
        .map((follow) => follow.followedId);

      return Promise.resolve(
        visiblePosts(
          viewer,
          (post) => followedIds.includes(post.authorId),
          page,
        ),
      );
    },

    discoverFeed(viewer, page) {
      return Promise.resolve(visiblePosts(viewer, () => true, page));
    },

    gameFeed(viewer, gameId, page) {
      return Promise.resolve(
        visiblePosts(viewer, (post) => post.gameTagId === gameId, page),
      );
    },

    profileFeed(viewer, profileUserId, page) {
      return Promise.resolve(
        visiblePosts(viewer, (post) => post.authorId === profileUserId, page),
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
