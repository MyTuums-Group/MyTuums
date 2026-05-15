export {
  createInMemoryModerationService,
  type InMemoryModerationState,
  type ModerationActionRecord,
  type ModerationBlockRecord,
  type ModerationCaseCommandError,
  type ModerationCaseDetail,
  type ModerationCaseRecord,
  type ModerationCaseSummary,
  type ModerationCaseTargetDetail,
  type ModerationCommentRecord,
  type ModerationNotificationRecord,
  type ModerationPostRecord,
  type ModerationProfileRecord,
  type ModerationReportRecord,
  type ModerationService,
  type ModerationUserRecord,
  type ReportableTargetInput,
  type SubmitReportError,
  type SubmitReportInput,
} from "./moderation.core.js";
export { moderationService } from "./production.js";

export const REPORT_REASONS = [
  "self_harm",
  "illegal_or_dangerous",
  "privacy",
  "underage_or_safety",
  "harassment",
  "spam",
  "impersonation",
  "other",
] as const;

export const MODERATION_ACTIONS = [
  "remove_post",
  "restore_post",
  "remove_comment",
  "restore_comment",
  "dismiss_case",
] as const;

export const PUBLIC_REMOVAL_REASONS = [
  "self_harm",
  "illegal_or_dangerous",
  "privacy",
  "underage_or_safety",
  "harassment",
  "spam",
  "impersonation",
  "other",
] as const;
