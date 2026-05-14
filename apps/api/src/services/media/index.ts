/**
 * Media module — public API for routers and other app layers.
 *
 * Use `createMediaService({ adapter, storage })` in tests or alternate wiring.
 * Production HTTP handlers import `mediaService` from `media-service.production.js`.
 */

// Policy lookup tables and time windows (needed by schema and transport)
export {
  MEDIA_PURPOSES,
  MEDIA_STATUSES,
  ALLOWED_IMAGE_MIME_TYPES,
  ALLOWED_VIDEO_MIME_TYPES,
  ALLOWED_MEDIA_MIME_TYPES,
} from "./media.policy.js";

export {
  PENDING_EXPIRY_SECONDS,
  UPLOAD_URL_LIFETIME_SECONDS,
  READ_URL_LIFETIME_SECONDS,
  UNATTACHED_CLEANUP_SECONDS,
} from "./media.policy.js";

// Error types (discriminated unions returned from service methods)
export type {
  UploadIntentError,
  ConfirmError,
  ReissueError,
  AttachmentError,
  SignReadError,
} from "./media.policy.js";

export type { MediaRow } from "./media.adapter.js";

export {
  createMediaService,
  type MediaService,
  type CreateUploadIntentInput,
  type CreateUploadIntentOutput,
  type ReissueUploadUrlOutput,
  type ConfirmUploadOutput,
  type AttachMediaOutput,
  type SignReadUrlOutput,
  type CleanupCandidate,
} from "./media.js";
