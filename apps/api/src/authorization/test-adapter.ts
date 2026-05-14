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
} from "@workspace/types";
import type { UserRole, AccountStatus } from "@workspace/types";
import { canViewTarget } from "../services/visibility/memory.js";

// ── Internal state (plain objects, no Map/Set for CI compatibility) ──

interface TestUser {
  id: string;
  role: UserRole;
  accountStatus: AccountStatus;
}

interface TestBlock {
  blockerId: string;
  blockedId: string;
}

interface TestState {
  users: Record<string, TestUser>;
  /** blockerId → blockedId[] */
  blocksByBlocker: Record<string, string[]>;
}

export function createTestAdapter(): AuthorizationAdapter & {
  addUser: (u: TestUser) => void;
  addBlock: (b: TestBlock) => void;
  reset: () => void;
} {
  const state: TestState = { users: {}, blocksByBlocker: {} };

  function addUser(u: TestUser): void {
    state.users[u.id] = u;
  }

  function addBlock(b: TestBlock): void {
    if (!state.blocksByBlocker[b.blockerId]) {
      state.blocksByBlocker[b.blockerId] = [];
    }
    state.blocksByBlocker[b.blockerId]!.push(b.blockedId);
  }

  function reset(): void {
    state.users = {};
    state.blocksByBlocker = {};
  }

  function getViewerContext(
    session: { userId: string } | null,
  ): Promise<ViewerContext> {
    // Synchronous in-memory — wraps in Promise.resolve to satisfy interface
    const result = _getViewerContext(session);
    return Promise.resolve(result);
  }

  function _getViewerContext(
    session: { userId: string } | null,
  ): ViewerContext {
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

    const viewer = state.users[session.userId];
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
    const blockedUserIds = state.blocksByBlocker[viewer.id] ?? [];

    // Users that block THIS viewer
    const blockedByUserIds: string[] = [];
    for (const blockerId of Object.keys(state.blocksByBlocker)) {
      const blockedList = state.blocksByBlocker[blockerId];
      if (blockedList && blockedList.includes(viewer.id)) {
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
    return canViewTarget(ctx, target);
  }

  function filterVisible(
    ctx: ViewerContext,
    targets: TargetRef[],
  ): TargetRef[] {
    return targets.filter((t) => canView(ctx, t));
  }

  return { getViewerContext, canView, filterVisible, addUser, addBlock, reset };
}
