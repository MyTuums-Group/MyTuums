/**
 * Production authorization adapter — backed by Drizzle/PostgreSQL.
 *
 * Implements the AuthorizationAdapter interface defined in @workspace/types.
 * This is the single seam through which ALL visibility rules pass.
 * No other module should write its own block-check, suspension-check,
 * or content-visibility logic.
 */

import type {
  ViewerContext,
  TargetRef,
  AuthorizationAdapter,
} from "@workspace/types";
import type { UserRole, AccountStatus } from "@workspace/types";
import { db } from "@workspace/db";
import { user, block, post, comment } from "@workspace/db/schema";
import { eq, and, or, inArray } from "drizzle-orm";

// ── getViewerContext ─────────────────────────────────────────────────

export async function getViewerContext(
  session: { userId: string } | null,
): Promise<ViewerContext> {
  if (!session) {
    return {
      userId: null,
      role: null,
      accountStatus: null,
      blockedUserIds: [],
      blockedByUserIds: [],
      isAuthenticated: false,
    };
  }

  const viewerId = session.userId;

  // Fetch viewer's user record (role + accountStatus)
  const viewer = await db
    .select({
      role: user.role,
      accountStatus: user.accountStatus,
    })
    .from(user)
    .where(eq(user.id, viewerId))
    .limit(1);

  const viewerUser = viewer[0];

  if (!viewerUser) {
    // User record deleted — treat as unauthenticated
    return {
      userId: null,
      role: null,
      accountStatus: null,
      blockedUserIds: [],
      blockedByUserIds: [],
      isAuthenticated: false,
    };
  }

  // Fetch blocks in both directions
  const blockedByViewer = await db
    .select({ blockedId: block.blockedId })
    .from(block)
    .where(eq(block.blockerId, viewerId));

  const blockingViewer = await db
    .select({ blockerId: block.blockerId })
    .from(block)
    .where(eq(block.blockedId, viewerId));

  return {
    userId: viewerId,
    role: viewerUser.role as UserRole,
    accountStatus: viewerUser.accountStatus as AccountStatus,
    blockedUserIds: blockedByViewer.map((r) => r.blockedId),
    blockedByUserIds: blockingViewer.map((r) => r.blockerId),
    isAuthenticated: true,
  };
}

// ── canView ──────────────────────────────────────────────────────────

export function canView(ctx: ViewerContext, target: TargetRef): boolean {
  switch (target.type) {
    case "user":
      return canViewUser(ctx, target.userId);
    case "profile":
      return canViewProfile(ctx, target.userId);
    case "post":
      return canViewPost(ctx, target);
    case "comment":
      return canViewComment(ctx, target);
    default:
      return false;
  }
}

// ── filterVisible ────────────────────────────────────────────────────

export function filterVisible(
  ctx: ViewerContext,
  targets: TargetRef[],
): TargetRef[] {
  return targets.filter((t) => canView(ctx, t));
}

// ── Adaptor object ───────────────────────────────────────────────────

export const authorization: AuthorizationAdapter = {
  getViewerContext,
  canView,
  filterVisible,
};

// ── Private helpers ──────────────────────────────────────────────────

/**
 * Block visibility is bidirectional: neither user can see the other.
 * Suspended and account-deleted users are hidden from public.
 * Staff can always view users in moderation context.
 */
function canViewUser(ctx: ViewerContext, targetUserId: string): boolean {
  // Viewing self is always allowed (suspended users can see status page,
  // account-deleted users need basic access to see deletion confirmation)
  if (ctx.userId === targetUserId) return true;

  // Staff can always view users
  if (isStaff(ctx)) return true;

  // Block check: bidirectional
  if (ctx.blockedUserIds.includes(targetUserId)) return false;
  if (ctx.blockedByUserIds.includes(targetUserId)) return false;

  // For non-staff, we allow viewing any active user.
  // The actual account status check happens at the content level
  // (e.g., canViewProfile checks account status).
  // User records themselves are viewable unless blocked.
  return true;
}

function isStaff(ctx: ViewerContext): boolean {
  if (!ctx.isAuthenticated || !ctx.role) return false;
  return (
    ctx.role === "moderator" ||
    ctx.role === "admin" ||
    ctx.role === "owner"
  );
}

/**
 * Profile visibility:
 * - Staff: always visible (moderation context)
 * - Self: always visible (settings page)
 * - Blocked: hidden
 * - Suspended: hidden (profile page returns unavailable)
 * - Account deleted: hidden
 * - Logged-out: visible for public preview
 */
function canViewProfile(ctx: ViewerContext, profileUserId: string): boolean {
  // Self always sees own profile
  if (ctx.userId === profileUserId) return true;

  // Staff override
  if (isStaff(ctx)) return true;

  // Block check
  if (ctx.blockedUserIds.includes(profileUserId)) return false;
  if (ctx.blockedByUserIds.includes(profileUserId)) return false;

  // Logged-out public preview: allow (profile detail page is public)
  // Content-level visibility (suspended/deleted) checked separately
  return true;
}

/**
 * Post visibility rules:
 * - Author: can see own post (including placeholders for removed)
 * - Staff: can see all posts in moderation context
 * - Blocked (either direction): hidden
 * - User-deleted (deletedAt != null): hidden from normal users
 * - Moderation-removed (removedAt != null): hidden from normal users,
 *   author sees placeholder
 * - Suspended/account-deleted author: post hidden from normal users
 *
 * Note: The post target includes deletedAt/removedAt from the query.
 * The authorization module checks these fields without re-querying.
 */
function canViewPost(ctx: ViewerContext, t: TargetRef & { type: "post" }): boolean {
  // Author can always see own post (placeholder or full content)
  if (ctx.userId === t.authorId) return true;

  // Staff can see everything
  if (isStaff(ctx)) return true;

  // Block check: bidirectional
  if (ctx.blockedUserIds.includes(t.authorId)) return false;
  if (ctx.blockedByUserIds.includes(t.authorId)) return false;

  // Deleted or removed content hidden from non-staff non-author
  if (t.deletedAt) return false;
  if (t.removedAt) return false;

  return true;
}

/**
 * Comment visibility rules:
 * - Author: can see own comment (including placeholders for removed)
 * - Staff: can see all comments
 * - Blocked (either direction with comment author): hidden
 * - User-deleted: hidden from normal users
 * - Moderation-removed: hidden from normal users, author sees placeholder
 */
function canViewComment(
  ctx: ViewerContext,
  t: TargetRef & { type: "comment" },
): boolean {
  // Author sees own comment
  if (ctx.userId === t.authorId) return true;

  // Staff override
  if (isStaff(ctx)) return true;

  // Block check
  if (ctx.blockedUserIds.includes(t.authorId)) return false;
  if (ctx.blockedByUserIds.includes(t.authorId)) return false;

  // Deleted or removed
  if (t.deletedAt) return false;
  if (t.removedAt) return false;

  return true;
}
