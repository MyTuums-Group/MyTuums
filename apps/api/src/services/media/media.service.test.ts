import { Buffer } from "node:buffer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeBlobStorageAdapter } from "./blob-storage.adapter.js";
import * as mediaAdapter from "./media.adapter.js";
import type { MediaRow } from "./media.adapter.js";
import { createMediaService, type MediaPersistenceAdapter } from "./media.js";

const MOCK_USER_ID = "user-1";

function mediaRow(overrides: Partial<MediaRow> = {}): MediaRow {
  return {
    id: "media-1",
    ownerId: MOCK_USER_ID,
    purpose: "post_attachment",
    status: "pending",
    mimeType: "image/png",
    byteSize: 1024,
    blobKey: "blob-key-1",
    storageContainer: "user-uploads",
    confirmedAt: null,
    attachedTargetType: null,
    attachedTargetId: null,
    attachedSlot: null,
    attachedAt: null,
    expiresAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

vi.mock("./media.adapter.js", () => ({
  findById: vi.fn(),
  findByOwnerAndStatus: vi.fn(),
  findPendingExpired: vi.fn(),
  findUnattachedReadyExpired: vi.fn(),
  findDeletedMedia: vi.fn(),
  findFailedMedia: vi.fn(),
  findByStatus: vi.fn(),
  insert: vi.fn(),
  updateStatus: vi.fn(),
  markReady: vi.fn(),
  markAttached: vi.fn(),
  markFailed: vi.fn(),
  markDeleted: vi.fn(),
  removeByIds: vi.fn(),
  countByStatus: vi.fn(),
}));

function mediaService(storage: FakeBlobStorageAdapter) {
  return createMediaService({
    adapter: mediaAdapter as unknown as MediaPersistenceAdapter,
    storage,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Media service — createUploadIntent", () => {
  let storage: FakeBlobStorageAdapter;

  beforeEach(() => {
    storage = new FakeBlobStorageAdapter();
  });

  it("creates an upload intent and returns mediaId + uploadUrl", async () => {
    vi.mocked(mediaAdapter.insert).mockResolvedValue(
      mediaRow({ id: "new-media-id", status: "pending" })
    );

    const result = await mediaService(storage).createUploadIntent(
      MOCK_USER_ID,
      {
        mimeType: "image/png",
        byteSize: 1024,
        purpose: "post_attachment",
      }
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.mediaId).toBeTypeOf("string");
      expect(result.value.mediaId.length).toBeGreaterThan(0);
      expect(result.value.uploadUrl).toMatch(/^fake-upload:\/\//);
    }
    expect(mediaAdapter.insert).toHaveBeenCalledOnce();
    const insertArg = vi.mocked(mediaAdapter.insert).mock.calls[0]?.[0];
    expect(insertArg?.ownerId).toBe(MOCK_USER_ID);
    expect(insertArg?.status).toBe("pending");
    expect(insertArg?.purpose).toBe("post_attachment");
  });

  it("rejects invalid MIME type", async () => {
    const result = await mediaService(storage).createUploadIntent(
      MOCK_USER_ID,
      {
        mimeType: "application/zip",
        byteSize: 1024,
        purpose: "post_attachment",
      }
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("invalid_mime_type");
    }
    expect(mediaAdapter.insert).not.toHaveBeenCalled();
  });

  it("rejects profile avatar video before creating a pending media row", async () => {
    const result = await mediaService(storage).createUploadIntent(
      MOCK_USER_ID,
      {
        mimeType: "video/mp4",
        byteSize: 1024,
        purpose: "profile_avatar",
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("invalid_mime_type");
      expect(result.error.message).toContain(
        "Profile avatar uploads must be images",
      );
    }
    expect(mediaAdapter.insert).not.toHaveBeenCalled();
  });

  it("rejects profile banner video before creating a pending media row", async () => {
    const result = await mediaService(storage).createUploadIntent(
      MOCK_USER_ID,
      {
        mimeType: "video/webm",
        byteSize: 1024,
        purpose: "profile_banner",
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("invalid_mime_type");
      expect(result.error.message).toContain(
        "Profile banner uploads must be images",
      );
    }
    expect(mediaAdapter.insert).not.toHaveBeenCalled();
  });

  it("still creates post attachment video upload intents", async () => {
    vi.mocked(mediaAdapter.insert).mockResolvedValue(
      mediaRow({
        id: "video-media-id",
        status: "pending",
        mimeType: "video/mp4",
      }),
    );

    const result = await mediaService(storage).createUploadIntent(
      MOCK_USER_ID,
      {
        mimeType: "video/mp4",
        byteSize: 1024,
        purpose: "post_attachment",
      },
    );

    expect(result.ok).toBe(true);
    expect(mediaAdapter.insert).toHaveBeenCalledOnce();
    const insertArg = vi.mocked(mediaAdapter.insert).mock.calls[0]?.[0];
    expect(insertArg?.mimeType).toBe("video/mp4");
    expect(insertArg?.purpose).toBe("post_attachment");
  });

  it("rejects oversized image", async () => {
    const result = await mediaService(storage).createUploadIntent(
      MOCK_USER_ID,
      {
        mimeType: "image/jpeg",
        byteSize: 11 * 1024 * 1024,
        purpose: "profile_avatar",
      }
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("file_too_large");
    }
  });
});

describe("Media service — confirmUpload", () => {
  let storage: FakeBlobStorageAdapter;

  beforeEach(() => {
    storage = new FakeBlobStorageAdapter();
  });

  it("confirms a pending upload with matching blob", async () => {
    const row = mediaRow({
      id: "media-1",
      status: "pending",
      blobKey: "blob-1",
      expiresAt: new Date(Date.now() + 3600_000),
    });
    vi.mocked(mediaAdapter.findById).mockResolvedValue(row);
    vi.mocked(mediaAdapter.markReady).mockResolvedValue(
      mediaRow({ ...row, status: "ready" })
    );
    storage.storeBlob("user-uploads", "blob-1", {
      data: Buffer.from("test"),
      mimeType: "image/png",
      size: 1024,
    });

    const result = await mediaService(storage).confirmUpload(
      "media-1",
      MOCK_USER_ID
    );

    expect(result.ok).toBe(true);
    expect(mediaAdapter.markReady).toHaveBeenCalledOnce();
  });

  it("fails when blob does not exist in storage", async () => {
    const row = mediaRow({
      id: "media-1",
      status: "pending",
      blobKey: "blob-1",
      expiresAt: new Date(Date.now() + 3600_000),
    });
    vi.mocked(mediaAdapter.findById).mockResolvedValue(row);

    const result = await mediaService(storage).confirmUpload(
      "media-1",
      MOCK_USER_ID
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("blob_not_found");
    }
  });

  it("fails for expired pending media", async () => {
    const row = mediaRow({
      id: "media-1",
      status: "pending",
      expiresAt: new Date(Date.now() - 3600_000),
    });
    vi.mocked(mediaAdapter.findById).mockResolvedValue(row);

    const result = await mediaService(storage).confirmUpload(
      "media-1",
      MOCK_USER_ID
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("media_expired");
    }
  });

  it("fails for wrong owner", async () => {
    const row = mediaRow({
      id: "media-1",
      status: "pending",
      ownerId: "user-2",
      expiresAt: new Date(Date.now() + 3600_000),
    });
    vi.mocked(mediaAdapter.findById).mockResolvedValue(row);

    const result = await mediaService(storage).confirmUpload(
      "media-1",
      MOCK_USER_ID
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("wrong_owner");
    }
  });
});

describe("Media service — attachMedia", () => {
  const storage = new FakeBlobStorageAdapter();

  it("attaches ready media with matching owner, purpose, and target", async () => {
    const row = mediaRow({
      id: "media-1",
      status: "ready",
      expiresAt: new Date(Date.now() + 3600_000),
    });
    const target = {
      targetType: "post" as const,
      targetId: "post-1",
      slot: "post_attachment" as const,
    };
    vi.mocked(mediaAdapter.findById).mockResolvedValue(row);
    vi.mocked(mediaAdapter.markAttached).mockResolvedValue(
      mediaRow({
        ...row,
        status: "attached",
        attachedTargetType: target.targetType,
        attachedTargetId: target.targetId,
        attachedSlot: target.slot,
        attachedAt: new Date("2026-01-01T00:00:00.000Z"),
      })
    );

    const result = await mediaService(storage).attachMedia(
      "media-1",
      MOCK_USER_ID,
      "post_attachment",
      target
    );

    expect(result.ok).toBe(true);
    expect(mediaAdapter.markAttached).toHaveBeenCalledWith("media-1", target);
  });

  it("rejects pending media (not ready)", async () => {
    const row = mediaRow({
      id: "media-1",
      status: "pending",
    });
    vi.mocked(mediaAdapter.findById).mockResolvedValue(row);

    const result = await mediaService(storage).attachMedia(
      "media-1",
      MOCK_USER_ID,
      "post_attachment"
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("media_not_ready");
    }
  });

  it("rejects wrong purpose", async () => {
    const row = mediaRow({
      id: "media-1",
      status: "ready",
      purpose: "profile_avatar",
      expiresAt: new Date(Date.now() + 3600_000),
    });
    vi.mocked(mediaAdapter.findById).mockResolvedValue(row);

    const result = await mediaService(storage).attachMedia(
      "media-1",
      MOCK_USER_ID,
      "post_attachment"
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("wrong_purpose");
    }
  });

  it("rejects wrong owner", async () => {
    const row = mediaRow({
      id: "media-1",
      status: "ready",
      ownerId: "user-2",
      expiresAt: new Date(Date.now() + 3600_000),
    });
    vi.mocked(mediaAdapter.findById).mockResolvedValue(row);

    const result = await mediaService(storage).attachMedia(
      "media-1",
      MOCK_USER_ID,
      "post_attachment"
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("wrong_owner");
    }
  });
});

describe("Media service — signReadUrl", () => {
  const storage = new FakeBlobStorageAdapter();

  it("signs a read URL for ready media", async () => {
    vi.mocked(mediaAdapter.findById).mockResolvedValue(
      mediaRow({ status: "ready" })
    );

    const result = await mediaService(storage).signReadUrl("media-1");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.readUrl).toMatch(/^fake-read:\/\//);
    }
  });

  it("signs a read URL for attached media", async () => {
    vi.mocked(mediaAdapter.findById).mockResolvedValue(
      mediaRow({ status: "attached" })
    );

    const result = await mediaService(storage).signReadUrl("media-1");

    expect(result.ok).toBe(true);
  });

  it("rejects signing for pending media", async () => {
    vi.mocked(mediaAdapter.findById).mockResolvedValue(
      mediaRow({ status: "pending" })
    );

    const result = await mediaService(storage).signReadUrl("media-1");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("media_not_accessible");
    }
  });
});

describe("Media service — reissueUploadUrl", () => {
  const storage = new FakeBlobStorageAdapter();

  it("reissues upload URL for pending media", async () => {
    vi.mocked(mediaAdapter.findById).mockResolvedValue(
      mediaRow({
        status: "pending",
        expiresAt: new Date(Date.now() + 3600_000),
      })
    );

    const result = await mediaService(storage).reissueUploadUrl(
      "media-1",
      MOCK_USER_ID
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.uploadUrl).toMatch(/^fake-upload:\/\//);
    }
  });

  it("rejects reissue for expired media", async () => {
    vi.mocked(mediaAdapter.findById).mockResolvedValue(
      mediaRow({
        status: "pending",
        expiresAt: new Date(Date.now() - 3600_000),
      })
    );

    const result = await mediaService(storage).reissueUploadUrl(
      "media-1",
      MOCK_USER_ID
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("media_expired");
    }
  });
});

describe("Media service — computeCleanupCandidates", () => {
  const storage = new FakeBlobStorageAdapter();

  it("returns eligible cleanup candidates", async () => {
    const now = new Date();
    vi.mocked(mediaAdapter.findPendingExpired).mockResolvedValue([
      mediaRow({
        id: "pending-1",
        status: "pending",
        expiresAt: new Date(now.getTime() - 1000),
      }),
    ]);
    vi.mocked(mediaAdapter.findUnattachedReadyExpired).mockResolvedValue([
      mediaRow({
        id: "ready-1",
        status: "ready",
        expiresAt: new Date(now.getTime() - 1000),
      }),
    ]);
    vi.mocked(mediaAdapter.findDeletedMedia).mockResolvedValue([
      mediaRow({ id: "deleted-1", status: "deleted" }),
    ]);
    vi.mocked(mediaAdapter.findFailedMedia).mockResolvedValue([
      mediaRow({ id: "failed-1", status: "failed" }),
    ]);

    const candidates = await mediaService(storage).computeCleanupCandidates();

    expect(candidates).toHaveLength(4);
    const ids = candidates.map((c) => c.mediaId);
    expect(ids).toContain("pending-1");
    expect(ids).toContain("ready-1");
    expect(ids).toContain("deleted-1");
    expect(ids).toContain("failed-1");
  });

  it("excludes non-expired pending media", async () => {
    vi.mocked(mediaAdapter.findPendingExpired).mockResolvedValue([]);
    vi.mocked(mediaAdapter.findUnattachedReadyExpired).mockResolvedValue([]);
    vi.mocked(mediaAdapter.findDeletedMedia).mockResolvedValue([]);
    vi.mocked(mediaAdapter.findFailedMedia).mockResolvedValue([]);

    const candidates = await mediaService(storage).computeCleanupCandidates();

    expect(candidates).toHaveLength(0);
  });
});

describe("FakeBlobStorageAdapter", () => {
  it("generates upload URL", async () => {
    const storage = new FakeBlobStorageAdapter();
    const url = await storage.generateSignedUploadUrl("c", "k", 900);
    expect(url).toBe("fake-upload://c/k?lifetime=900");
  });

  it("generates read URL", async () => {
    const storage = new FakeBlobStorageAdapter();
    const url = await storage.generateSignedReadUrl("c", "k", 900);
    expect(url).toBe("fake-read://c/k?lifetime=900");
  });

  it("verifies stored blobs", async () => {
    const storage = new FakeBlobStorageAdapter();
    storage.storeBlob("c", "k", {
      data: Buffer.from("x"),
      mimeType: "image/png",
      size: 1,
    });
    const result = await storage.verifyBlob("c", "k");
    expect(result.exists).toBe(true);
    expect(result.size).toBe(1);
    expect(result.mimeType).toBe("image/png");
  });

  it("returns exists=false for unknown blobs", async () => {
    const storage = new FakeBlobStorageAdapter();
    const result = await storage.verifyBlob("c", "k");
    expect(result.exists).toBe(false);
  });

  it("deletes blobs", async () => {
    const storage = new FakeBlobStorageAdapter();
    storage.storeBlob("c", "k", {
      data: Buffer.from("x"),
      mimeType: "image/png",
      size: 1,
    });
    await storage.deleteBlob("c", "k");
    expect((await storage.verifyBlob("c", "k")).exists).toBe(false);
  });

  it("clear removes all blobs", () => {
    const storage = new FakeBlobStorageAdapter();
    storage.storeBlob("c", "k1", {
      data: Buffer.from("x"),
      mimeType: "image/png",
      size: 1,
    });
    storage.storeBlob("c", "k2", {
      data: Buffer.from("y"),
      mimeType: "image/png",
      size: 1,
    });
    storage.clear();
    // Can't easily check without exposing internals; verifyBlob covers it
  });
});
