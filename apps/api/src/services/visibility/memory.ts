/**
 * Canonical content visibility rules — single source used by authorization
 * adapters, feed in-memory queries, and feed SQL predicates. Feed list/detail
 * post and comment rules are delegated to `feed-policy.ts`.
 */

import type { AccountStatus, TargetRef, ViewerContext } from "@workspace/types";
import {
  evaluateFeedCommentVisibility,
  evaluateFeedPostVisibility,
  isFeedAuthorBlocked,
} from "./feed-policy.js";

/** Staff roles see moderation-visible content everywhere. */
export function isStaff(ctx: ViewerContext): boolean {
  if (!ctx.isAuthenticated || !ctx.role) return false;
  return (
    ctx.role === "moderator" ||
    ctx.role === "admin" ||
    ctx.role === "owner"
  );
}

function isBlockedBidirectional(
  ctx: ViewerContext,
  otherUserId: string,
): boolean {
  return (
    ctx.blockedUserIds.includes(otherUserId) ||
    ctx.blockedByUserIds.includes(otherUserId)
  );
}

/**
 * User-record visibility (blocks + staff). Account-status filtering for lists
 * lives outside this predicate.
 */
export function canViewUser(ctx: ViewerContext, targetUserId: string): boolean {
  if (ctx.userId === targetUserId) return true;
  if (isStaff(ctx)) return true;
  if (isBlockedBidirectional(ctx, targetUserId)) return false;
  return true;
}

export function canViewProfile(ctx: ViewerContext, profileUserId: string): boolean {
  if (ctx.userId === profileUserId) return true;
  if (isStaff(ctx)) return true;
  if (isBlockedBidirectional(ctx, profileUserId)) return false;
  return true;
}

export function canViewAuthorizationPost(
  ctx: ViewerContext,
  t: { authorId: string; deletedAt: Date | null; removedAt: Date | null },
): boolean {
  if (ctx.userId === t.authorId) return true;
  if (isStaff(ctx)) return true;
  if (isBlockedBidirectional(ctx, t.authorId)) return false;
  if (t.deletedAt) return false;
  if (t.removedAt) return false;
  return true;
}

export function canViewAuthorizationComment(
  ctx: ViewerContext,
  t: { authorId: string; deletedAt: Date | null; removedAt: Date | null },
): boolean {
  if (ctx.userId === t.authorId) return true;
  if (isStaff(ctx)) return true;
  if (isBlockedBidirectional(ctx, t.authorId)) return false;
  if (t.deletedAt) return false;
  if (t.removedAt) return false;
  return true;
}

/** Feed rows carry author account status; ordering differs from authorization post targets. */
export function canViewFeedPost(
  ctx: ViewerContext,
  post: {
    authorId: string;
    authorAccountStatus: AccountStatus;
    deletedAt: Date | null;
    removedAt: Date | null;
  },
): boolean {
  return evaluateFeedPostVisibility({
    viewerUserId: ctx.userId,
    viewerIsStaff: isStaff(ctx),
    authorId: post.authorId,
    authorIsBlockedForFeed: isFeedAuthorBlocked(ctx, post.authorId),
    authorAccountStatus: post.authorAccountStatus,
    deletedAt: post.deletedAt,
    removedAt: post.removedAt,
  });
}

export function canViewFeedComment(
  ctx: ViewerContext,
  comment: {
    authorId: string;
    authorAccountStatus: AccountStatus;
    deletedAt: Date | null;
    removedAt: Date | null;
  },
): boolean {
  return evaluateFeedCommentVisibility({
    viewerUserId: ctx.userId,
    viewerIsStaff: isStaff(ctx),
    authorId: comment.authorId,
    authorIsBlockedForFeed: isFeedAuthorBlocked(ctx, comment.authorId),
    authorAccountStatus: comment.authorAccountStatus,
    deletedAt: comment.deletedAt,
    removedAt: comment.removedAt,
  });
}

export function canViewTarget(ctx: ViewerContext, target: TargetRef): boolean {
  switch (target.type) {
    case "user":
      return canViewUser(ctx, target.userId);
    case "profile":
      return canViewProfile(ctx, target.userId);
    case "post":
      return canViewAuthorizationPost(ctx, target);
    case "comment":
      return canViewAuthorizationComment(ctx, target);
    default:
      return false;
  }
}
