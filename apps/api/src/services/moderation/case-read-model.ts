import type { ReportTargetType } from "@workspace/types"
import type {
  ModerationCaseSummary,
  ModerationCaseTargetDetail,
} from "./moderation.core.js"

export type ModerationCaseTargetReadModel = {
  type: ReportTargetType
  id: string
  authorId: string
  label: string
  text: string | null
  deletedAt: Date | null
  removedAt: Date | null
  removalPublicReason: string | null
  updatedAt: Date | null
}

export function compareCasesForQueue(
  left: ModerationCaseSummary,
  right: ModerationCaseSummary
): number {
  if (left.priority !== right.priority) {
    return left.priority === "urgent" ? -1 : 1
  }
  return left.createdAt.getTime() - right.createdAt.getTime()
}

export function toModerationCaseTargetDetail(
  target: ModerationCaseTargetReadModel
): ModerationCaseTargetDetail {
  return {
    type: target.type,
    id: target.id,
    authorId: target.authorId,
    label: target.label,
    text: target.text,
    deletedAt: target.deletedAt,
    removedAt: target.removedAt,
    removalPublicReason: target.removalPublicReason,
    updatedAt: target.updatedAt,
  }
}
