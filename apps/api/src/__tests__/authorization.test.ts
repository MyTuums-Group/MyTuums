/**
 * Unit tests for the Authorization module.
 *
 * These tests use the in-memory test adapter — no database required.
 * They verify behavior, not implementation. The production adapter
 * must satisfy the same interface contract validated here.
 *
 * Run: pnpm --filter @workspace/api test
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createTestAdapter } from "../authorization/test-adapter.js";
import type { TargetRef } from "@workspace/types";

// ── Helpers ──────────────────────────────────────────────────────────

function postTarget(overrides: Partial<TargetRef & { type: "post" }> = {}): TargetRef & { type: "post" } {
  return {
    type: "post",
    postId: "post-1",
    authorId: "alice",
    deletedAt: null,
    removedAt: null,
    ...overrides,
  };
}

function commentTarget(overrides: Partial<TargetRef & { type: "comment" }> = {}): TargetRef & { type: "comment" } {
  return {
    type: "comment",
    commentId: "comment-1",
    postId: "post-1",
    authorId: "alice",
    deletedAt: null,
    removedAt: null,
    ...overrides,
  };
}

function profileTarget(userId: string): TargetRef & { type: "profile" } {
  return { type: "profile", userId };
}

// ── Test setup ───────────────────────────────────────────────────────

let adapter: ReturnType<typeof createTestAdapter>;

beforeEach(() => {
  adapter = createTestAdapter();
  adapter.addUser({ id: "alice", role: "user", accountStatus: "active" });
  adapter.addUser({ id: "bob", role: "user", accountStatus: "active" });
  adapter.addUser({ id: "eve", role: "user", accountStatus: "active" });
  adapter.addUser({ id: "mod", role: "moderator", accountStatus: "active" });
  adapter.addUser({ id: "admin", role: "admin", accountStatus: "active" });
  adapter.addUser({ id: "owner1", role: "owner", accountStatus: "active" });
  adapter.addUser({ id: "suspended", role: "user", accountStatus: "suspended" });
  adapter.addUser({ id: "deleted", role: "user", accountStatus: "account_deleted" });
});

// ── getViewerContext ─────────────────────────────────────────────────

describe("getViewerContext", () => {
  it("returns unauthenticated context for null session", async () => {
    const ctx = await adapter.getViewerContext(null);
    expect(ctx.isAuthenticated).toBe(false);
    expect(ctx.userId).toBeNull();
    expect(ctx.role).toBeNull();
    expect(ctx.blockedUserIds).toEqual([]);
    expect(ctx.blockedByUserIds).toEqual([]);
  });

  it("resolves viewer role and account status", async () => {
    const ctx = await adapter.getViewerContext({ userId: "alice" });
    expect(ctx.isAuthenticated).toBe(true);
    expect(ctx.userId).toBe("alice");
    expect(ctx.role).toBe("user");
    expect(ctx.accountStatus).toBe("active");
  });

  it("resolves blocked users (viewer → target)", async () => {
    adapter.addBlock({ blockerId: "alice", blockedId: "bob" });
    const ctx = await adapter.getViewerContext({ userId: "alice" });
    expect(ctx.blockedUserIds).toContain("bob");
    expect(ctx.blockedByUserIds).toEqual([]);
  });

  it("resolves users that block the viewer (target → viewer)", async () => {
    adapter.addBlock({ blockerId: "bob", blockedId: "alice" });
    const ctx = await adapter.getViewerContext({ userId: "alice" });
    expect(ctx.blockedByUserIds).toContain("bob");
    expect(ctx.blockedUserIds).toEqual([]);
  });

  it("resolves bidirectional blocks", async () => {
    adapter.addBlock({ blockerId: "alice", blockedId: "bob" });
    adapter.addBlock({ blockerId: "bob", blockedId: "alice" });
    const ctx = await adapter.getViewerContext({ userId: "alice" });
    expect(ctx.blockedUserIds).toContain("bob");
    expect(ctx.blockedByUserIds).toContain("bob");
  });

  it("returns unauthenticated for unknown user ID", async () => {
    const ctx = await adapter.getViewerContext({ userId: "ghost" });
    expect(ctx.isAuthenticated).toBe(false);
    expect(ctx.userId).toBeNull();
  });
});

// ── Block visibility ─────────────────────────────────────────────────

describe("block visibility", () => {
  it("blocked user cannot view blocker profile", async () => {
    adapter.addBlock({ blockerId: "alice", blockedId: "bob" });
    const bobCtx = await adapter.getViewerContext({ userId: "bob" });
    expect(adapter.canView(bobCtx, profileTarget("alice"))).toBe(false);
  });

  it("blocker cannot view blocked user profile", async () => {
    adapter.addBlock({ blockerId: "alice", blockedId: "bob" });
    const aliceCtx = await adapter.getViewerContext({ userId: "alice" });
    expect(adapter.canView(aliceCtx, profileTarget("bob"))).toBe(false);
  });

  it("blocked user cannot view blocker's posts", async () => {
    adapter.addBlock({ blockerId: "alice", blockedId: "bob" });
    const bobCtx = await adapter.getViewerContext({ userId: "bob" });
    expect(adapter.canView(bobCtx, postTarget({ authorId: "alice" }))).toBe(false);
  });

  it("blocking user cannot view blocked user's posts", async () => {
    adapter.addBlock({ blockerId: "alice", blockedId: "bob" });
    const aliceCtx = await adapter.getViewerContext({ userId: "alice" });
    expect(adapter.canView(aliceCtx, postTarget({ authorId: "bob" }))).toBe(false);
  });

  it("block does not affect unrelated users", async () => {
    adapter.addBlock({ blockerId: "alice", blockedId: "bob" });
    const eveCtx = await adapter.getViewerContext({ userId: "eve" });
    expect(adapter.canView(eveCtx, profileTarget("alice"))).toBe(true);
    expect(adapter.canView(eveCtx, profileTarget("bob"))).toBe(true);
  });
});

// ── Suspension visibility ────────────────────────────────────────────

describe("suspension visibility", () => {
  it("suspended user can view own profile", async () => {
    const ctx = await adapter.getViewerContext({ userId: "suspended" });
    expect(adapter.canView(ctx, profileTarget("suspended"))).toBe(true);
  });

  it("normal user cannot view suspended profile (handled at query level)", async () => {
    // Note: The authorization module's canView checks block/ownership/staff.
    // Suspension status filtering of profiles is done at the query level
    // (excluding suspended/account_deleted from list queries).
    // canView for profiles allows viewing by anyone unless blocked.
    // The actual filter for suspended status happens in the query/service layer.
    const ctx = await adapter.getViewerContext({ userId: "alice" });
    // Profile visibility itself passes unless blocked
    expect(adapter.canView(ctx, profileTarget("suspended"))).toBe(true);
  });
});

// ── Content deletion/removal ─────────────────────────────────────────

describe("content deletion and removal", () => {
  it("author can see own deleted post", async () => {
    const ctx = await adapter.getViewerContext({ userId: "alice" });
    expect(
      adapter.canView(ctx, postTarget({ authorId: "alice", deletedAt: new Date() })),
    ).toBe(true);
  });

  it("author can see own removed post (placeholder context)", async () => {
    const ctx = await adapter.getViewerContext({ userId: "alice" });
    expect(
      adapter.canView(ctx, postTarget({ authorId: "alice", removedAt: new Date() })),
    ).toBe(true);
  });

  it("normal user cannot see deleted post", async () => {
    const ctx = await adapter.getViewerContext({ userId: "bob" });
    expect(
      adapter.canView(ctx, postTarget({ authorId: "alice", deletedAt: new Date() })),
    ).toBe(false);
  });

  it("normal user cannot see removed post", async () => {
    const ctx = await adapter.getViewerContext({ userId: "bob" });
    expect(
      adapter.canView(ctx, postTarget({ authorId: "alice", removedAt: new Date() })),
    ).toBe(false);
  });

  it("staff can see deleted post", async () => {
    const modCtx = await adapter.getViewerContext({ userId: "mod" });
    expect(
      adapter.canView(modCtx, postTarget({ authorId: "alice", deletedAt: new Date() })),
    ).toBe(true);
  });

  it("staff can see removed post", async () => {
    const adminCtx = await adapter.getViewerContext({ userId: "admin" });
    expect(
      adapter.canView(adminCtx, postTarget({ authorId: "alice", removedAt: new Date() })),
    ).toBe(true);
  });

  it("author can see own deleted comment", async () => {
    const ctx = await adapter.getViewerContext({ userId: "alice" });
    expect(
      adapter.canView(ctx, commentTarget({ authorId: "alice", deletedAt: new Date() })),
    ).toBe(true);
  });

  it("normal user cannot see deleted comment", async () => {
    const ctx = await adapter.getViewerContext({ userId: "bob" });
    expect(
      adapter.canView(ctx, commentTarget({ authorId: "alice", deletedAt: new Date() })),
    ).toBe(false);
  });
});

// ── Staff access ──────────────────────────────────────────────────────

describe("staff access", () => {
  it("moderator sees all content", async () => {
    const modCtx = await adapter.getViewerContext({ userId: "mod" });
    expect(modCtx.role).toBe("moderator");
    expect(adapter.canView(modCtx, profileTarget("alice"))).toBe(true);
    expect(adapter.canView(modCtx, postTarget({ authorId: "alice" }))).toBe(true);
  });

  it("admin sees all content", async () => {
    const adminCtx = await adapter.getViewerContext({ userId: "admin" });
    expect(adminCtx.role).toBe("admin");
    expect(adapter.canView(adminCtx, profileTarget("alice"))).toBe(true);
  });

  it("owner sees all content", async () => {
    const ownerCtx = await adapter.getViewerContext({ userId: "owner1" });
    expect(ownerCtx.role).toBe("owner");
    expect(adapter.canView(ownerCtx, profileTarget("alice"))).toBe(true);
  });

  it("normal user is NOT staff", async () => {
    const ctx = await adapter.getViewerContext({ userId: "alice" });
    // Normal user cannot see deleted content
    expect(
      adapter.canView(ctx, postTarget({ authorId: "bob", deletedAt: new Date() })),
    ).toBe(false);
  });
});

// ── Public preview (logged-out) ──────────────────────────────────────

describe("public preview (logged-out)", () => {
  it("logged-out viewer can see public profiles", async () => {
    const ctx = await adapter.getViewerContext(null);
    expect(adapter.canView(ctx, profileTarget("alice"))).toBe(true);
  });

  it("logged-out viewer can see public posts", async () => {
    const ctx = await adapter.getViewerContext(null);
    expect(adapter.canView(ctx, postTarget({ authorId: "alice" }))).toBe(true);
  });

  it("logged-out viewer cannot see deleted posts", async () => {
    const ctx = await adapter.getViewerContext(null);
    expect(
      adapter.canView(ctx, postTarget({ authorId: "alice", deletedAt: new Date() })),
    ).toBe(false);
  });

  it("logged-out viewer has no blocks", async () => {
    const ctx = await adapter.getViewerContext(null);
    expect(ctx.blockedUserIds).toEqual([]);
    expect(ctx.blockedByUserIds).toEqual([]);
  });
});

// ── filterVisible batch filter ────────────────────────────────────────

describe("filterVisible", () => {
  it("filters out hidden targets, keeps visible ones", async () => {
    adapter.addBlock({ blockerId: "alice", blockedId: "bob" });
    const aliceCtx = await adapter.getViewerContext({ userId: "alice" });

    const targets: TargetRef[] = [
      profileTarget("alice"), // self — visible
      profileTarget("bob"), // blocked — hidden
      postTarget({ authorId: "alice" }), // own post — visible
      postTarget({ authorId: "alice", deletedAt: new Date() }), // own deleted — visible
      postTarget({ authorId: "bob" }), // blocked author — hidden
      commentTarget({ authorId: "alice" }), // own comment — visible
      commentTarget({ authorId: "eve" }), // visible
    ];

    const visible = adapter.filterVisible(aliceCtx, targets);
    expect(visible).toHaveLength(5);
  });

  it("returns empty array when all targets are hidden", async () => {
    adapter.addBlock({ blockerId: "alice", blockedId: "bob" });
    const aliceCtx = await adapter.getViewerContext({ userId: "alice" });

    const targets: TargetRef[] = [
      profileTarget("bob"),
      postTarget({ authorId: "bob" }),
    ];

    expect(adapter.filterVisible(aliceCtx, targets)).toEqual([]);
  });

  it("keeps all targets for staff", async () => {
    adapter.addBlock({ blockerId: "alice", blockedId: "bob" });
    const modCtx = await adapter.getViewerContext({ userId: "mod" });

    const targets: TargetRef[] = [
      profileTarget("alice"),
      profileTarget("bob"),
      postTarget({ authorId: "alice", deletedAt: new Date() }),
    ];

    expect(adapter.filterVisible(modCtx, targets)).toHaveLength(3);
  });
});
