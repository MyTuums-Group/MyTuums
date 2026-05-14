/**
 * Canonical content visibility rules — single source used by authorization
 * adapters, feed in-memory queries, and feed SQL predicates.
 */

import type { AccountStatus, TargetRef, ViewerContext } from "@workspace/types";

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
  if (isStaff(ctx)) return true;
  if (ctx.blockedUserIds.includes(post.authorId)) return false;
  if (ctx.blockedByUserIds.includes(post.authorId)) return false;
  if (post.authorAccountStatus !== "active") return false;
  if (post.deletedAt) return false;
  if (ctx.userId === post.authorId) return true;
  if (post.removedAt) return false;
  return true;
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
  if (ctx.userId === comment.authorId) return true;
  if (isStaff(ctx)) return true;
  if (ctx.blockedUserIds.includes(comment.authorId)) return false;
  if (ctx.blockedByUserIds.includes(comment.authorId)) return false;
  if (comment.authorAccountStatus !== "active") return false;
  if (comment.deletedAt) return false;
  if (comment.removedAt) return false;
  return true;
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
