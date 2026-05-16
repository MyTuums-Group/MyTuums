/**
 * Canonical v1 report / moderation reason catalogue.
 *
 * Wire values, human-facing labels, triage policy, and validation limits for
 * reporting live here; DB enums, API schemas, services, and UI should adapt
 * from this module rather than re-declaring parallel lists.
 */

export const REPORT_REASON_VALUES = [
  "self_harm",
  "illegal_or_dangerous",
  "privacy",
  "underage_or_safety",
  "harassment",
  "spam",
  "impersonation",
  "other",
] as const

export type ReportReason = (typeof REPORT_REASON_VALUES)[number]

const REPORT_REASON_META = {
  self_harm: { label: "Self-harm", urgent: true },
  illegal_or_dangerous: { label: "Illegal or dangerous", urgent: true },
  privacy: { label: "Privacy", urgent: true },
  underage_or_safety: { label: "Underage or safety", urgent: true },
  harassment: { label: "Harassment", urgent: false },
  spam: { label: "Spam", urgent: false },
  impersonation: { label: "Impersonation", urgent: false },
  other: { label: "Other", urgent: false },
} as const satisfies Record<
  ReportReason,
  { readonly label: string; readonly urgent: boolean }
>

/** Max length for reporter notes on `moderation.submitReport`. */
export const REPORT_NOTES_MAX_LENGTH = 2000

/** Max length for staff internal notes on moderation case commands. */
export const MODERATION_INTERNAL_NOTES_MAX_LENGTH = 4000

/**
 * Public removal reason keys accepted by `moderation.actionCase` (v1 uses the
 * same catalogue as report reasons).
 */
export const PUBLIC_REMOVAL_REASON_VALUES = REPORT_REASON_VALUES

/**
 * Moderation actions exposed by the case workflow API (subset of
 * `ModerationActionType` — excludes account suspension actions).
 */
export const MODERATION_CASE_ACTION_VALUES = [
  "remove_post",
  "restore_post",
  "remove_comment",
  "restore_comment",
  "dismiss_case",
] as const

export type ModerationCaseAction =
  (typeof MODERATION_CASE_ACTION_VALUES)[number]

export const URGENT_REPORT_REASONS: ReadonlySet<ReportReason> = new Set(
  REPORT_REASON_VALUES.filter((reason) => REPORT_REASON_META[reason].urgent),
)

export const REPORT_REASON_OPTIONS: ReadonlyArray<{
  readonly value: ReportReason
  readonly label: string
}> = REPORT_REASON_VALUES.map((value) => ({
  value,
  label: REPORT_REASON_META[value].label,
}))
