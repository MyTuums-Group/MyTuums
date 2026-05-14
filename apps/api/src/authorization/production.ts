/**
 * Production authorization adapter — backed by Drizzle/PostgreSQL.
 *
 * Implements the AuthorizationAdapter interface defined in @workspace/types.
 * Visibility rules are delegated to `services/visibility`.
 */

import type {
  ViewerContext,
  TargetRef,
  AuthorizationAdapter,
} from "@workspace/types";
import type { UserRole, AccountStatus } from "@workspace/types";
import { db } from "@workspace/db";
import { user, block } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { canViewTarget } from "../services/visibility/memory.js";

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
  return canViewTarget(ctx, target);
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
