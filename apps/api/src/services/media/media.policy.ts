/**
 * Media policy — pure validation functions and business rules.
 *
 * No DB access, no IO, no transport types. The media service composes these
 * with persistence and blob storage adapters; app code uses `MediaService`
 * from `services/media` rather than calling policy helpers directly.
 */

import {
  type MediaPurpose,
  type MediaStatus,
  type Result,
  success,
  IMAGE_MAX_BYTES,
  VIDEO_MAX_BYTES,
} from "@workspace/types";

// ── Lookup tables ────────────────────────────────────────────────────

export const MEDIA_PURPOSES = [
  "post_attachment",
  "profile_avatar",
  "profile_banner",
] as const satisfies readonly MediaPurpose[];

export const MEDIA_STATUSES = [
  "pending",
  "ready",
  "attached",
  "failed",
  "deleted",
] as const satisfies readonly MediaStatus[];

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const ALLOWED_VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/webm",
] as const;

export const ALLOWED_MEDIA_MIME_TYPES = [
  ...ALLOWED_IMAGE_MIME_TYPES,
  ...ALLOWED_VIDEO_MIME_TYPES,
] as const;

export type AllowedMimeType =
  (typeof ALLOWED_MEDIA_MIME_TYPES)[number];

// ── Time windows (seconds) ───────────────────────────────────────────

export const PENDING_EXPIRY_SECONDS = 30 * 60; // 30 min
export const UPLOAD_URL_LIFETIME_SECONDS = 15 * 60; // 15 min
export const READ_URL_LIFETIME_SECONDS = 15 * 60; // 15 min
export const UNATTACHED_CLEANUP_SECONDS = 24 * 60 * 60; // 24 h

// ── Validation errors ────────────────────────────────────────────────

export type UploadIntentError =
  | { kind: "invalid_mime_type"; message: string }
  | { kind: "file_too_large"; message: string }
  | { kind: "invalid_purpose"; message: string };

export type StatusTransitionError =
  | { kind: "invalid_transition"; message: string };

export type AttachmentError =
  | { kind: "media_not_found" }
  | { kind: "wrong_owner" }
  | { kind: "wrong_purpose"; expected: MediaPurpose; actual: MediaPurpose }
  | { kind: "media_not_ready"; status: MediaStatus }
  | { kind: "media_expired" }
  | { kind: "already_attached" };

export type ConfirmError =
  | { kind: "media_not_found" }
  | { kind: "wrong_owner" }
  | { kind: "media_not_pending"; status: MediaStatus }
  | { kind: "media_expired" }
  | { kind: "blob_not_found" }
  | { kind: "blob_size_mismatch"; expected: number; actual: number }
  | { kind: "blob_type_mismatch"; expected: string; actual: string };

export type ReissueError =
  | { kind: "media_not_found" }
  | { kind: "wrong_owner" }
  | { kind: "media_not_pending"; status: MediaStatus }
  | { kind: "media_expired" };

export type SignReadError =
  | { kind: "media_not_found" }
  | { kind: "media_not_accessible"; status: MediaStatus };

// ── Metadata extracted from MIME type ────────────────────────────────

export type MediaKind = "image" | "video";

function isAllowedMime(mimeType: string): boolean {
  return (
    (ALLOWED_MEDIA_MIME_TYPES as readonly string[]).indexOf(mimeType) >= 0
  );
}

function isAllowedPurpose(purpose: string): boolean {
  return (MEDIA_PURPOSES as readonly string[]).indexOf(purpose) >= 0;
}

function isProfileMediaPurpose(purpose: MediaPurpose): boolean {
  return purpose === "profile_avatar" || purpose === "profile_banner";
}

function profileMediaLabel(purpose: MediaPurpose): string {
  return purpose === "profile_avatar" ? "Profile avatar" : "Profile banner";
}

export function mediaKind(mimeType: string): MediaKind | null {
  if ((ALLOWED_IMAGE_MIME_TYPES as readonly string[]).indexOf(mimeType) >= 0) {
    return "image";
  }
  if ((ALLOWED_VIDEO_MIME_TYPES as readonly string[]).indexOf(mimeType) >= 0) {
    return "video";
  }
  return null;
}

/** Max byte size for a given media kind (image or video). */
export function maxBytesForKind(kind: MediaKind): number {
  return kind === "image" ? IMAGE_MAX_BYTES : VIDEO_MAX_BYTES;
}

// ── Upload intent validation ─────────────────────────────────────────

export function validateUploadIntent(input: {
  mimeType: string;
  byteSize: number;
  purpose: string;
}): Result<
  { mimeType: AllowedMimeType; byteSize: number; purpose: MediaPurpose },
  UploadIntentError
> {
  if (!isAllowedMime(input.mimeType)) {
    return {
      ok: false,
      error: {
        kind: "invalid_mime_type",
        message: `MIME type "${input.mimeType}" is not allowed. Allowed: ${ALLOWED_MEDIA_MIME_TYPES.join(", ")}`,
      },
    };
  }
  const mimeType = input.mimeType as AllowedMimeType;

  const kind = mediaKind(input.mimeType)!;

  if (!isAllowedPurpose(input.purpose)) {
    return {
      ok: false,
      error: {
        kind: "invalid_purpose",
        message: `Purpose "${input.purpose}" is not valid. Allowed: ${MEDIA_PURPOSES.join(", ")}`,
      },
    };
  }
  const purpose = input.purpose as MediaPurpose;

  if (isProfileMediaPurpose(purpose) && kind !== "image") {
    return {
      ok: false,
      error: {
        kind: "invalid_mime_type",
        message: `${profileMediaLabel(purpose)} uploads must be images. Allowed: ${ALLOWED_IMAGE_MIME_TYPES.join(", ")}`,
      },
    };
  }

  const max = maxBytesForKind(kind);
  if (input.byteSize <= 0) {
    return {
      ok: false,
      error: {
        kind: "file_too_large",
        message: "File size must be greater than 0 bytes.",
      },
    };
  }
  if (input.byteSize > max) {
    return {
      ok: false,
      error: {
        kind: "file_too_large",
        message: `File size ${input.byteSize} exceeds maximum ${max} bytes for ${kind}s.`,
      },
    };
  }
  const byteSize = input.byteSize;

  return success({ mimeType, byteSize, purpose });
}

// ── Status transitions ───────────────────────────────────────────────

const ALLOWED_TRANSITIONS_MAP: Record<
  MediaStatus,
  readonly MediaStatus[]
> = {
  pending: ["ready", "failed", "deleted"],
  ready: ["attached", "deleted"],
  attached: ["deleted"],
  failed: ["deleted"],
  deleted: [],
};

export function canTransition(
  from: MediaStatus,
  to: MediaStatus,
): boolean {
  const allowed = ALLOWED_TRANSITIONS_MAP[from];
  for (const s of allowed) {
    if (s === to) return true;
  }
  return false;
}

export function validateStatusTransition(
  from: MediaStatus,
  to: MediaStatus,
): Result<{ from: MediaStatus; to: MediaStatus }, StatusTransitionError> {
  if (!canTransition(from, to)) {
    return {
      ok: false,
      error: {
        kind: "invalid_transition",
        message: `Cannot transition media from "${from}" to "${to}".`,
      },
    };
  }
  return success({ from, to });
}

// ── Attachment validation ────────────────────────────────────────────

export interface MediaAttachmentInfo {
  id: string;
  ownerId: string;
  purpose: MediaPurpose;
  status: MediaStatus;
  expiresAt: Date | null;
}

export function validateAttachment(
  media: MediaAttachmentInfo,
  callerUserId: string,
  expectedPurpose: MediaPurpose,
  now: Date = new Date(),
): Result<MediaAttachmentInfo, AttachmentError> {
  if (media.status !== "ready") {
    return {
      ok: false,
      error: {
        kind: "media_not_ready",
        status: media.status,
      },
    };
  }

  if (media.expiresAt !== null && media.expiresAt <= now) {
    return { ok: false, error: { kind: "media_expired" } };
  }

  if (media.ownerId !== callerUserId) {
    return { ok: false, error: { kind: "wrong_owner" } };
  }

  if (media.purpose !== expectedPurpose) {
    return {
      ok: false,
      error: {
        kind: "wrong_purpose",
        expected: expectedPurpose,
        actual: media.purpose,
      },
    };
  }

  return success(media);
}

// ── Expiry helpers ───────────────────────────────────────────────────

export function computePendingExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + PENDING_EXPIRY_SECONDS * 1000);
}

export function computeCleanupDeadline(now: Date = new Date()): Date {
  return new Date(now.getTime() + UNATTACHED_CLEANUP_SECONDS * 1000);
}

export function isPendingExpired(
  expiresAt: Date | null,
  now: Date = new Date(),
): boolean {
  if (expiresAt === null) return false;
  return expiresAt <= now;
}

// ── Pending confirmation validation ──────────────────────────────────

export function validatePendingForConfirmation(
  media: MediaAttachmentInfo,
  callerUserId: string,
  now: Date = new Date(),
): Result<MediaAttachmentInfo, ConfirmError> {
  if (media.ownerId !== callerUserId) {
    return { ok: false, error: { kind: "wrong_owner" } };
  }

  if (media.status !== "pending") {
    return {
      ok: false,
      error: {
        kind: "media_not_pending",
        status: media.status,
      },
    };
  }

  if (isPendingExpired(media.expiresAt, now)) {
    return { ok: false, error: { kind: "media_expired" } };
  }

  return success(media);
}

// ── Reissue validation ───────────────────────────────────────────────

export function validatePendingForReissue(
  media: MediaAttachmentInfo,
  callerUserId: string,
  now: Date = new Date(),
): Result<MediaAttachmentInfo, ReissueError> {
  if (media.ownerId !== callerUserId) {
    return { ok: false, error: { kind: "wrong_owner" } };
  }

  if (media.status !== "pending") {
    return {
      ok: false,
      error: {
        kind: "media_not_pending",
        status: media.status,
      },
    };
  }

  if (isPendingExpired(media.expiresAt, now)) {
    return { ok: false, error: { kind: "media_expired" } };
  }

  return success(media);
}

// ── Read URL signing eligibility ─────────────────────────────────────

export function canSignReadUrl(status: MediaStatus): boolean {
  return status === "ready" || status === "attached";
}

export function validateCanSignReadUrl(
  status: MediaStatus,
): Result<MediaStatus, SignReadError> {
  if (!canSignReadUrl(status)) {
    return {
      ok: false,
      error: {
        kind: "media_not_accessible",
        status,
      },
    };
  }
  return success(status);
}

// ── Cleanup eligibility ──────────────────────────────────────────────

export function isCleanupEligible(
  status: MediaStatus,
  expiresAt: Date | null,
  now: Date = new Date(),
): boolean {
  switch (status) {
    case "pending":
      return expiresAt !== null && expiresAt <= now;
    case "ready":
      return expiresAt !== null && expiresAt <= now;
    case "failed":
    case "deleted":
      return true;
    case "attached":
      return false;
  }
}
