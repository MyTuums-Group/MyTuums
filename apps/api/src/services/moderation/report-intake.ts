import {
  URGENT_REPORT_REASONS,
  type CasePriority,
  type CaseStatus,
  type ReportReason,
} from "@workspace/types"

export const ACTIVE_REPORT_CASE_STATUSES = [
  "open",
  "reviewing",
] satisfies CaseStatus[]

export function isActiveReportCaseStatus(status: CaseStatus): boolean {
  return ACTIVE_REPORT_CASE_STATUSES.some(
    (activeStatus) => activeStatus === status
  )
}

export function normalizeReportNotes(
  notes: string | null | undefined
): string | null {
  const trimmed = notes?.trim() ?? ""
  return trimmed.length > 0 ? trimmed : null
}

export function initialCasePriorityForReport(
  reason: ReportReason
): CasePriority {
  return URGENT_REPORT_REASONS.has(reason) ? "urgent" : "normal"
}

export function shouldEscalateCasePriority(input: {
  reason: ReportReason
  uniqueReporterCountWithinWindow: number
}): boolean {
  return (
    URGENT_REPORT_REASONS.has(input.reason) ||
    input.uniqueReporterCountWithinWindow >= 3
  )
}

export function reportVolumeWindowStart(asOf: Date): Date {
  return new Date(asOf.getTime() - 24 * 60 * 60 * 1000)
}
