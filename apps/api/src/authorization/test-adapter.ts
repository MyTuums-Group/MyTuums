/**
 * In-memory test adapter for the Authorization module.
 *
 * Provides the same AuthorizationAdapter interface without a database.
 * Tests seed this adapter with user/block/content state, then verify
 * visibility behavior without needing PostgreSQL or Docker.
 *
 * Usage in tests:
 *   const adapter = createTestAdapter();
 *   adapter.addUser({ id: "alice", role: "user", accountStatus: "active" });
 *   adapter.addBlock({ blockerId: "alice", blockedId: "bob" });
 *   const ctx = await adapter.getViewerContext({ userId: "alice" });
 *   assert(!adapter.canView(ctx, { type: "profile", userId: "bob" }));
 */

import type {
  ViewerContext,
  TargetRef,
  AuthorizationAdapter,
  UserRole,
  AccountStatus,
} from "@workspace/types";

interface TestUser {
  id: string;
  role: UserRole;
  accountStatus: AccountStatus;
}

interface TestBlock {
  blockerId: string;
  blockedId: string;
}

export function createTestAdapter(): AuthorizationAdapter & {
  addUser: (u: TestUser) => void;
  addBlock: (b: TestBlock) => void;
  reset: () => void;
} {
  const users = new Map<string, TestUser>();
  const blocks = new Map<string, Set<string>>(); // blockerId → Set<blockedId>

  function addUser(u: TestUser): void {
    users.set(u.id, u);
  }

  function addBlock(b: TestBlock): void {
    if (!blocks.has(b.blockerId)) blocks.set(b.blockerId, new Set());
    blocks.get(b.blockerId)!.add(b.blockedId);
  }

  function reset(): void {
    users.clear();
    blocks.clear();
  }

  async function getViewerContext(
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

    const viewer = users.get(session.userId);
    if (!viewer) {
      return {
        userId: null,
        role: null,
        accountStatus: null,
        blockedUserIds: [],
        blockedByUserIds: [],
        isAuthenticated: false,
      };
    }

    // Users blocked BY this viewer
    const blockedUserIds = Array.from(
      blocks.get(viewer.id) ?? new Set(),
    );

    // Users that block THIS viewer
    const blockedByUserIds: string[] = [];
    for (const [blockerId, blockedSet] of blocks) {
      if (blockedSet.has(viewer.id)) {
        blockedByUserIds.push(blockerId);
      }
    }

    return {
      userId: viewer.id,
      role: viewer.role,
      accountStatus: viewer.accountStatus,
      blockedUserIds,
      blockedByUserIds,
      isAuthenticated: true,
    };
  }

  function canView(ctx: ViewerContext, target: TargetRef): boolean {
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

  function filterVisible(
    ctx: ViewerContext,
    targets: TargetRef[],
  ): TargetRef[] {
    return targets.filter((t) => canView(ctx, t));
  }

  // ── Private helpers (mirror production logic) ────────────────────

  function isStaff(ctx: ViewerContext): boolean {
    if (!ctx.isAuthenticated || !ctx.role) return false;
    return (
      ctx.role === "moderator" ||
      ctx.role === "admin" ||
      ctx.role === "owner"
    );
  }

  function canViewUser(ctx: ViewerContext, targetUserId: string): boolean {
    if (ctx.userId === targetUserId) return true;
    if (isStaff(ctx)) return true;
    if (ctx.blockedUserIds.includes(targetUserId)) return false;
    if (ctx.blockedByUserIds.includes(targetUserId)) return false;
    return true;
  }

  function canViewProfile(
    ctx: ViewerContext,
    profileUserId: string,
  ): boolean {
    if (ctx.userId === profileUserId) return true;
    if (isStaff(ctx)) return true;
    if (ctx.blockedUserIds.includes(profileUserId)) return false;
    if (ctx.blockedByUserIds.includes(profileUserId)) return false;
    return true;
  }

  function canViewPost(
    ctx: ViewerContext,
    t: TargetRef & { type: "post" },
  ): boolean {
    if (ctx.userId === t.authorId) return true;
    if (isStaff(ctx)) return true;
    if (ctx.blockedUserIds.includes(t.authorId)) return false;
    if (ctx.blockedByUserIds.includes(t.authorId)) return false;
    if (t.deletedAt) return false;
    if (t.removedAt) return false;
    return true;
  }

  function canViewComment(
    ctx: ViewerContext,
    t: TargetRef & { type: "comment" },
  ): boolean {
    if (ctx.userId === t.authorId) return true;
    if (isStaff(ctx)) return true;
    if (ctx.blockedUserIds.includes(t.authorId)) return false;
    if (ctx.blockedByUserIds.includes(t.authorId)) return false;
    if (t.deletedAt) return false;
    if (t.removedAt) return false;
    return true;
  }

  return { getViewerContext, canView, filterVisible, addUser, addBlock, reset };
}
