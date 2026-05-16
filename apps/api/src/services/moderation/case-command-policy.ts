import type {
  ModerationActionType,
  ReportTargetType,
  UserRole,
} from "@workspace/types"

type CaseActionTargetState = {
  removedAt: Date | null
  updatedAt: Date | null
}

export function isStaffRole(role: UserRole): boolean {
  return role === "moderator" || role === "admin" || role === "owner"
}

export function normalizeRequiredInternalNotes(input: string): string | null {
  const trimmed = input.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function normalizePublicRemovalReason(
  input: string | null | undefined
): string | null {
  const trimmed = input?.trim() ?? ""
  return trimmed.length > 0 ? trimmed : null
}

export function isContentRemovalAction(
  action: ModerationActionType
): action is "remove_post" | "remove_comment" {
  return action === "remove_post" || action === "remove_comment"
}

export function caseActionMatchesTarget(
  action: ModerationActionType,
  targetType: ReportTargetType
): boolean {
  if (targetType === "post") {
    return action === "remove_post" || action === "restore_post"
  }
  if (targetType === "comment") {
    return action === "remove_comment" || action === "restore_comment"
  }
  return false
}

export function isSameStateCaseActionRetry(
  action: ModerationActionType,
  target: CaseActionTargetState
): boolean {
  if (action === "remove_post" || action === "remove_comment") {
    return target.removedAt !== null
  }
  if (action === "restore_post" || action === "restore_comment") {
    return target.removedAt === null
  }
  return false
}

export function hasTargetUpdateConflict(input: {
  expectedUpdatedAt: Date | null | undefined
  actualUpdatedAt: Date | null
  conflictOverride?: boolean
}): boolean {
  return (
    input.expectedUpdatedAt !== null &&
    input.expectedUpdatedAt !== undefined &&
    input.actualUpdatedAt !== null &&
    input.actualUpdatedAt.getTime() !== input.expectedUpdatedAt.getTime() &&
    input.conflictOverride !== true
  )
}
