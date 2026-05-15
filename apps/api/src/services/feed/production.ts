import { and, desc, eq, inArray, lt, or, type SQL } from "drizzle-orm";
import { comment, db, favoriteGame, follow, game, media, post, profile, user } from "@workspace/db";
import type { ViewerContext } from "@workspace/types";
import { canViewFeedComment, canViewFeedPost } from "../visibility/memory.js";
import { feedCommentSqlPredicate, feedPostSqlPredicate } from "../visibility/sql-feed.production.js";
import type {
  FeedContext,
  FeedPage,
  FeedPageInput,
  FeedParams,
  FeedPostRow,
  FeedVisibilityQueryAdapter,
} from "./index.js";
import {
  DiscoverEligibility,
  FollowingEligibility,
  ForYouEligibility,
  GamePageEligibility,
  ProfileEligibility,
} from "./index.js";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export const feedVisibilityQueries: FeedVisibilityQueryAdapter = {
  queryFeed(params) {
    return queryFeed(params);
  },

  forYouFeed(viewer, page) {
    return queryFeed({
      viewer,
      eligibility: ForYouEligibility.create(),
      limit: page.limit,
      cursor: page.cursor,
    });
  },

  followingFeed(viewer, page) {
    return queryFeed({
      viewer,
      eligibility: FollowingEligibility.create(),
      limit: page.limit,
      cursor: page.cursor,
    });
  },

  discoverFeed(viewer, page) {
    return queryFeed({
      viewer,
      eligibility: DiscoverEligibility.create(),
      limit: page.limit,
      cursor: page.cursor,
    });
  },

  gameFeed(viewer, gameId, page) {
    return queryFeed({
      viewer,
      eligibility: GamePageEligibility.create(gameId),
      limit: page.limit,
      cursor: page.cursor,
    });
  },

  profileFeed(viewer, profileUserId, page) {
    return queryFeed({
      viewer,
      eligibility: ProfileEligibility.create(profileUserId),
      limit: page.limit,
      cursor: page.cursor,
    });
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

async function queryFeed(params: FeedParams): Promise<FeedPage<FeedPostRow>> {
  const page = { limit: params.limit, cursor: params.cursor ?? null };

  switch (params.eligibility.kind) {
    case "for_you": {
      const favoriteGameIds = await favoriteGameIdsForViewer(params.viewer);
      const hasFavoriteGames = favoriteGameIds.length > 0;
      return visiblePostPage(
        params.viewer,
        page,
        hasFavoriteGames ? inArray(post.gameTagId, favoriteGameIds) : undefined,
        { kind: "for_you", hasFavoriteGames },
      );
    }
    case "following":
      if (!params.viewer.userId) {
        return { items: [], nextCursor: null, context: { kind: "following" } };
      }

      return visiblePostPage(
        params.viewer,
        page,
        eq(follow.followerId, params.viewer.userId),
        { kind: "following" },
      );
    case "discover":
      return visiblePostPage(
        params.viewer,
        page,
        params.eligibility.gameSlug
          ? eq(game.slug, params.eligibility.gameSlug)
          : undefined,
        {
          kind: "discover",
          gameSlug: params.eligibility.gameSlug ?? null,
        },
      );
    case "game_page":
      return visiblePostPage(
        params.viewer,
        page,
        eq(post.gameTagId, params.eligibility.gameId),
        { kind: "game_page", gameId: params.eligibility.gameId },
      );
    case "profile":
      return visiblePostPage(
        params.viewer,
        page,
        eq(post.authorId, params.eligibility.profileUserId),
        { kind: "profile", profileUserId: params.eligibility.profileUserId },
      );
  }
}

async function visiblePostPage(
  viewer: ViewerContext,
  page: FeedPageInput,
  extraPredicate?: SQL,
  context?: FeedContext,
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
    context,
  );
}

async function favoriteGameIdsForViewer(viewer: ViewerContext): Promise<string[]> {
  if (!viewer.userId) return [];

  const rows = await db
    .select({ gameId: favoriteGame.gameId })
    .from(favoriteGame)
    .innerJoin(profile, eq(favoriteGame.profileId, profile.id))
    .where(eq(profile.userId, viewer.userId));

  return rows.map((row) => row.gameId);
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
  context?: FeedContext,
): FeedPage<T> {
  const items = rows.slice(0, limit);
  const nextCursor =
    rows.length > limit && items.length > 0
      ? { id: items[items.length - 1]!.id, createdAt: items[items.length - 1]!.createdAt }
      : null;

  return { items, nextCursor, context };
}

function clampLimit(limit: number): number {
  if (!Number.isFinite(limit)) return DEFAULT_LIMIT;
  return Math.min(Math.max(Math.trunc(limit), 0), MAX_LIMIT);
}
