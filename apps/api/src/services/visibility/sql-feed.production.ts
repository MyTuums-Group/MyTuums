/**
 * Drizzle WHERE fragments for feed queries — mirrors in-memory feed predicates.
 */

import { and, eq, isNull, notInArray, or } from "drizzle-orm";
import { comment, post, user } from "@workspace/db";
import type { ViewerContext } from "@workspace/types";
import { isStaff } from "./memory.js";

function blockedPairIds(viewer: ViewerContext): string[] {
  return [...new Set([...viewer.blockedUserIds, ...viewer.blockedByUserIds])];
}

function blockedAuthorPredicate(
  viewer: ViewerContext,
  authorColumn: typeof post.authorId | typeof comment.authorId,
) {
  const blockedIds = blockedPairIds(viewer);
  if (blockedIds.length === 0) return undefined;
  return notInArray(authorColumn, blockedIds);
}

export function feedPostSqlPredicate(viewer: ViewerContext) {
  if (isStaff(viewer)) return undefined;

  const publicVisibility = and(
    eq(user.accountStatus, "active"),
    isNull(post.deletedAt),
    isNull(post.removedAt),
    blockedAuthorPredicate(viewer, post.authorId),
  );

  if (!viewer.userId) return publicVisibility;
  return or(
    and(eq(post.authorId, viewer.userId), isNull(post.deletedAt)),
    publicVisibility,
  );
}

export function feedCommentSqlPredicate(viewer: ViewerContext) {
  if (isStaff(viewer)) return undefined;

  const publicVisibility = and(
    eq(user.accountStatus, "active"),
    isNull(comment.deletedAt),
    isNull(comment.removedAt),
    blockedAuthorPredicate(viewer, comment.authorId),
  );

  if (!viewer.userId) return publicVisibility;
  return or(eq(comment.authorId, viewer.userId), publicVisibility);
}
