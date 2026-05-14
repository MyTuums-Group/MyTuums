/**
 * Media service — deep module composing policy validation with adapters.
 *
 * Callers construct one instance via `createMediaService({ adapter, storage })`.
 * Routers use the production singleton from `media-service.production.js`.
 */

import { randomUUID } from "node:crypto";
import type { MediaPurpose, MediaStatus } from "@workspace/types";
import type { Result } from "@workspace/types";
import type { BlobStorageAdapter } from "./blob-storage.adapter.js";
import type { MediaRow, NewMediaRow } from "./media.adapter.js";
import * as policy from "./media.policy.js";

// ── Domain error types ───────────────────────────────────────────────

export type { UploadIntentError } from "./media.policy.js";
export type { ConfirmError } from "./media.policy.js";
export type { ReissueError } from "./media.policy.js";
export type { AttachmentError } from "./media.policy.js";
export type { SignReadError } from "./media.policy.js";

export type { MediaRow } from "./media.adapter.js";

/** Persistence port used by media use cases (production: `media.adapter`). */
export type MediaPersistenceAdapter = {
  findById: (id: string) => Promise<MediaRow | undefined>;
  insert: (values: NewMediaRow) => Promise<MediaRow>;
  markReady: (
    id: string,
    confirmedAt: Date,
    cleanupDeadline: Date,
  ) => Promise<MediaRow | undefined>;
  markAttached: (id: string) => Promise<MediaRow | undefined>;
  markDeleted: (id: string) => Promise<MediaRow | undefined>;
  findPendingExpired: (now: Date) => Promise<MediaRow[]>;
  findUnattachedReadyExpired: (now: Date) => Promise<MediaRow[]>;
  findDeletedMedia: () => Promise<MediaRow[]>;
  findFailedMedia: () => Promise<MediaRow[]>;
};

// ── Config (move to env/config package later) ────────────────────────
const MEDIA_CONTAINER = process.env.MEDIA_CONTAINER_NAME ?? "user-media";

// ── Input / output types ─────────────────────────────────────────────

export interface CreateUploadIntentInput {
  mimeType: string;
  byteSize: number;
  purpose: string;
}

export interface CreateUploadIntentOutput {
  mediaId: string;
  uploadUrl: string;
  blobKey: string;
}

export interface ReissueUploadUrlOutput {
  uploadUrl: string;
}

export interface ConfirmUploadOutput {
  mediaId: string;
}

export interface AttachMediaOutput {
  mediaId: string;
}

export interface SignReadUrlOutput {
  readUrl: string;
}

export interface CleanupCandidate {
  mediaId: string;
  blobKey: string | null;
  storageContainer: string | null;
  status: MediaStatus;
}

export type MediaService = {
  createUploadIntent: (
    userId: string,
    input: CreateUploadIntentInput,
  ) => Promise<Result<CreateUploadIntentOutput, policy.UploadIntentError>>;
  reissueUploadUrl: (
    mediaId: string,
    userId: string,
  ) => Promise<Result<ReissueUploadUrlOutput, policy.ReissueError>>;
  confirmUpload: (
    mediaId: string,
    userId: string,
  ) => Promise<Result<ConfirmUploadOutput, policy.ConfirmError>>;
  attachMedia: (
    mediaId: string,
    userId: string,
    expectedPurpose: MediaPurpose,
  ) => Promise<Result<AttachMediaOutput, policy.AttachmentError>>;
  abandonMedia: (
    mediaId: string,
    userId: string,
  ) => Promise<Result<{ mediaId: string }, policy.AttachmentError>>;
  signReadUrl: (
    mediaId: string,
  ) => Promise<Result<SignReadUrlOutput, policy.SignReadError>>;
  computeCleanupCandidates: () => Promise<CleanupCandidate[]>;
};

export function createMediaService(deps: {
  adapter: MediaPersistenceAdapter;
  storage: BlobStorageAdapter;
}): MediaService {
  const { adapter, storage } = deps;

  return {
    createUploadIntent: (userId, input) =>
      createUploadIntentImpl(adapter, storage, userId, input),
    reissueUploadUrl: (mediaId, userId) =>
      reissueUploadUrlImpl(adapter, storage, mediaId, userId),
    confirmUpload: (mediaId, userId) =>
      confirmUploadImpl(adapter, storage, mediaId, userId),
    attachMedia: (mediaId, userId, expectedPurpose) =>
      attachMediaImpl(adapter, mediaId, userId, expectedPurpose),
    abandonMedia: (mediaId, userId) => abandonMediaImpl(adapter, mediaId, userId),
    signReadUrl: (mediaId) => signReadUrlImpl(adapter, storage, mediaId),
    computeCleanupCandidates: () => computeCleanupCandidatesImpl(adapter),
  };
}

// ── createUploadIntent ───────────────────────────────────────────────

async function createUploadIntentImpl(
  adapter: MediaPersistenceAdapter,
  storage: BlobStorageAdapter,
  userId: string,
  input: CreateUploadIntentInput,
): Promise<Result<CreateUploadIntentOutput, policy.UploadIntentError>> {
  const validated = policy.validateUploadIntent(input);
  if (!validated.ok) return validated;

  const { mimeType, byteSize, purpose } = validated.value;

  const mediaId = randomUUID();
  const blobKey = randomUUID();
  const now = new Date();
  const expiresAt = policy.computePendingExpiry(now);

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

  const uploadUrl = await storage.generateSignedUploadUrl(
    MEDIA_CONTAINER,
    blobKey,
    policy.UPLOAD_URL_LIFETIME_SECONDS,
  );

  return { ok: true, value: { mediaId, uploadUrl, blobKey } };
}

// ── reissueUploadUrl ─────────────────────────────────────────────────

async function reissueUploadUrlImpl(
  adapter: MediaPersistenceAdapter,
  storage: BlobStorageAdapter,
  mediaId: string,
  userId: string,
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

async function confirmUploadImpl(
  adapter: MediaPersistenceAdapter,
  storage: BlobStorageAdapter,
  mediaId: string,
  userId: string,
): Promise<Result<ConfirmUploadOutput, policy.ConfirmError>> {
  const row = await adapter.findById(mediaId);
  if (!row) return { ok: false, error: { kind: "media_not_found" } };

  const attachmentInfo = toAttachmentInfo(row);
  const validated = policy.validatePendingForConfirmation(attachmentInfo, userId);
  if (!validated.ok) return validated;

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

  const now = new Date();
  const cleanupDeadline = policy.computeCleanupDeadline(now);
  await adapter.markReady(mediaId, now, cleanupDeadline);

  return { ok: true, value: { mediaId } };
}

// ── attachMedia ──────────────────────────────────────────────────────

async function attachMediaImpl(
  adapter: MediaPersistenceAdapter,
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

async function abandonMediaImpl(
  adapter: MediaPersistenceAdapter,
  mediaId: string,
  userId: string,
): Promise<Result<{ mediaId: string }, policy.AttachmentError>> {
  const row = await adapter.findById(mediaId);
  if (!row) return { ok: false, error: { kind: "media_not_found" } };
  if (row.ownerId !== userId) return { ok: false, error: { kind: "wrong_owner" } };
  if (row.status === "attached") {
    return { ok: false, error: { kind: "already_attached" } };
  }
  await adapter.markDeleted(mediaId);
  return { ok: true, value: { mediaId } };
}

// ── signReadUrl ──────────────────────────────────────────────────────

async function signReadUrlImpl(
  adapter: MediaPersistenceAdapter,
  storage: BlobStorageAdapter,
  mediaId: string,
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

async function computeCleanupCandidatesImpl(
  adapter: MediaPersistenceAdapter,
): Promise<CleanupCandidate[]> {
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
