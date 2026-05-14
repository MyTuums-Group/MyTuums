import { and, desc, eq, lt, or } from "drizzle-orm";
import { comment, db, follow, game, media, post, profile, user } from "@workspace/db";
import type { ViewerContext } from "@workspace/types";
import { canViewFeedComment, canViewFeedPost } from "../visibility/memory.js";
import { feedCommentSqlPredicate, feedPostSqlPredicate } from "../visibility/sql-feed.production.js";
import type {
  FeedPage,
  FeedPageInput,
  FeedPostRow,
  FeedVisibilityQueryAdapter,
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
    const sqlPred = feedPostSqlPredicate(viewer);
    const rows = await postBaseQuery(viewer)
      .where(
        sqlPred
          ? and(eq(post.publicId, publicId), sqlPred)
          : eq(post.publicId, publicId),
      )
      .limit(1);

    const row = rows[0];
    if (!row || !canViewFeedPost(viewer, row)) return null;
    return row;
  },

  async commentList(viewer, postId, page) {
    const limit = clampLimit(page.limit);
    const sqlPred = feedCommentSqlPredicate(viewer);
    const rows = await db
      .select(commentSelection)
      .from(comment)
      .innerJoin(user, eq(comment.authorId, user.id))
      .where(
        and(
          eq(comment.postId, postId),
          sqlPred,
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
  const sqlPred = feedPostSqlPredicate(viewer);
  const rows = await postBaseQuery(viewer)
    .where(and(sqlPred, cursorPredicate(post, page), extraPredicate))
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
    .innerJoin(user, eq(post.authorId, user.id))
    .innerJoin(profile, eq(post.authorId, profile.userId))
    .leftJoin(game, eq(post.gameTagId, game.id))
    .leftJoin(media, eq(post.mediaAttachmentId, media.id));

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
  authorUsername: profile.username,
  authorDisplayName: profile.displayName,
  authorAccountStatus: user.accountStatus,
  text: post.text,
  gameTagId: post.gameTagId,
  gameTagSlug: game.slug,
  gameTagName: game.name,
  mediaAttachmentId: post.mediaAttachmentId,
  mediaMimeType: media.mimeType,
  mediaBlobKey: media.blobKey,
  mediaStorageContainer: media.storageContainer,
  mediaStatus: media.status,
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
