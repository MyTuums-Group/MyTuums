import { describe, expect, it } from "vitest";
import type { AccountStatus, ViewerContext } from "@workspace/types";
import {
  evaluateFeedCommentVisibility,
  evaluateFeedPostVisibility,
  feedBlockedAuthorIds,
  isFeedAuthorBlocked,
} from "../services/visibility/feed-policy.js";
import {
  canViewFeedComment,
  canViewFeedPost,
  isStaff,
} from "../services/visibility/memory.js";

function viewer(partial: Partial<ViewerContext> & Pick<ViewerContext, "userId">): ViewerContext {
  return {
    role: null,
    accountStatus: null,
    blockedUserIds: [],
    blockedByUserIds: [],
    isAuthenticated: partial.isAuthenticated ?? partial.userId !== null,
    ...partial,
  };
}

describe("feed visibility policy contract", () => {
  it("keeps blocked-author union stable for SQL notInArray and isFeedAuthorBlocked", () => {
    const v = viewer({
      userId: "alice",
      blockedUserIds: ["u1", "u1"],
      blockedByUserIds: ["u1", "u2"],
    });
    expect(feedBlockedAuthorIds(v).sort()).toEqual(["u1", "u2"]);
    expect(isFeedAuthorBlocked(v, "u1")).toBe(true);
    expect(isFeedAuthorBlocked(v, "u2")).toBe(true);
    expect(isFeedAuthorBlocked(v, "u3")).toBe(false);
  });

  describe("evaluateFeedPostVisibility", () => {
    const base = {
      viewerUserId: "alice" as string | null,
      viewerIsStaff: false,
      authorId: "bob",
      authorIsBlockedForFeed: false,
      authorAccountStatus: "active" as AccountStatus,
      deletedAt: null as Date | null,
      removedAt: null as Date | null,
    };

    it("matches the production matrix for posts", () => {
      const cases: Array<{ name: string; patch: Partial<typeof base>; visible: boolean }> = [
        { name: "staff bypasses everything", patch: { viewerIsStaff: true, removedAt: new Date() }, visible: true },
        { name: "blocked author hidden", patch: { authorIsBlockedForFeed: true }, visible: false },
        { name: "suspended author hidden", patch: { authorAccountStatus: "suspended" }, visible: false },
        { name: "deleted account hidden", patch: { authorAccountStatus: "account_deleted" }, visible: false },
        { name: "self-deleted hidden from everyone", patch: { deletedAt: new Date(), viewerUserId: "bob" }, visible: false },
        { name: "author sees own non-deleted removed post", patch: { viewerUserId: "bob", authorId: "bob", removedAt: new Date() }, visible: true },
        { name: "others do not see removed", patch: { removedAt: new Date() }, visible: false },
        { name: "public sees active clean post", patch: {}, visible: true },
      ];

      for (const { name, patch, visible } of cases) {
        expect(evaluateFeedPostVisibility({ ...base, ...patch }), name).toBe(visible);
      }
    });
  });

  describe("evaluateFeedCommentVisibility", () => {
    const base = {
      viewerUserId: "alice" as string | null,
      viewerIsStaff: false,
      authorId: "bob",
      authorIsBlockedForFeed: false,
      authorAccountStatus: "active" as AccountStatus,
      deletedAt: null as Date | null,
      removedAt: null as Date | null,
    };

    it("matches the production matrix for comments (author-first)", () => {
      const cases: Array<{ name: string; patch: Partial<typeof base>; visible: boolean }> = [
        { name: "author always sees own comment", patch: { viewerUserId: "bob", authorId: "bob", deletedAt: new Date(), removedAt: new Date() }, visible: true },
        { name: "staff bypasses", patch: { viewerIsStaff: true, removedAt: new Date() }, visible: true },
        { name: "blocked hidden", patch: { authorIsBlockedForFeed: true }, visible: false },
        { name: "inactive author hidden for others", patch: { authorAccountStatus: "suspended" }, visible: false },
        { name: "deleted hidden for others", patch: { deletedAt: new Date() }, visible: false },
        { name: "removed hidden for others", patch: { removedAt: new Date() }, visible: false },
        { name: "public sees clean comment", patch: {}, visible: true },
      ];

      for (const { name, patch, visible } of cases) {
        expect(evaluateFeedCommentVisibility({ ...base, ...patch }), name).toBe(visible);
      }
    });
  });

  it("keeps memory adapters aligned with evaluate* (no drift between layers)", () => {
    const alice = viewer({
      userId: "alice",
      role: "user",
      blockedUserIds: ["blocked-by-alice"],
      blockedByUserIds: ["blocks-alice"],
    });
    const mod = viewer({ userId: "mod", role: "moderator", isAuthenticated: true });

    const posts: Array<{
      ctx: ViewerContext;
      post: { authorId: string; authorAccountStatus: AccountStatus; deletedAt: Date | null; removedAt: Date | null };
    }> = [
      { ctx: alice, post: { authorId: "bob", authorAccountStatus: "active", deletedAt: null, removedAt: null } },
      { ctx: alice, post: { authorId: "blocked-by-alice", authorAccountStatus: "active", deletedAt: null, removedAt: null } },
      { ctx: alice, post: { authorId: "alice", authorAccountStatus: "active", deletedAt: new Date(), removedAt: null } },
      { ctx: alice, post: { authorId: "alice", authorAccountStatus: "active", deletedAt: null, removedAt: new Date() } },
      { ctx: mod, post: { authorId: "bob", authorAccountStatus: "active", deletedAt: null, removedAt: new Date() } },
    ];

    for (const { ctx, post } of posts) {
      expect(canViewFeedPost(ctx, post)).toBe(
        evaluateFeedPostVisibility({
          viewerUserId: ctx.userId,
          viewerIsStaff: isStaff(ctx),
          authorId: post.authorId,
          authorIsBlockedForFeed: isFeedAuthorBlocked(ctx, post.authorId),
          authorAccountStatus: post.authorAccountStatus,
          deletedAt: post.deletedAt,
          removedAt: post.removedAt,
        }),
      );
    }

    const comments: Array<{
      ctx: ViewerContext;
      comment: { authorId: string; authorAccountStatus: AccountStatus; deletedAt: Date | null; removedAt: Date | null };
    }> = [
      { ctx: alice, comment: { authorId: "bob", authorAccountStatus: "active", deletedAt: null, removedAt: null } },
      { ctx: alice, comment: { authorId: "alice", authorAccountStatus: "active", deletedAt: new Date(), removedAt: new Date() } },
      { ctx: mod, comment: { authorId: "bob", authorAccountStatus: "active", deletedAt: null, removedAt: new Date() } },
    ];

    for (const { ctx, comment } of comments) {
      expect(canViewFeedComment(ctx, comment)).toBe(
        evaluateFeedCommentVisibility({
          viewerUserId: ctx.userId,
          viewerIsStaff: isStaff(ctx),
          authorId: comment.authorId,
          authorIsBlockedForFeed: isFeedAuthorBlocked(ctx, comment.authorId),
          authorAccountStatus: comment.authorAccountStatus,
          deletedAt: comment.deletedAt,
          removedAt: comment.removedAt,
        }),
      );
    }
  });
});
