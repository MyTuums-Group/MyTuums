import type { MediaPurpose, MediaStatus } from "@workspace/types";

// Media lookup tables are service policy, not shared type-package behavior.
// Keep enum unions in @workspace/types; keep runtime lists at the media seam.
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
