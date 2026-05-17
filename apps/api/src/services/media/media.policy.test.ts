import { describe, expect, it } from "vitest";
import type { MediaAttachmentInfo } from "./media.policy.js";
import {
  ALLOWED_MEDIA_MIME_TYPES,
  canTransition,
  computeCleanupDeadline,
  computePendingExpiry,
  isCleanupEligible,
  isPendingExpired,
  maxBytesForKind,
  mediaKind,
  MEDIA_PURPOSES,
  PENDING_EXPIRY_SECONDS,
  READ_URL_LIFETIME_SECONDS,
  UNATTACHED_CLEANUP_SECONDS,
  UPLOAD_URL_LIFETIME_SECONDS,
  validateAttachment,
  validateCanSignReadUrl,
  validatePendingForConfirmation,
  validatePendingForReissue,
  validateStatusTransition,
  validateUploadIntent,
} from "./media.policy.js";

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

  it("rejects video upload intents for profile avatars", () => {
    const result = validateUploadIntent({
      mimeType: "video/mp4",
      byteSize: 1024,
      purpose: "profile_avatar",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("invalid_mime_type");
      expect(result.error.message).toContain(
        "Profile avatar uploads must be images",
      );
    }
  });

  it("rejects video upload intents for profile banners", () => {
    const result = validateUploadIntent({
      mimeType: "video/webm",
      byteSize: 1024,
      purpose: "profile_banner",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("invalid_mime_type");
      expect(result.error.message).toContain(
        "Profile banner uploads must be images",
      );
    }
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

describe("Media policy — lifetime constants", () => {
  it("upload URL lifetime is 15 minutes", () => {
    expect(UPLOAD_URL_LIFETIME_SECONDS).toBe(15 * 60);
  });

  it("read URL lifetime is 15 minutes", () => {
    expect(READ_URL_LIFETIME_SECONDS).toBe(15 * 60);
  });
});
