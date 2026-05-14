import { describe, expect, it } from "vitest";
import type { ViewerContext } from "@workspace/types";
import {
  createInMemoryFeedVisibilityQueries,
  type FeedPostRow,
  type FeedCommentRow,
} from "../services/feed/index.js";

const publicViewer: ViewerContext = {
  userId: null,
  role: null,
  accountStatus: null,
  blockedUserIds: [],
  blockedByUserIds: [],
  isAuthenticated: false,
};

const aliceViewer: ViewerContext = {
  userId: "alice",
  role: "user",
  accountStatus: "active",
  blockedUserIds: ["blocked-by-alice"],
  blockedByUserIds: ["blocks-alice"],
  isAuthenticated: true,
};

const modViewer: ViewerContext = {
  userId: "mod",
  role: "moderator",
  accountStatus: "active",
  blockedUserIds: [],
  blockedByUserIds: [],
  isAuthenticated: true,
};

const basePost = {
  authorUsername: "bob",
  authorDisplayName: "Bob",
  text: "hello",
  gameTagId: null,
  gameTagSlug: null,
  gameTagName: null,
  mediaAttachmentId: null,
  mediaMimeType: null,
  mediaBlobKey: null,
  mediaStorageContainer: null,
  mediaStatus: null,
  likeCount: 0,
  commentCount: 0,
  deletedAt: null,
  removedAt: null,
  removalPublicReason: null,
  authorAccountStatus: "active" as const,
};

function post(
  publicId: string,
  authorId: string,
  createdAt: string,
  overrides: Partial<FeedPostRow> = {},
): FeedPostRow {
  return {
    ...basePost,
    id: `id-${publicId}`,
    publicId,
    authorId,
    authorUsername: authorId,
    authorDisplayName: authorId.toUpperCase(),
    createdAt: new Date(createdAt),
    updatedAt: new Date(createdAt),
    ...overrides,
  };
}

function comment(
  id: string,
  postId: string,
  authorId: string,
  createdAt: string,
  overrides: Partial<FeedCommentRow> = {},
): FeedCommentRow {
  return {
    id,
    postId,
    authorId,
    text: "reply",
    likeCount: 0,
    deletedAt: null,
    removedAt: null,
    removalPublicReason: null,
    createdAt: new Date(createdAt),
    updatedAt: new Date(createdAt),
    authorAccountStatus: "active",
    ...overrides,
  };
}

describe("feed visibility queries", () => {
  it("applies visibility before cursor pagination so hidden rows do not consume the page", async () => {
    const queries = createInMemoryFeedVisibilityQueries({
      posts: [
        post("new-visible", "bob", "2026-01-04T00:00:00Z"),
        post("hidden-blocked", "blocked-by-alice", "2026-01-03T00:00:00Z"),
        post("older-visible", "carol", "2026-01-02T00:00:00Z"),
      ],
      comments: [],
      follows: [],
    });

    const page = await queries.forYouFeed(aliceViewer, { limit: 2 });

    expect(page.items.map((item) => item.publicId)).toEqual([
      "new-visible",
      "older-visible",
    ]);
    expect(page.nextCursor).toBeNull();
  });

  it("centralizes blocked, suspended/deleted author, user-deleted, and moderation-removed post rules", async () => {
    const queries = createInMemoryFeedVisibilityQueries({
      posts: [
        post("visible", "bob", "2026-01-08T00:00:00Z"),
        post("viewer-blocked-author", "blocked-by-alice", "2026-01-07T00:00:00Z"),
        post("author-blocked-viewer", "blocks-alice", "2026-01-06T00:00:00Z"),
        post("suspended-author", "suspended", "2026-01-05T00:00:00Z", {
          authorAccountStatus: "suspended",
        }),
        post("deleted-author", "deleted-user", "2026-01-04T00:00:00Z", {
          authorAccountStatus: "account_deleted",
        }),
        post("self-deleted", "bob", "2026-01-03T00:00:00Z", {
          deletedAt: new Date("2026-01-03T00:01:00Z"),
        }),
        post("moderation-removed", "bob", "2026-01-02T00:00:00Z", {
          removedAt: new Date("2026-01-02T00:01:00Z"),
        }),
      ],
      comments: [],
      follows: [],
    });

    const page = await queries.discoverFeed(aliceViewer, { limit: 10 });

    expect(page.items.map((item) => item.publicId)).toEqual(["visible"]);
  });

  it("hides self-deleted posts from authors in normal feeds and detail views", async () => {
    const queries = createInMemoryFeedVisibilityQueries({
      posts: [
        post("self-deleted", "alice", "2026-01-03T00:00:00Z", {
          deletedAt: new Date("2026-01-03T00:01:00Z"),
        }),
        post("still-visible", "alice", "2026-01-02T00:00:00Z"),
      ],
      comments: [],
      follows: [],
    });

    await expect(queries.forYouFeed(aliceViewer, { limit: 10 })).resolves.toMatchObject({
      items: [{ publicId: "still-visible" }],
    });
    await expect(queries.profileFeed(aliceViewer, "alice", { limit: 10 })).resolves.toMatchObject({
      items: [{ publicId: "still-visible" }],
    });
    await expect(queries.postDetail(aliceViewer, "self-deleted")).resolves.toBeNull();
  });

  it("still allows staff visibility for self-deleted posts in moderation context", async () => {
    const queries = createInMemoryFeedVisibilityQueries({
      posts: [
        post("self-deleted", "alice", "2026-01-03T00:00:00Z", {
          deletedAt: new Date("2026-01-03T00:01:00Z"),
        }),
      ],
      comments: [],
      follows: [],
    });

    await expect(queries.postDetail(modViewer, "self-deleted")).resolves.toMatchObject({
      publicId: "self-deleted",
    });
  });

  it("provides visible feed variants, post detail, and visible comment lists", async () => {
    const visiblePost = post("visible-game", "bob", "2026-01-04T00:00:00Z", {
      gameTagId: "game-1",
    });
    const queries = createInMemoryFeedVisibilityQueries({
      posts: [
        visiblePost,
        post("other-game", "carol", "2026-01-03T00:00:00Z", { gameTagId: "game-2" }),
        post("followed", "eve", "2026-01-02T00:00:00Z"),
      ],
      comments: [
        comment("comment-visible", visiblePost.id, "carol", "2026-01-06T00:00:00Z"),
        comment("comment-hidden", visiblePost.id, "blocked-by-alice", "2026-01-05T00:00:00Z"),
      ],
      follows: [{ followerId: "alice", followedId: "eve" }],
    });

    await expect(queries.gameFeed(aliceViewer, "game-1", { limit: 10 })).resolves.toMatchObject({
      items: [{ publicId: "visible-game" }],
    });
    await expect(queries.profileFeed(aliceViewer, "eve", { limit: 10 })).resolves.toMatchObject({
      items: [{ publicId: "followed" }],
    });
    await expect(queries.followingFeed(aliceViewer, { limit: 10 })).resolves.toMatchObject({
      items: [{ publicId: "followed" }],
    });
    await expect(queries.postDetail(aliceViewer, "visible-game")).resolves.toMatchObject({
      publicId: "visible-game",
    });
    await expect(queries.commentList(aliceViewer, visiblePost.id, { limit: 10 })).resolves.toMatchObject({
      items: [{ id: "comment-visible" }],
    });
  });

  it("lets staff query moderation-visible content while public feed queries hide it", async () => {
    const queries = createInMemoryFeedVisibilityQueries({
      posts: [
        post("removed", "bob", "2026-01-02T00:00:00Z", {
          removedAt: new Date("2026-01-02T00:01:00Z"),
        }),
      ],
      comments: [],
      follows: [],
    });

    await expect(queries.forYouFeed(publicViewer, { limit: 10 })).resolves.toMatchObject({
      items: [],
    });
    await expect(queries.postDetail(modViewer, "removed")).resolves.toMatchObject({
      publicId: "removed",
    });
  });
});
