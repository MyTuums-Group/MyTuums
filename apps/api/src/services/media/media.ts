/**
 * Media service — deep module composing policy validation with adapters.
 *
 * Callers (routers, REST endpoints) pass plain data and receive domain
 * results. No HTTP imports, no raw DB queries — those live in the
 * adapter and router layers.
 *
 * Use cases:
 *   createUploadIntent — start a new upload
 *   reissueUploadUrl  — get a fresh upload URL for a pending upload
 *   confirmUpload     — verify blob exists, transition pending→ready
 *   attachMedia       — validate and transition ready→attached
 *   signReadUrl       — generate a signed read URL for accessible media
 *   computeCleanupCandidates — list media IDs eligible for cleanup
 */

import { randomUUID } from "node:crypto";
import type { MediaPurpose, MediaStatus } from "@workspace/types";
import type { Result } from "@workspace/types";
import type { BlobStorageAdapter } from "./blob-storage.adapter.js";
import * as policy from "./media.policy.js";
import * as adapter from "./media.adapter.js";
import type { MediaRow } from "./media.adapter.js";

// ── Domain error types ───────────────────────────────────────────────

export type { UploadIntentError } from "./media.policy.js";
export type { ConfirmError } from "./media.policy.js";
export type { ReissueError } from "./media.policy.js";
export type { AttachmentError } from "./media.policy.js";
export type { SignReadError } from "./media.policy.js";

// Re-export for callers that need to inspect media records
export type { MediaRow } from "./media.adapter.js";

// ── Config (move to env/config package later) ────────────────────────
const MEDIA_CONTAINER = "user-uploads";

// ── createUploadIntent ───────────────────────────────────────────────

export interface CreateUploadIntentInput {
  mimeType: string;
  byteSize: number;
  purpose: string;
}

export interface CreateUploadIntentOutput {
  mediaId: string;
  uploadUrl: string;
}

/**
 * Start a new upload. Creates a pending media record and returns a
 * signed upload URL valid for UPLOAD_URL_LIFETIME_SECONDS.
 *
 * Rate limiting is handled by the router layer (30 req/h per user).
 */
export async function createUploadIntent(
  userId: string,
  input: CreateUploadIntentInput,
  storage: BlobStorageAdapter,
): Promise<Result<CreateUploadIntentOutput, policy.UploadIntentError>> {
  // 1. Validate through pure policy
  const validated = policy.validateUploadIntent(input);
  if (!validated.ok) return validated;

  const { mimeType, byteSize, purpose } = validated.value;

  // 2. Generate IDs and timestamps
  const mediaId = randomUUID();
  const blobKey = randomUUID();
  const now = new Date();
  const expiresAt = policy.computePendingExpiry(now);

  // 3. Insert pending media record
  await adapter.insert({
    id: mediaId,
    ownerId: userId,
    purpose,
    status: "pending" as MediaStatus,
    mimeType,
    byteSize,
    blobKey,
    storageContainer: MEDIA_CONTAINER,
    expiresAt,
    createdAt: now,
    updatedAt: now,
  });

  // 4. Generate signed upload URL
  const uploadUrl = await storage.generateSignedUploadUrl(
    MEDIA_CONTAINER,
    blobKey,
    policy.UPLOAD_URL_LIFETIME_SECONDS,
  );

  return { ok: true, value: { mediaId, uploadUrl } };
}

// ── reissueUploadUrl ─────────────────────────────────────────────────

export interface ReissueUploadUrlOutput {
  uploadUrl: string;
}

/**
 * Reissue a signed upload URL for a pending media record.
 *
 * The media must still be pending and owned by the calling user.
 * The upload expiry (30 min from creation) is not extended; reissuing
 * only provides a fresh URL within the same upload window.
 */
export async function reissueUploadUrl(
  mediaId: string,
  userId: string,
  storage: BlobStorageAdapter,
): Promise<Result<ReissueUploadUrlOutput, policy.ReissueError>> {
  const row = await adapter.findById(mediaId);
  if (!row) return { ok: false, error: { kind: "media_not_found" } };

  const attachmentInfo = toAttachmentInfo(row);
  const validated = policy.validatePendingForReissue(attachmentInfo, userId);
  if (!validated.ok) return validated;

  const uploadUrl = await storage.generateSignedUploadUrl(
    row.storageContainer ?? MEDIA_CONTAINER,
    row.blobKey ?? "",
    policy.UPLOAD_URL_LIFETIME_SECONDS,
  );

  return { ok: true, value: { uploadUrl } };
}

// ── confirmUpload ────────────────────────────────────────────────────

export interface ConfirmUploadOutput {
  mediaId: string;
}

/**
 * Confirm a pending upload after the client has uploaded the blob.
 *
 * Verifies the blob exists in storage with matching size and type,
 * then transitions the media record from pending to ready.
 */
export async function confirmUpload(
  mediaId: string,
  userId: string,
  storage: BlobStorageAdapter,
): Promise<Result<ConfirmUploadOutput, policy.ConfirmError>> {
  const row = await adapter.findById(mediaId);
  if (!row) return { ok: false, error: { kind: "media_not_found" } };

  const attachmentInfo = toAttachmentInfo(row);
  const validated = policy.validatePendingForConfirmation(attachmentInfo, userId);
  if (!validated.ok) return validated;

  // Verify blob exists and matches
  const verification = await storage.verifyBlob(
    row.storageContainer ?? MEDIA_CONTAINER,
    row.blobKey ?? "",
  );

  if (!verification.exists) {
    return { ok: false, error: { kind: "blob_not_found" } };
  }

  if (verification.size !== undefined && verification.size !== row.byteSize) {
    return {
      ok: false,
      error: {
        kind: "blob_size_mismatch",
        expected: row.byteSize,
        actual: verification.size,
      },
    };
  }

  if (
    verification.mimeType !== undefined &&
    verification.mimeType !== row.mimeType
  ) {
    return {
      ok: false,
      error: {
        kind: "blob_type_mismatch",
        expected: row.mimeType,
        actual: verification.mimeType,
      },
    };
  }

  // Transition pending → ready
  const now = new Date();
  const cleanupDeadline = policy.computeCleanupDeadline(now);
  await adapter.markReady(mediaId, now, cleanupDeadline);

  return { ok: true, value: { mediaId } };
}

// ── attachMedia ──────────────────────────────────────────────────────

export interface AttachMediaOutput {
  mediaId: string;
}

/**
 * Validate that a media record can be attached and transition it
 * from ready to attached.
 *
 * The caller is responsible for linking the media to its target
 * (post.mediaAttachmentId, profile.avatarMediaId, etc.) in the same
 * or a coordinating transaction.
 */
export async function attachMedia(
  mediaId: string,
  userId: string,
  expectedPurpose: MediaPurpose,
): Promise<Result<AttachMediaOutput, policy.AttachmentError>> {
  const row = await adapter.findById(mediaId);
  if (!row) return { ok: false, error: { kind: "media_not_found" } };

  const attachmentInfo = toAttachmentInfo(row);
  const validated = policy.validateAttachment(
    attachmentInfo,
    userId,
    expectedPurpose,
  );
  if (!validated.ok) return validated;

  await adapter.markAttached(mediaId);

  return { ok: true, value: { mediaId } };
}

// ── signReadUrl ──────────────────────────────────────────────────────

export interface SignReadUrlOutput {
  readUrl: string;
}

/**
 * Generate a signed read URL for media that is ready or attached.
 *
 * IMPORTANT: The caller MUST check parent content visibility
 * (post not deleted/removed, profile visible, etc.) before calling
 * this function. This method only checks media-level accessibility.
 */
export async function signReadUrl(
  mediaId: string,
  storage: BlobStorageAdapter,
): Promise<Result<SignReadUrlOutput, policy.SignReadError>> {
  const row = await adapter.findById(mediaId);
  if (!row) return { ok: false, error: { kind: "media_not_found" } };

  const validated = policy.validateCanSignReadUrl(row.status);
  if (!validated.ok) return validated;

  const readUrl = await storage.generateSignedReadUrl(
    row.storageContainer ?? MEDIA_CONTAINER,
    row.blobKey ?? "",
    policy.READ_URL_LIFETIME_SECONDS,
  );

  return { ok: true, value: { readUrl } };
}

// ── computeCleanupCandidates ─────────────────────────────────────────

export interface CleanupCandidate {
  mediaId: string;
  blobKey: string | null;
  storageContainer: string | null;
  status: MediaStatus;
}

/**
 * Return media records eligible for blob cleanup.
 *
 * Cleanup rules (CONTEXT.md):
 * - Pending media past 30 min upload window
 * - Ready but unattached media past 24 h
 * - Failed media
 * - Deleted media
 *
 * Attached media is NOT a cleanup candidate during normal operation.
 * The cleanup job should delete blobs first, then remove DB rows.
 */
export async function computeCleanupCandidates(): Promise<CleanupCandidate[]> {
  const now = new Date();

  const [pendingExpired, readyExpired, deleted, failed] = await Promise.all([
    adapter.findPendingExpired(now),
    adapter.findUnattachedReadyExpired(now),
    adapter.findDeletedMedia(),
    adapter.findFailedMedia(),
  ]);

  const candidates: CleanupCandidate[] = [];

  for (const row of [...pendingExpired, ...readyExpired, ...deleted, ...failed]) {
    if (policy.isCleanupEligible(row.status, row.expiresAt, now)) {
      candidates.push({
        mediaId: row.id,
        blobKey: row.blobKey,
        storageContainer: row.storageContainer,
        status: row.status,
      });
    }
  }

  return candidates;
}

// ── Helpers ──────────────────────────────────────────────────────────

function toAttachmentInfo(row: MediaRow): policy.MediaAttachmentInfo {
  return {
    id: row.id,
    ownerId: row.ownerId,
    purpose: row.purpose,
    status: row.status,
    expiresAt: row.expiresAt,
  };
}
