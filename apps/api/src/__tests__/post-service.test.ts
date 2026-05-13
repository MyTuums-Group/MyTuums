import { describe, expect, it } from "vitest";
import { POST_TEXT_MAX_LENGTH } from "@workspace/types";
import {
  createInMemoryPostService,
  type PostRecord,
} from "../services/post/post.core.js";

function createService(overrides?: {
  posts?: PostRecord[];
}) {
  return createInMemoryPostService({
    posts: overrides?.posts ?? [],
    games: [
      {
        id: "game-1",
        slug: "valorant",
        name: "Valorant",
        isActive: true,
      },
      {
        id: "game-2",
        slug: "retired-game",
        name: "Retired Game",
        isActive: false,
      },
    ],
  });
}

describe("post service", () => {
  it("rejects whitespace-only text", async () => {
    const service = createService();

    await expect(
      service.createPost({
        authorId: "alice",
        text: "   \n\t  ",
      }),
    ).resolves.toEqual({
      ok: false,
      error: {
        kind: "invalid_post_body",
        message: "Post text cannot be empty.",
      },
    });
  });

  it("rejects text over the trimmed grapheme limit", async () => {
    const service = createService();

    const tooLong = "a".repeat(POST_TEXT_MAX_LENGTH + 1);

    const result = await service.createPost({
      authorId: "alice",
      text: tooLong,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected createPost to fail.");
    }
    expect(result.error.kind).toBe("invalid_post_body");
    if (result.error.kind !== "invalid_post_body") {
      throw new Error("Expected invalid_post_body.");
    }
    expect(result.error.message).toContain(`${POST_TEXT_MAX_LENGTH} characters`);
  });

  it("normalizes CRLF and CR to LF and trims before storing", async () => {
    const service = createService();

    const result = await service.createPost({
      authorId: "alice",
      text: "\r\n  first line\rsecond line\r\nthird line  \r\n",
    });

    expect(result).toMatchObject({
      ok: true,
      value: {
        text: "first line\nsecond line\nthird line",
      },
    });
  });

  it("stores the author, optional game tag, createdAt, and an opaque public ID", async () => {
    const service = createService();

    const result = await service.createPost({
      authorId: "alice",
      text: "Trying out a ranked warmup.",
      gameTagId: "game-1",
    });

    expect(result).toMatchObject({
      ok: true,
      value: {
        authorId: "alice",
        text: "Trying out a ranked warmup.",
        gameTagId: "game-1",
        likeCount: 0,
        commentCount: 0,
        deletedAt: null,
        removedAt: null,
      },
    });

    if (!result.ok) {
      throw new Error("Expected createPost to succeed.");
    }

    expect(result.value.createdAt).toBeInstanceOf(Date);
    expect(result.value.updatedAt).toBeInstanceOf(Date);
    expect(result.value.publicId).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(result.value.publicId).not.toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("rejects inactive or missing game tags", async () => {
    const service = createService();

    await expect(
      service.createPost({
        authorId: "alice",
        text: "Looking for a squad.",
        gameTagId: "game-2",
      }),
    ).resolves.toEqual({
      ok: false,
      error: {
        kind: "invalid_game_tag",
      },
    });
  });

  it("marks the author's post as deleted", async () => {
    const service = createService();
    const created = await service.createPost({
      authorId: "alice",
      text: "Temporary post",
    });

    if (!created.ok) {
      throw new Error("Expected createPost to succeed.");
    }

    await expect(
      service.deleteOwnPost({
        publicId: created.value.publicId,
        authorId: "alice",
      }),
    ).resolves.toEqual({
      ok: true,
      value: {
        publicId: created.value.publicId,
      },
    });

    const snapshot = service.snapshot();
    expect(snapshot.posts[0]?.deletedAt).toBeInstanceOf(Date);
  });

  it("refuses deletion by a non-author", async () => {
    const service = createService();
    const created = await service.createPost({
      authorId: "alice",
      text: "My post",
    });

    if (!created.ok) {
      throw new Error("Expected createPost to succeed.");
    }

    await expect(
      service.deleteOwnPost({
        publicId: created.value.publicId,
        authorId: "bob",
      }),
    ).resolves.toEqual({
      ok: false,
      error: {
        kind: "forbidden",
      },
    });
  });

  it("treats already-deleted posts as unavailable for repeated self-delete", async () => {
    const deletedAt = new Date("2026-01-02T00:00:00.000Z");
    const service = createService({
      posts: [
        {
          id: "post-1",
          publicId: "pub_00000001",
          authorId: "alice",
          text: "Deleted already",
          gameTagId: null,
          likeCount: 0,
          commentCount: 0,
          deletedAt,
          removedAt: null,
          removalPublicReason: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: deletedAt,
        },
      ],
    });

    await expect(
      service.deleteOwnPost({
        publicId: "pub_00000001",
        authorId: "alice",
      }),
    ).resolves.toEqual({
      ok: false,
      error: {
        kind: "already_deleted",
      },
    });
  });
});
