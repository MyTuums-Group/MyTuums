// Cross-package domain types and shared constants.
// This package exports pure value objects and domain constants only:
// no service orchestration, DB clients, or React components.

// ── Value objects ───────────────────────────────────────────────────
export {
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  createUsername,
  type Username,
} from "./username.js"
export {
  POST_TEXT_MAX_LENGTH,
  createPostBody,
  postBodyLength,
  type PostBody,
} from "./post-body.js"
export {
  COMMENT_TEXT_MAX_LENGTH,
  commentBodyLength,
  createCommentBody,
  type CommentBody,
} from "./comment-body.js"
export {
  GAME_SLUG_MAX_LENGTH,
  createGameSlug,
  type GameSlug,
} from "./game-slug.js"
export { RESERVED_USERNAMES, isReservedUsername } from "./reserved-usernames.js"
export { type Result, ValidationError, success, failure } from "./result.js"

export { graphemeLength, normalizeBodyText } from "./grapheme.js"

// ── Authorization ───────────────────────────────────────────────────
export {
  type TargetRef,
  type TargetType,
  type ViewerContext,
  type AuthorizationAdapter,
} from "./authorization.js"

// ── Auth ────────────────────────────────────────────────────────────
export type UserRole = "user" | "moderator" | "admin" | "owner"

export type AccountStatus = "active" | "suspended" | "account_deleted"

// ── Staff account policy ───────────────────────────────────────────
export {
  canChangeStaffRole,
  canInspectStaffRole,
  canPerformStaffAccountAction,
  canSuspendStaffRole,
  getStaffAccountActionPolicy,
  getStaffAccountActionVisibility,
  isStaffRole,
  isStaffRoleDemotion,
} from "./staff-account-policy.js"
export type {
  StaffAccountAction,
  StaffAccountActionPolicy,
  StaffAccountActions,
  StaffAccountActionVisibility,
  StaffAccountTarget,
  StaffAssignableRole,
} from "./staff-account-policy.js"

// ── Media ───────────────────────────────────────────────────────────
export type MediaPurpose =
  | "post_attachment"
  | "profile_avatar"
  | "profile_banner"

export type MediaStatus =
  | "pending"
  | "ready"
  | "attached"
  | "failed"
  | "deleted"

// ── Moderation ──────────────────────────────────────────────────────
export type CaseStatus = "open" | "reviewing" | "dismissed" | "actioned"

export type CasePriority = "normal" | "urgent"

export type { ReportReason } from "./moderation-catalog.js"
export {
  MODERATION_CASE_ACTION_VALUES,
  MODERATION_INTERNAL_NOTES_MAX_LENGTH,
  PUBLIC_REMOVAL_REASON_VALUES,
  REPORT_NOTES_MAX_LENGTH,
  REPORT_REASON_OPTIONS,
  REPORT_REASON_VALUES,
  URGENT_REPORT_REASONS,
} from "./moderation-catalog.js"
export type { ModerationCaseAction } from "./moderation-catalog.js"

export type ReportTargetType = "post" | "comment" | "profile"

export type ModerationActionType =
  | "remove_post"
  | "restore_post"
  | "remove_comment"
  | "restore_comment"
  | "suspend_user"
  | "unsuspend_user"
  | "dismiss_case"

export type SuspensionDuration = "24h" | "7d" | "30d" | "indefinite"

// ── Notifications ───────────────────────────────────────────────────
export type NotificationType =
  | "follow"
  | "post_like"
  | "post_comment"
  | "comment_like"
  | "content_removed"

// ── Contact ─────────────────────────────────────────────────────────
export type ContactCategory =
  | "account_access"
  | "moderation_or_safety"
  | "privacy_or_data"
  | "bug_report"
  | "general_support"
  | "other"

export type ContactEmailStatus = "pending" | "sent" | "failed"

// ── Constants ───────────────────────────────────────────────────────
export const DISPLAY_NAME_MAX_LENGTH = 40
export const BIO_MAX_LENGTH = 160
export const CONTACT_MESSAGE_MAX_LENGTH = 2000
export const CONTACT_EMAIL_MAX_LENGTH = 254

export const MAX_FAVORITE_GAMES = 5
export const MAX_MEDIA_PER_POST = 1
export const SEARCH_MIN_QUERY_LENGTH = 2

export const IMAGE_MAX_BYTES = 10 * 1024 * 1024 // 10 MB
export const VIDEO_MAX_BYTES = 100 * 1024 * 1024 // 100 MB

export const DELETED_EMAIL_HOLD_DAYS = 7
export const DELETED_USERNAME_HOLD_DAYS = 7
