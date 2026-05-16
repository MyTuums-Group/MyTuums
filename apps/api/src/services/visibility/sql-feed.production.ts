/**
 * Drizzle WHERE fragments for feed queries — must stay equivalent to
 * `evaluateFeedPostVisibility` / `evaluateFeedCommentVisibility` in `feed-policy.ts`.
 */

import { and, eq, isNull, notInArray, or } from "drizzle-orm";
import { comment, post, user } from "@workspace/db";
import type { ViewerContext } from "@workspace/types";
import { feedBlockedAuthorIds } from "./feed-policy.js";
import { isStaff } from "./memory.js";

function blockedAuthorPredicate(
  viewer: ViewerContext,
  authorColumn: typeof post.authorId | typeof comment.authorId,
) {
  const blockedIds = feedBlockedAuthorIds(viewer);
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
