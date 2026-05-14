/**
 * Media service — public API surface.
 *
 * Routers and REST endpoints import from here.
 * Policy, adapter, and blob-storage adapter are internal implementation details.
 * Post/Profile modules import attachMedia and signReadUrl from here — they
 * do NOT implement raw media lifecycle rules (CONTEXT.md, issue #28).
 */

// Policy lookup tables (needed by schema and other modules)
export {
  MEDIA_PURPOSES,
  MEDIA_STATUSES,
  ALLOWED_IMAGE_MIME_TYPES,
  ALLOWED_VIDEO_MIME_TYPES,
  ALLOWED_MEDIA_MIME_TYPES,
} from "./media.policy.js";

// Policy time constants
export {
  PENDING_EXPIRY_SECONDS,
  UPLOAD_URL_LIFETIME_SECONDS,
  READ_URL_LIFETIME_SECONDS,
  UNATTACHED_CLEANUP_SECONDS,
} from "./media.policy.js";

// Pure policy validation functions (for callers that need fine-grained checks)
export {
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
} from "./media.policy.js";

// Error types
export type {
  UploadIntentError,
  ConfirmError,
  ReissueError,
  AttachmentError,
  SignReadError,
} from "./media.policy.js";

// Blob storage adapter interface + fake (for tests)
export {
  type BlobStorageAdapter,
  type StoredBlob,
  FakeBlobStorageAdapter,
} from "./blob-storage.adapter.js";

// Service use cases
export {
  createUploadIntent,
  reissueUploadUrl,
  confirmUpload,
  attachMedia,
  abandonMedia,
  signReadUrl,
  computeCleanupCandidates,
  type CreateUploadIntentInput,
  type CreateUploadIntentOutput,
  type ReissueUploadUrlOutput,
  type ConfirmUploadOutput,
  type AttachMediaOutput,
  type SignReadUrlOutput,
  type CleanupCandidate,
  type MediaRow,
} from "./media.js";
