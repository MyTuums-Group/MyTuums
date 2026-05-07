// ── Authorization types ─────────────────────────────────────────────
// Shared between production and test adapters. This module defines the
// ViewerContext shape, TargetRef discriminated union, and the adapter
// interface that both implementations must satisfy.

import type { UserRole, AccountStatus } from "./index.js";

/** Entity types that pass through the visibility seam. */
export type TargetType = "user" | "post" | "comment" | "profile";

/**
 * Discriminated union referencing a specific entity for visibility checks.
 * Uses internal IDs — public route IDs (like post.publicId) are resolved
 * to TargetRef before calling the authorization module.
 */
export type TargetRef =
  | { type: "user"; userId: string }
  | { type: "post"; postId: string; authorId: string; deletedAt: Date | null; removedAt: Date | null }
  | { type: "comment"; commentId: string; authorId: string; postId: string; deletedAt: Date | null; removedAt: Date | null }
  | { type: "profile"; userId: string };

/**
 * Resolved viewer context — built once per request by getViewerContext(),
 * then reused across all canView() / filterVisible() calls.
 */
export interface ViewerContext {
  /** null when unauthenticated (logged-out public preview) */
  userId: string | null;
  /** null when unauthenticated */
  role: UserRole | null;
  /** null when unauthenticated */
  accountStatus: AccountStatus | null;
  /** User IDs blocked BY this viewer (viewer blocked them) */
  blockedUserIds: string[];
  /** User IDs that block THIS viewer (they blocked the viewer) */
  blockedByUserIds: string[];
  /** Whether the viewer has a session (is not logged out) */
  isAuthenticated: boolean;
}

/** Helper: is the viewer's account active (not suspended, not deleted)? */
export function isViewerActive(ctx: ViewerContext): boolean {
  return ctx.isAuthenticated && ctx.accountStatus === "active";
}

/** Helper: does the viewer have staff access (moderator, admin, owner)? */
export function isStaff(ctx: ViewerContext): boolean {
  if (!ctx.isAuthenticated || !ctx.role) return false;
  return ctx.role === "moderator" || ctx.role === "admin" || ctx.role === "owner";
}

/**
 * Adapter interface — both the production (Drizzle-backed) adapter and
 * the in-memory test adapter conform to this shape.
 */
export interface AuthorizationAdapter {
  getViewerContext(session: { userId: string } | null): Promise<ViewerContext>;
  canView(ctx: ViewerContext, target: TargetRef): boolean;
  filterVisible(ctx: ViewerContext, targets: TargetRef[]): TargetRef[];
}
