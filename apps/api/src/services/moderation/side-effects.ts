import type { ReportTargetType } from "@workspace/types"

export function shouldCreateContentRemovalNotification(target: {
  targetType: ReportTargetType
  deletedAt: Date | null
  postId?: string | null
}): boolean {
  if (target.deletedAt) return false
  if (target.targetType === "comment" && !target.postId) return false
  return target.targetType === "post" || target.targetType === "comment"
}

export function contentRemovalNotificationData(input: {
  targetType: ReportTargetType
  targetId: string
  publicReason: string
}): Record<string, unknown> {
  return {
    targetType: input.targetType,
    targetId: input.targetId,
    publicReason: input.publicReason,
  }
}
