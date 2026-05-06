// Cross-package domain types and shared constants.
// Populated as domain entities are defined. This package exports only
// stable value types — no service logic, DB clients, or React components.

// ── Value objects (with invariant validation) ───────────────────────
export {
  type Username,
  createUsername,
  isUsername,
} from "./username.js";
export { type PostBody, createPostBody, postBodyLength } from "./post-body.js";
export { type CommentBody, createCommentBody } from "./comment-body.js";
export { type GameSlug, createGameSlug } from "./game-slug.js";
export { type Result, ValidationError, success, failure } from "./result.js";
export { graphemeLength } from "./grapheme.js";
export { isReservedUsername } from "./reserved-usernames.js";

// ── Auth ────────────────────────────────────────────────────────────
export type UserRole = "user" | "moderator" | "admin" | "owner";

export type AccountStatus = "active" | "suspended" | "account_deleted";

// ── Media ───────────────────────────────────────────────────────────
export type MediaPurpose = "post_attachment" | "profile_avatar" | "profile_banner";

export type MediaStatus = "pending" | "ready" | "attached" | "failed" | "deleted";

// ── Moderation ──────────────────────────────────────────────────────
export type CaseStatus = "open" | "reviewing" | "dismissed" | "actioned";

export type CasePriority = "normal" | "urgent";

export type ReportReason =
  | "self_harm"
  | "illegal_or_dangerous"
  | "privacy"
  | "underage_or_safety"
  | "harassment"
  | "spam"
  | "impersonation"
  | "other";

export type ReportTargetType = "post" | "comment" | "profile";

export type ModerationActionType =
  | "remove_post"
  | "restore_post"
  | "remove_comment"
  | "restore_comment"
  | "suspend_user"
  | "unsuspend_user"
  | "dismiss_case";

export type SuspensionDuration = "24h" | "7d" | "30d" | "indefinite";

// ── Notifications ───────────────────────────────────────────────────
export type NotificationType =
  | "follow"
  | "post_like"
  | "post_comment"
  | "comment_like"
  | "content_removed";

// ── Contact ─────────────────────────────────────────────────────────
export type ContactCategory =
  | "account_access"
  | "moderation_or_safety"
  | "privacy_or_data"
  | "bug_report"
  | "general_support"
  | "other";

// ── Constants ───────────────────────────────────────────────────────
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;
export const USERNAME_REGEX = /^[a-z][a-z0-9_]*$/;

export const DISPLAY_NAME_MAX_LENGTH = 40;
export const POST_TEXT_MAX_LENGTH = 500;
export const COMMENT_TEXT_MAX_LENGTH = 300;
export const BIO_MAX_LENGTH = 160;
export const CONTACT_MESSAGE_MAX_LENGTH = 2000;
export const CONTACT_EMAIL_MAX_LENGTH = 254;

export const MAX_FAVORITE_GAMES = 5;
export const MAX_MEDIA_PER_POST = 1;

export const IMAGE_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
export const VIDEO_MAX_BYTES = 100 * 1024 * 1024; // 100 MB

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

export const DELETED_EMAIL_HOLD_DAYS = 3;
export const DELETED_USERNAME_HOLD_DAYS = 30;
