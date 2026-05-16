import { describe, expect, it } from "vitest";
import type { ViewerContext } from "@workspace/types";
import type { FeedPostRow } from "../feed/index.js";
import {
  createPostPresentation,
  createStubMediaService,
  decodeCursor,
  encodeCursor,
  InvalidFeedCursorError,
} from "./presentation.js";

const viewerAlice: ViewerContext = {
  userId: "alice",
  role: "user",
  accountStatus: "active",
  blockedUserIds: [],
  blockedByUserIds: [],
  isAuthenticated: true,
};

const viewerBob: ViewerContext = {
  userId: "bob",
  role: "user",
  accountStatus: "active",
  blockedUserIds: [],
  blockedByUserIds: [],
  isAuthenticated: true,
};

const staffViewer: ViewerContext = {
  userId: "mod",
  role: "moderator",
  accountStatus: "active",
  blockedUserIds: [],
  blockedByUserIds: [],
  isAuthenticated: true,
};

function baseRow(overrides: Partial<FeedPostRow> = {}): FeedPostRow {
  const createdAt = new Date("2024-01-15T12:00:00.000Z");
  return {
    id: "post-internal-id",
    publicId: "abc12345",
    authorId: "alice",
    authorUsername: "alice",
    authorDisplayName: "Alice",
    authorAvatarMediaId: null,
    authorAccountStatus: "active",
    text: "Hello world",
    gameTagId: null,
    gameTagSlug: null,
    gameTagName: null,
    mediaAttachmentId: null,
    mediaMimeType: null,
    mediaBlobKey: null,
    mediaStorageContainer: null,
    mediaStatus: null,
    likeCount: 3,
    commentCount: 1,
    deletedAt: null,
    removedAt: null,
    removalPublicReason: null,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

describe("post presentation", () => {
  it("toPostView sets canDelete when the viewer is the author and the post is not deleted", async () => {
    const p = createPostPresentation({
      media: createStubMediaService(() => Promise.resolve({ ok: false, error: { kind: "media_not_found" } })),
      loadPostDetail: () => Promise.resolve(null),
    });

    const view = await p.toPostView(viewerAlice, baseRow({ authorId: "alice", deletedAt: null }));
    expect(view.canDelete).toBe(true);
  });

  it("toPostView clears canDelete for other viewers or soft-deleted posts", async () => {
    const p = createPostPresentation({
      media: createStubMediaService(() => Promise.resolve({ ok: false, error: { kind: "media_not_found" } })),
      loadPostDetail: () => Promise.resolve(null),
    });

    expect(await p.toPostView(viewerBob, baseRow({ authorId: "alice", deletedAt: null }))).toMatchObject({
      canDelete: false,
    });

    expect(
      await p.toPostView(viewerAlice, baseRow({ authorId: "alice", deletedAt: new Date() })),
    ).toMatchObject({
      canDelete: false,
    });
  });

  it("toPostView maps image vs video from MIME prefix and omits media when signing fails", async () => {
    const p = createPostPresentation({
      media: createStubMediaService((id) => {
        if (id === "m-bad") return Promise.resolve({ ok: false, error: { kind: "media_not_found" } });
        return Promise.resolve({ ok: true, value: { readUrl: "https://cdn.example/signed" } });
      }),
      loadPostDetail: () => Promise.resolve(null),
    });

    const imageView = await p.toPostView(
      viewerAlice,
      baseRow({
        mediaAttachmentId: "m-1",
        mediaMimeType: "image/png",
        mediaStatus: "ready",
      }),
    );
    expect(imageView.media).toEqual({
      id: "m-1",
      kind: "image",
      mimeType: "image/png",
      url: "https://cdn.example/signed",
    });

    const videoView = await p.toPostView(
      viewerAlice,
      baseRow({
        mediaAttachmentId: "m-2",
        mediaMimeType: "video/mp4",
        mediaStatus: "ready",
      }),
    );
    expect(videoView.media).toMatchObject({ kind: "video", mimeType: "video/mp4" });

    const unsigned = await p.toPostView(
      viewerAlice,
      baseRow({
        mediaAttachmentId: "m-bad",
        mediaMimeType: "image/jpeg",
        mediaStatus: "ready",
      }),
    );
    expect(unsigned.media).toBeNull();
  });

  it("toPostView signs author avatars and falls back when avatar media is missing", async () => {
    const p = createPostPresentation({
      media: createStubMediaService((id) => {
        if (id === "avatar-media") {
          return Promise.resolve({ ok: true, value: { readUrl: "https://cdn.example/avatar" } });
        }
        return Promise.resolve({ ok: false, error: { kind: "media_not_found" } });
      }),
      loadPostDetail: () => Promise.resolve(null),
    });

    await expect(
      p.toPostView(viewerAlice, baseRow({ authorAvatarMediaId: "avatar-media" })),
    ).resolves.toMatchObject({
      author: {
        avatarUrl: "https://cdn.example/avatar",
      },
    });

    await expect(
      p.toPostView(viewerAlice, baseRow({ authorAvatarMediaId: "stale-avatar-media" })),
    ).resolves.toMatchObject({
      author: {
        avatarUrl: null,
      },
    });
  });

  it("toPostView includes gameTag only when id, slug, and name are present", async () => {
    const p = createPostPresentation({
      media: createStubMediaService(() => Promise.resolve({ ok: false, error: { kind: "media_not_found" } })),
      loadPostDetail: () => Promise.resolve(null),
    });

    expect(
      await p.toPostView(
        viewerAlice,
        baseRow({
          gameTagId: "g1",
          gameTagSlug: "valorant",
          gameTagName: "Valorant",
        }),
      ),
    ).toMatchObject({
      gameTag: { id: "g1", slug: "valorant", name: "Valorant" },
    });

    expect(
      await p.toPostView(
        viewerAlice,
        baseRow({
          gameTagId: "g1",
          gameTagSlug: null,
          gameTagName: "Valorant",
        }),
      ),
    ).toMatchObject({ gameTag: null });
  });

  it("shows removed posts to authors as placeholders but keeps staff moderation context complete", async () => {
    const p = createPostPresentation({
      media: createStubMediaService(() => Promise.resolve({ ok: true, value: { readUrl: "https://cdn.example/signed" } })),
      loadPostDetail: () => Promise.resolve(null),
    });
    const removedAt = new Date("2026-01-02T00:00:00.000Z");
    const row = baseRow({
      removedAt,
      removalPublicReason: "harassment",
      mediaAttachmentId: "m-1",
      mediaMimeType: "image/png",
      mediaStatus: "ready",
    });

    await expect(p.toPostView(viewerAlice, row)).resolves.toMatchObject({
      text: "",
      media: null,
      canDelete: false,
      moderationRemoval: {
        publicReason: "harassment",
        removedAt,
        supportPath: "/contact",
      },
    });

    await expect(p.toPostView(staffViewer, row)).resolves.toMatchObject({
      text: "Hello world",
      media: {
        id: "m-1",
      },
      moderationRemoval: null,
    });
  });

  it("encodeCursor and decodeCursor round-trip", () => {
    const row = baseRow({ publicId: "postid_xx", createdAt: new Date("2024-06-01T08:30:00.000Z") });
    const token = encodeCursor(row);
    expect(decodeCursor(token)).toEqual({
      createdAt: "2024-06-01T08:30:00.000Z",
      publicId: "postid_xx",
    });
  });

  it("decodeCursor throws InvalidFeedCursorError for malformed payloads", () => {
    expect(() => decodeCursor("not-base64url!!!")).toThrow(InvalidFeedCursorError);
  });

  it("resolveCursor validates against loadPostDetail", async () => {
    const row = baseRow({ publicId: "pid12345", createdAt: new Date("2024-01-10T00:00:00.000Z") });
    const p = createPostPresentation({
      media: createStubMediaService(() => Promise.resolve({ ok: false, error: { kind: "media_not_found" } })),
      loadPostDetail: (_viewer, publicId) => Promise.resolve(publicId === "pid12345" ? row : null),
    });

    const cursor = encodeCursor(row);
    await expect(p.resolveCursor(viewerAlice, cursor)).resolves.toEqual({
      createdAt: row.createdAt,
      id: row.id,
    });

    const wrongTime = encodeCursor({ ...row, createdAt: new Date("2020-01-01T00:00:00.000Z") });
    await expect(p.resolveCursor(viewerAlice, wrongTime)).rejects.toThrow(InvalidFeedCursorError);
  });

  it("toFeedResponse preserves feed context for route-level empty states", async () => {
    const p = createPostPresentation({
      media: createStubMediaService(() => Promise.resolve({ ok: false, error: { kind: "media_not_found" } })),
      loadPostDetail: () => Promise.resolve(null),
    });

    await expect(
      p.toFeedResponse(viewerAlice, {
        items: [],
        nextCursor: null,
        context: { kind: "for_you", hasFavoriteGames: false },
      }),
    ).resolves.toMatchObject({
      context: { kind: "for_you", hasFavoriteGames: false },
    });
  });
});
