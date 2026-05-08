import { and, desc, eq, isNull, lt, notInArray, or } from "drizzle-orm";
import { comment, db, follow, post, user } from "@workspace/db";
import type { ViewerContext } from "@workspace/types";
import {
  canViewFeedComment,
  canViewFeedPost,
  type FeedPage,
  type FeedPageInput,
  type FeedPostRow,
  type FeedVisibilityQueryAdapter,
} from "./index.js";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export const feedVisibilityQueries: FeedVisibilityQueryAdapter = {
  forYouFeed(viewer, page) {
    return visiblePostPage(viewer, page);
  },

  followingFeed(viewer, page) {
    if (!viewer.userId) {
      return Promise.resolve({ items: [], nextCursor: null });
    }

    return visiblePostPage(viewer, page, eq(follow.followerId, viewer.userId));
  },

  discoverFeed(viewer, page) {
    return visiblePostPage(viewer, page);
  },

  gameFeed(viewer, gameId, page) {
    return visiblePostPage(viewer, page, eq(post.gameTagId, gameId));
  },

  profileFeed(viewer, profileUserId, page) {
    return visiblePostPage(viewer, page, eq(post.authorId, profileUserId));
  },

  async postDetail(viewer, publicId) {
    const rows = await postBaseQuery(viewer)
      .where(and(eq(post.publicId, publicId), postVisibilityPredicate(viewer)))
      .limit(1);

    const row = rows[0];
    if (!row || !canViewFeedPost(viewer, row)) return null;
    return row;
  },

  async commentList(viewer, postId, page) {
    const limit = clampLimit(page.limit);
    const rows = await db
      .select(commentSelection)
      .from(comment)
      .innerJoin(user, eq(comment.authorId, user.id))
      .where(
        and(
          eq(comment.postId, postId),
          commentVisibilityPredicate(viewer),
          cursorPredicate(comment, page),
        ),
      )
      .orderBy(desc(comment.createdAt), desc(comment.id))
      .limit(limit + 1);

    return toPage(
      rows.filter((row) => canViewFeedComment(viewer, row)),
      limit,
    );
  },
};

async function visiblePostPage(
  viewer: ViewerContext,
  page: FeedPageInput,
  extraPredicate?: ReturnType<typeof eq>,
): Promise<FeedPage<FeedPostRow>> {
  const limit = clampLimit(page.limit);
  const rows = await postBaseQuery(viewer)
    .where(
      and(postVisibilityPredicate(viewer), cursorPredicate(post, page), extraPredicate),
    )
    .orderBy(desc(post.createdAt), desc(post.id))
    .limit(limit + 1);

  return toPage(
    rows.filter((row) => canViewFeedPost(viewer, row)),
    limit,
  );
}

function postBaseQuery(viewer: ViewerContext) {
  const query = db
    .select(postSelection)
    .from(post)
    .innerJoin(user, eq(post.authorId, user.id));

  if (!viewer.userId) return query;

  return query.leftJoin(
    follow,
    and(eq(follow.followedId, post.authorId), eq(follow.followerId, viewer.userId)),
  );
}

const postSelection = {
  id: post.id,
  publicId: post.publicId,
  authorId: post.authorId,
  authorAccountStatus: user.accountStatus,
  text: post.text,
  gameTagId: post.gameTagId,
  likeCount: post.likeCount,
  commentCount: post.commentCount,
  deletedAt: post.deletedAt,
  removedAt: post.removedAt,
  removalPublicReason: post.removalPublicReason,
  createdAt: post.createdAt,
  updatedAt: post.updatedAt,
};

const commentSelection = {
  id: comment.id,
  postId: comment.postId,
  authorId: comment.authorId,
  authorAccountStatus: user.accountStatus,
  text: comment.text,
  likeCount: comment.likeCount,
  deletedAt: comment.deletedAt,
  removedAt: comment.removedAt,
  removalPublicReason: comment.removalPublicReason,
  createdAt: comment.createdAt,
  updatedAt: comment.updatedAt,
};

function postVisibilityPredicate(viewer: ViewerContext) {
  if (isStaff(viewer)) return undefined;

  const publicVisibility = and(
    eq(user.accountStatus, "active"),
    isNull(post.deletedAt),
    isNull(post.removedAt),
    blockedAuthorPredicate(viewer),
  );

  if (!viewer.userId) return publicVisibility;
  return or(eq(post.authorId, viewer.userId), publicVisibility);
}

function commentVisibilityPredicate(viewer: ViewerContext) {
  if (isStaff(viewer)) return undefined;

  const publicVisibility = and(
    eq(user.accountStatus, "active"),
    isNull(comment.deletedAt),
    isNull(comment.removedAt),
    blockedCommentAuthorPredicate(viewer),
  );

  if (!viewer.userId) return publicVisibility;
  return or(eq(comment.authorId, viewer.userId), publicVisibility);
}

function blockedAuthorPredicate(viewer: ViewerContext) {
  const blockedIds = blockedPairIds(viewer);
  if (blockedIds.length === 0) return undefined;
  return notInArray(post.authorId, blockedIds);
}

function blockedCommentAuthorPredicate(viewer: ViewerContext) {
  const blockedIds = blockedPairIds(viewer);
  if (blockedIds.length === 0) return undefined;
  return notInArray(comment.authorId, blockedIds);
}

function blockedPairIds(viewer: ViewerContext): string[] {
  return [...new Set([...viewer.blockedUserIds, ...viewer.blockedByUserIds])];
}

function cursorPredicate(
  table: Pick<typeof post, "createdAt" | "id"> | Pick<typeof comment, "createdAt" | "id">,
  page: FeedPageInput,
) {
  if (!page.cursor) return undefined;
  return or(
    lt(table.createdAt, page.cursor.createdAt),
    and(eq(table.createdAt, page.cursor.createdAt), lt(table.id, page.cursor.id)),
  );
}

function toPage<T extends { id: string; createdAt: Date }>(
  rows: T[],
  limit: number,
): FeedPage<T> {
  const items = rows.slice(0, limit);
  const nextCursor =
    rows.length > limit && items.length > 0
      ? { id: items[items.length - 1]!.id, createdAt: items[items.length - 1]!.createdAt }
      : null;

  return { items, nextCursor };
}

function clampLimit(limit: number): number {
  if (!Number.isFinite(limit)) return DEFAULT_LIMIT;
  return Math.min(Math.max(Math.trunc(limit), 0), MAX_LIMIT);
}

function isStaff(viewer: ViewerContext): boolean {
  return (
    viewer.role === "moderator" ||
    viewer.role === "admin" ||
    viewer.role === "owner"
  );
}
