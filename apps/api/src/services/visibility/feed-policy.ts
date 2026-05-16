/**
 * Canonical feed post/comment visibility — one place for block, account status,
 * user deletion, and moderation removal. In-memory checks and production feed SQL
 * (`sql-feed.production.ts`) must stay aligned with these predicates.
 */

import type { AccountStatus, ViewerContext } from "@workspace/types";

/** Union of both block directions; matches `notInArray` used in feed SQL. */
export function feedBlockedAuthorIds(
  viewer: Pick<ViewerContext, "blockedUserIds" | "blockedByUserIds">,
): string[] {
  return [...new Set([...viewer.blockedUserIds, ...viewer.blockedByUserIds])];
}

export function isFeedAuthorBlocked(
  viewer: Pick<ViewerContext, "blockedUserIds" | "blockedByUserIds">,
  authorId: string,
): boolean {
  return (
    viewer.blockedUserIds.includes(authorId) || viewer.blockedByUserIds.includes(authorId)
  );
}

export type FeedPostVisibilityInput = {
  viewerUserId: string | null;
  viewerIsStaff: boolean;
  authorId: string;
  authorIsBlockedForFeed: boolean;
  authorAccountStatus: AccountStatus;
  deletedAt: Date | null;
  removedAt: Date | null;
};

export function evaluateFeedPostVisibility(input: FeedPostVisibilityInput): boolean {
  if (input.viewerIsStaff) return true;
  if (input.authorIsBlockedForFeed) return false;
  if (input.authorAccountStatus !== "active") return false;
  if (input.deletedAt) return false;
  if (input.viewerUserId === input.authorId) return true;
  if (input.removedAt) return false;
  return true;
}

export type FeedCommentVisibilityInput = {
  viewerUserId: string | null;
  viewerIsStaff: boolean;
  authorId: string;
  authorIsBlockedForFeed: boolean;
  authorAccountStatus: AccountStatus;
  deletedAt: Date | null;
  removedAt: Date | null;
};

export function evaluateFeedCommentVisibility(input: FeedCommentVisibilityInput): boolean {
  if (input.viewerUserId === input.authorId) return true;
  if (input.viewerIsStaff) return true;
  if (input.authorIsBlockedForFeed) return false;
  if (input.authorAccountStatus !== "active") return false;
  if (input.deletedAt) return false;
  if (input.removedAt) return false;
  return true;
}
