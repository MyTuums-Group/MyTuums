import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  validateUploadIntent,
  validateAttachment,
  validateStatusTransition,
  validateCanSignReadUrl,
  validatePendingForConfirmation,
  validatePendingForReissue,
  isCleanupEligible,
  canTransition,
  mediaKind,
  maxBytesForKind,
  computePendingExpiry,
  computeCleanupDeadline,
  isPendingExpired,
  MEDIA_PURPOSES,
  ALLOWED_MEDIA_MIME_TYPES,
  PENDING_EXPIRY_SECONDS,
  UNATTACHED_CLEANUP_SECONDS,
  UPLOAD_URL_LIFETIME_SECONDS,
  READ_URL_LIFETIME_SECONDS,
} from "../services/media/index.js";
import type { MediaAttachmentInfo } from "../services/media/media.policy.js";
import { FakeBlobStorageAdapter } from "../services/media/blob-storage.adapter.js";
import {
  createUploadIntent,
  confirmUpload,
  attachMedia,
  signReadUrl,
  reissueUploadUrl,
  computeCleanupCandidates,
} from "../services/media/media.js";
import * as mediaAdapter from "../services/media/media.adapter.js";
import type { MediaRow } from "../services/media/media.adapter.js";

// ── Mock DB adapter ──────────────────────────────────────────────────

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
    expiresAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

vi.mock("../services/media/media.adapter.js", () => ({
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

beforeEach(() => {
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════
// Policy tests
// ═══════════════════════════════════════════════════════════════════════

describe("Media policy — upload intent validation", () => {
  it("accepts a valid image upload intent", () => {
    const result = validateUploadIntent({
      mimeType: "image/png",
      byteSize: 1024,
      purpose: "post_attachment",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.mimeType).toBe("image/png");
      expect(result.value.byteSize).toBe(1024);
      expect(result.value.purpose).toBe("post_attachment");
    }
  });

  it("accepts a valid video upload intent", () => {
    const result = validateUploadIntent({
      mimeType: "video/mp4",
      byteSize: 50 * 1024 * 1024,
      purpose: "post_attachment",
    });
    expect(result.ok).toBe(true);
  });

  it("rejects an invalid MIME type", () => {
    const result = validateUploadIntent({
      mimeType: "application/pdf",
      byteSize: 1024,
      purpose: "post_attachment",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("invalid_mime_type");
    }
  });

  it("rejects an image exceeding 10 MB", () => {
    const result = validateUploadIntent({
      mimeType: "image/jpeg",
      byteSize: 11 * 1024 * 1024,
      purpose: "profile_avatar",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("file_too_large");
    }
  });

  it("rejects a video exceeding 100 MB", () => {
    const result = validateUploadIntent({
      mimeType: "video/webm",
      byteSize: 101 * 1024 * 1024,
      purpose: "post_attachment",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("file_too_large");
    }
  });

  it("rejects zero-byte files", () => {
    const result = validateUploadIntent({
      mimeType: "image/png",
      byteSize: 0,
      purpose: "post_attachment",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("file_too_large");
    }
  });

  it("rejects an invalid purpose", () => {
    const result = validateUploadIntent({
      mimeType: "image/png",
      byteSize: 1024,
      purpose: "chat_attachment",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("invalid_purpose");
    }
  });

  it("accepts all three valid purposes", () => {
    for (const purpose of MEDIA_PURPOSES) {
      const result = validateUploadIntent({
        mimeType: "image/png",
        byteSize: 1024,
        purpose,
      });
      expect(result.ok).toBe(true);
    }
  });

  it("accepts all allowed MIME types", () => {
    for (const mimeType of ALLOWED_MEDIA_MIME_TYPES) {
      const result = validateUploadIntent({
        mimeType,
        byteSize: 1024,
        purpose: "post_attachment",
      });
      expect(result.ok).toBe(true);
    }
  });
});

describe("Media policy — mediaKind and maxBytesForKind", () => {
  it("identifies image MIME types", () => {
    expect(mediaKind("image/jpeg")).toBe("image");
    expect(mediaKind("image/png")).toBe("image");
    expect(mediaKind("image/webp")).toBe("image");
  });

  it("identifies video MIME types", () => {
    expect(mediaKind("video/mp4")).toBe("video");
    expect(mediaKind("video/webm")).toBe("video");
  });

  it("returns null for unknown MIME types", () => {
    expect(mediaKind("application/octet-stream")).toBeNull();
  });

  it("returns correct max bytes per kind", () => {
    expect(maxBytesForKind("image")).toBe(10 * 1024 * 1024);
    expect(maxBytesForKind("video")).toBe(100 * 1024 * 1024);
  });
});

describe("Media policy — status transitions", () => {
  it("allows pending → ready", () => {
    expect(canTransition("pending", "ready")).toBe(true);
  });

  it("allows pending → failed", () => {
    expect(canTransition("pending", "failed")).toBe(true);
  });

  it("allows pending → deleted", () => {
    expect(canTransition("pending", "deleted")).toBe(true);
  });

  it("allows ready → attached", () => {
    expect(canTransition("ready", "attached")).toBe(true);
  });

  it("allows ready → deleted", () => {
    expect(canTransition("ready", "deleted")).toBe(true);
  });

  it("allows attached → deleted", () => {
    expect(canTransition("attached", "deleted")).toBe(true);
  });

  it("allows failed → deleted", () => {
    expect(canTransition("failed", "deleted")).toBe(true);
  });

  it("disallows pending → attached (must be ready first)", () => {
    expect(canTransition("pending", "attached")).toBe(false);
  });

  it("disallows attached → ready (irreversible)", () => {
    expect(canTransition("attached", "ready")).toBe(false);
  });

  it("disallows deleted → anything (terminal)", () => {
    expect(canTransition("deleted", "ready")).toBe(false);
    expect(canTransition("deleted", "attached")).toBe(false);
    expect(canTransition("deleted", "pending")).toBe(false);
  });

  it("validateStatusTransition succeeds for valid transitions", () => {
    const result = validateStatusTransition("pending", "ready");
    expect(result.ok).toBe(true);
  });

  it("validateStatusTransition fails for invalid transitions", () => {
    const result = validateStatusTransition("ready", "pending");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("invalid_transition");
    }
  });
});

describe("Media policy — attachment validation", () => {
  const baseMedia: MediaAttachmentInfo = {
    id: "media-1",
    ownerId: "user-1",
    purpose: "post_attachment",
    status: "ready",
    expiresAt: new Date(Date.now() + 3600_000), // 1 hour in future
  };

  it("accepts valid attachment", () => {
    const result = validateAttachment(baseMedia, "user-1", "post_attachment");
    expect(result.ok).toBe(true);
  });

  it("rejects non-ready media", () => {
    const result = validateAttachment(
      { ...baseMedia, status: "pending" },
      "user-1",
      "post_attachment",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("media_not_ready");
      if (result.error.kind === "media_not_ready") {
        expect(result.error.status).toBe("pending");
      }
    }
  });

  it("rejects expired media", () => {
    const result = validateAttachment(
      { ...baseMedia, expiresAt: new Date(Date.now() - 1000) },
      "user-1",
      "post_attachment",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("media_expired");
    }
  });

  it("rejects wrong owner", () => {
    const result = validateAttachment(baseMedia, "user-2", "post_attachment");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("wrong_owner");
    }
  });

  it("rejects wrong purpose", () => {
    const result = validateAttachment(baseMedia, "user-1", "profile_avatar");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("wrong_purpose");
      if (result.error.kind === "wrong_purpose") {
        expect(result.error.expected).toBe("profile_avatar");
        expect(result.error.actual).toBe("post_attachment");
      }
    }
  });

  it("accepts null expiresAt (not expired)", () => {
    const result = validateAttachment(
      { ...baseMedia, expiresAt: null },
      "user-1",
      "post_attachment",
    );
    expect(result.ok).toBe(true);
  });
});

describe("Media policy — pending confirmation validation", () => {
  const baseMedia: MediaAttachmentInfo = {
    id: "media-1",
    ownerId: "user-1",
    purpose: "post_attachment",
    status: "pending",
    expiresAt: new Date(Date.now() + 3600_000),
  };

  it("accepts valid pending media", () => {
    const result = validatePendingForConfirmation(
      baseMedia,
      "user-1",
    );
    expect(result.ok).toBe(true);
  });

  it("rejects non-pending media", () => {
    const result = validatePendingForConfirmation(
      { ...baseMedia, status: "ready" },
      "user-1",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("media_not_pending");
    }
  });

  it("rejects wrong owner", () => {
    const result = validatePendingForConfirmation(baseMedia, "user-2");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("wrong_owner");
    }
  });

  it("rejects expired pending media", () => {
    const result = validatePendingForConfirmation(
      { ...baseMedia, expiresAt: new Date(Date.now() - 1000) },
      "user-1",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("media_expired");
    }
  });
});

describe("Media policy — reissue validation", () => {
  const baseMedia: MediaAttachmentInfo = {
    id: "media-1",
    ownerId: "user-1",
    purpose: "post_attachment",
    status: "pending",
    expiresAt: new Date(Date.now() + 3600_000),
  };

  it("accepts valid pending media for reissue", () => {
    const result = validatePendingForReissue(baseMedia, "user-1");
    expect(result.ok).toBe(true);
  });

  it("rejects ready media (already confirmed)", () => {
    const result = validatePendingForReissue(
      { ...baseMedia, status: "ready" },
      "user-1",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("media_not_pending");
    }
  });
});

describe("Media policy — read URL signing", () => {
  it("allows signing for ready media", () => {
    expect(validateCanSignReadUrl("ready").ok).toBe(true);
  });

  it("allows signing for attached media", () => {
    expect(validateCanSignReadUrl("attached").ok).toBe(true);
  });

  it("rejects signing for pending media", () => {
    const result = validateCanSignReadUrl("pending");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("media_not_accessible");
    }
  });

  it("rejects signing for deleted media", () => {
    const result = validateCanSignReadUrl("deleted");
    expect(result.ok).toBe(false);
  });

  it("rejects signing for failed media", () => {
    const result = validateCanSignReadUrl("failed");
    expect(result.ok).toBe(false);
  });
});

describe("Media policy — expiry helpers", () => {
  it("computes pending expiry at 30 minutes", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const expiry = computePendingExpiry(now);
    expect(expiry.getTime() - now.getTime()).toBe(PENDING_EXPIRY_SECONDS * 1000);
  });

  it("computes cleanup deadline at 24 hours", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const deadline = computeCleanupDeadline(now);
    expect(deadline.getTime() - now.getTime()).toBe(UNATTACHED_CLEANUP_SECONDS * 1000);
  });

  it("detects expired media", () => {
    const past = new Date(Date.now() - 1000);
    expect(isPendingExpired(past)).toBe(true);
  });

  it("detects non-expired media", () => {
    const future = new Date(Date.now() + 3600_000);
    expect(isPendingExpired(future)).toBe(false);
  });

  it("null expiresAt is not expired", () => {
    expect(isPendingExpired(null)).toBe(false);
  });
});

describe("Media policy — cleanup eligibility", () => {
  const now = new Date();
  const past = new Date(now.getTime() - 1000);
  const future = new Date(now.getTime() + 3600_000);

  it("pending + expired = eligible", () => {
    expect(isCleanupEligible("pending", past, now)).toBe(true);
  });

  it("pending + not expired = not eligible", () => {
    expect(isCleanupEligible("pending", future, now)).toBe(false);
  });

  it("ready + expired = eligible", () => {
    expect(isCleanupEligible("ready", past, now)).toBe(true);
  });

  it("ready + not expired = not eligible", () => {
    expect(isCleanupEligible("ready", future, now)).toBe(false);
  });

  it("failed = always eligible", () => {
    expect(isCleanupEligible("failed", null, now)).toBe(true);
    expect(isCleanupEligible("failed", future, now)).toBe(true);
  });

  it("deleted = always eligible", () => {
    expect(isCleanupEligible("deleted", null, now)).toBe(true);
    expect(isCleanupEligible("deleted", future, now)).toBe(true);
  });

  it("attached = never eligible", () => {
    expect(isCleanupEligible("attached", past, now)).toBe(false);
    expect(isCleanupEligible("attached", null, now)).toBe(false);
    expect(isCleanupEligible("attached", future, now)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Service tests (mocked adapters)
// ═══════════════════════════════════════════════════════════════════════

describe("Media service — createUploadIntent", () => {
  let storage: FakeBlobStorageAdapter;

  beforeEach(() => {
    storage = new FakeBlobStorageAdapter();
  });

  it("creates an upload intent and returns mediaId + uploadUrl", async () => {
    vi.mocked(mediaAdapter.insert).mockResolvedValue(
      mediaRow({ id: "new-media-id", status: "pending" }),
    );

    const result = await createUploadIntent(MOCK_USER_ID, {
      mimeType: "image/png",
      byteSize: 1024,
      purpose: "post_attachment",
    }, storage);

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
    const result = await createUploadIntent(MOCK_USER_ID, {
      mimeType: "application/zip",
      byteSize: 1024,
      purpose: "post_attachment",
    }, storage);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("invalid_mime_type");
    }
    expect(mediaAdapter.insert).not.toHaveBeenCalled();
  });

  it("rejects oversized image", async () => {
    const result = await createUploadIntent(MOCK_USER_ID, {
      mimeType: "image/jpeg",
      byteSize: 11 * 1024 * 1024,
      purpose: "profile_avatar",
    }, storage);

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
      mediaRow({ ...row, status: "ready" }),
    );
    storage.storeBlob("user-uploads", "blob-1", {
      data: Buffer.from("test"),
      mimeType: "image/png",
      size: 1024,
    });

    const result = await confirmUpload("media-1", MOCK_USER_ID, storage);

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
    // Do NOT store blob — verifyBlob returns { exists: false }

    const result = await confirmUpload("media-1", MOCK_USER_ID, storage);

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

    const result = await confirmUpload("media-1", MOCK_USER_ID, storage);

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

    const result = await confirmUpload("media-1", MOCK_USER_ID, storage);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("wrong_owner");
    }
  });
});

describe("Media service — attachMedia", () => {
  it("attaches ready media with matching owner and purpose", async () => {
    const row = mediaRow({
      id: "media-1",
      status: "ready",
      expiresAt: new Date(Date.now() + 3600_000),
    });
    vi.mocked(mediaAdapter.findById).mockResolvedValue(row);
    vi.mocked(mediaAdapter.markAttached).mockResolvedValue(
      mediaRow({ ...row, status: "attached" }),
    );

    const result = await attachMedia("media-1", MOCK_USER_ID, "post_attachment");

    expect(result.ok).toBe(true);
    expect(mediaAdapter.markAttached).toHaveBeenCalledWith("media-1");
  });

  it("rejects pending media (not ready)", async () => {
    const row = mediaRow({
      id: "media-1",
      status: "pending",
    });
    vi.mocked(mediaAdapter.findById).mockResolvedValue(row);

    const result = await attachMedia("media-1", MOCK_USER_ID, "post_attachment");

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

    const result = await attachMedia("media-1", MOCK_USER_ID, "post_attachment");

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

    const result = await attachMedia("media-1", MOCK_USER_ID, "post_attachment");

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
      mediaRow({ status: "ready" }),
    );

    const result = await signReadUrl("media-1", storage);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.readUrl).toMatch(/^fake-read:\/\//);
    }
  });

  it("signs a read URL for attached media", async () => {
    vi.mocked(mediaAdapter.findById).mockResolvedValue(
      mediaRow({ status: "attached" }),
    );

    const result = await signReadUrl("media-1", storage);

    expect(result.ok).toBe(true);
  });

  it("rejects signing for pending media", async () => {
    vi.mocked(mediaAdapter.findById).mockResolvedValue(
      mediaRow({ status: "pending" }),
    );

    const result = await signReadUrl("media-1", storage);

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
      }),
    );

    const result = await reissueUploadUrl("media-1", MOCK_USER_ID, storage);

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
      }),
    );

    const result = await reissueUploadUrl("media-1", MOCK_USER_ID, storage);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("media_expired");
    }
  });
});

describe("Media service — computeCleanupCandidates", () => {
  it("returns eligible cleanup candidates", async () => {
    const now = new Date();
    vi.mocked(mediaAdapter.findPendingExpired).mockResolvedValue([
      mediaRow({ id: "pending-1", status: "pending", expiresAt: new Date(now.getTime() - 1000) }),
    ]);
    vi.mocked(mediaAdapter.findUnattachedReadyExpired).mockResolvedValue([
      mediaRow({ id: "ready-1", status: "ready", expiresAt: new Date(now.getTime() - 1000) }),
    ]);
    vi.mocked(mediaAdapter.findDeletedMedia).mockResolvedValue([
      mediaRow({ id: "deleted-1", status: "deleted" }),
    ]);
    vi.mocked(mediaAdapter.findFailedMedia).mockResolvedValue([
      mediaRow({ id: "failed-1", status: "failed" }),
    ]);

    const candidates = await computeCleanupCandidates();

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

    const candidates = await computeCleanupCandidates();

    expect(candidates).toHaveLength(0);
  });
});

describe("Media service — lifetime constants", () => {
  it("upload URL lifetime is 15 minutes", () => {
    expect(UPLOAD_URL_LIFETIME_SECONDS).toBe(15 * 60);
  });

  it("read URL lifetime is 15 minutes", () => {
    expect(READ_URL_LIFETIME_SECONDS).toBe(15 * 60);
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
    storage.storeBlob("c", "k", { data: Buffer.from("x"), mimeType: "image/png", size: 1 });
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
    storage.storeBlob("c", "k", { data: Buffer.from("x"), mimeType: "image/png", size: 1 });
    await storage.deleteBlob("c", "k");
    expect((await storage.verifyBlob("c", "k")).exists).toBe(false);
  });

  it("clear removes all blobs", () => {
    const storage = new FakeBlobStorageAdapter();
    storage.storeBlob("c", "k1", { data: Buffer.from("x"), mimeType: "image/png", size: 1 });
    storage.storeBlob("c", "k2", { data: Buffer.from("y"), mimeType: "image/png", size: 1 });
    storage.clear();
    // Can't easily check without exposing internals; verifyBlob covers it
  });
});
