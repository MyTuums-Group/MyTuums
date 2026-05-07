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

export const USER_ROLES = [
  "user",
  "moderator",
  "admin",
  "owner",
] as const satisfies readonly UserRole[];

export type AccountStatus = "active" | "suspended" | "account_deleted";

export const ACCOUNT_STATUSES = [
  "active",
  "suspended",
  "account_deleted",
] as const satisfies readonly AccountStatus[];

// ── Media ───────────────────────────────────────────────────────────
export type MediaPurpose = "post_attachment" | "profile_avatar" | "profile_banner";

export const MEDIA_PURPOSES = [
  "post_attachment",
  "profile_avatar",
  "profile_banner",
] as const satisfies readonly MediaPurpose[];

export type MediaStatus = "pending" | "ready" | "attached" | "failed" | "deleted";

export const MEDIA_STATUSES = [
  "pending",
  "ready",
  "attached",
  "failed",
  "deleted",
] as const satisfies readonly MediaStatus[];

// ── Moderation ──────────────────────────────────────────────────────
export type CaseStatus = "open" | "reviewing" | "dismissed" | "actioned";

export const CASE_STATUSES = [
  "open",
  "reviewing",
  "dismissed",
  "actioned",
] as const satisfies readonly CaseStatus[];

export type CasePriority = "normal" | "urgent";

export const CASE_PRIORITIES = [
  "normal",
  "urgent",
] as const satisfies readonly CasePriority[];

export type ReportReason =
  | "self_harm"
  | "illegal_or_dangerous"
  | "privacy"
  | "underage_or_safety"
  | "harassment"
  | "spam"
  | "impersonation"
  | "other";

export const REPORT_REASONS = [
  "self_harm",
  "illegal_or_dangerous",
  "privacy",
  "underage_or_safety",
  "harassment",
  "spam",
  "impersonation",
  "other",
] as const satisfies readonly ReportReason[];

export type ReportTargetType = "post" | "comment" | "profile";

export const REPORT_TARGET_TYPES = [
  "post",
  "comment",
  "profile",
] as const satisfies readonly ReportTargetType[];

export type ModerationActionType =
  | "remove_post"
  | "restore_post"
  | "remove_comment"
  | "restore_comment"
  | "suspend_user"
  | "unsuspend_user"
  | "dismiss_case";

export const MODERATION_ACTION_TYPES = [
  "remove_post",
  "restore_post",
  "remove_comment",
  "restore_comment",
  "suspend_user",
  "unsuspend_user",
  "dismiss_case",
] as const satisfies readonly ModerationActionType[];

export type SuspensionDuration = "24h" | "7d" | "30d" | "indefinite";

// ── Notifications ───────────────────────────────────────────────────
export type NotificationType =
  | "follow"
  | "post_like"
  | "post_comment"
  | "comment_like"
  | "content_removed";

export const NOTIFICATION_TYPES = [
  "follow",
  "post_like",
  "post_comment",
  "comment_like",
  "content_removed",
] as const satisfies readonly NotificationType[];

// ── Contact ─────────────────────────────────────────────────────────
export type ContactCategory =
  | "account_access"
  | "moderation_or_safety"
  | "privacy_or_data"
  | "bug_report"
  | "general_support"
  | "other";

export const CONTACT_CATEGORIES = [
  "account_access",
  "moderation_or_safety",
  "privacy_or_data",
  "bug_report",
  "general_support",
  "other",
] as const satisfies readonly ContactCategory[];

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
