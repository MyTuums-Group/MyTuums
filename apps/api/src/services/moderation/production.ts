import { and, eq, gte, inArray, sql } from "drizzle-orm"
import {
  comment as commentTable,
  db,
  moderationAction,
  moderationCase,
  notification,
  post as postTable,
  profile as profileTable,
  report as reportTable,
} from "@workspace/db"
import {
  type ModerationActionType,
  type ReportReason,
  type ReportTargetType,
  type TargetRef,
} from "@workspace/types"
import { authorization } from "../../authorization/index.js"
import {
  caseActionMatchesTarget,
  hasTargetUpdateConflict,
  isContentRemovalAction,
  isSameStateCaseActionRetry,
  isStaffRole,
  normalizePublicRemovalReason,
  normalizeRequiredInternalNotes,
} from "./case-command-policy.js"
import {
  compareCasesForQueue,
  toModerationCaseTargetDetail,
} from "./case-read-model.js"
import type {
  ModerationActionRecord,
  ModerationCaseCommandError,
  ModerationCaseDetail,
  ModerationCaseRecord,
  ModerationCaseSummary,
  ModerationCaseTargetDetail,
  ModerationReportRecord,
  ModerationService,
  ReportableTargetInput,
  SubmitReportError,
  SubmitReportInput,
} from "./moderation.core.js"
import {
  ACTIVE_REPORT_CASE_STATUSES,
  initialCasePriorityForReport,
  normalizeReportNotes,
  reportVolumeWindowStart,
  shouldEscalateCasePriority,
} from "./report-intake.js"
import {
  contentRemovalNotificationData,
  shouldCreateContentRemovalNotification,
} from "./side-effects.js"
import {
  emitOperationalEvent,
  operationalEventLogger,
} from "../operational-events.js"

type ServiceResult<TValue, TError> =
  | { ok: true; value: TValue }
  | { ok: false; error: TError }

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

type ResolvedTarget = {
  targetType: ReportTargetType
  targetId: string
  ownerId: string
  postId: string | null
  text: string | null
  label: string
  deletedAt: Date | null
  removedAt: Date | null
  removalPublicReason: string | null
  updatedAt: Date | null
  targetRef: TargetRef
}

export const moderationService: ModerationService = {
  submitReport,
  claimCase,
  assignCase,
  unassignCase,
  dismissCase,
  actionCase,
  listCases,
  getCase,
}

async function submitReport(
  input: SubmitReportInput
): Promise<ServiceResult<ModerationReportRecord, SubmitReportError>> {
  const viewer = await authorization.getViewerContext({
    userId: input.reporterId,
  })
  if (!viewer.userId) {
    return { ok: false, error: { kind: "reporter_not_found" } }
  }

  const target = await resolvePublicTarget(input.target)
  if (!target) {
    return { ok: false, error: { kind: "target_not_found" } }
  }

  if (!authorization.canView(viewer, target.targetRef)) {
    return { ok: false, error: { kind: "target_not_visible" } }
  }

  const result: ServiceResult<ModerationReportRecord, SubmitReportError> =
    await db.transaction(async (tx) => {
      const duplicate = await findDuplicateActiveReport(tx, {
        reporterId: input.reporterId,
        targetType: target.targetType,
        targetId: target.targetId,
      })
      if (duplicate) {
        return { ok: false, error: { kind: "duplicate_report" } }
      }

      const now = new Date()
      let caseRow = await findOpenCaseForTarget(tx, target)
      if (!caseRow) {
        const [createdCase] = await tx
          .insert(moderationCase)
          .values({
            targetType: target.targetType,
            targetId: target.targetId,
            status: "open",
            priority: initialCasePriorityForReport(input.reason),
            createdAt: now,
          })
          .returning()
        if (!createdCase) {
          throw new Error("Failed to create moderation case.")
        }
        caseRow = createdCase
      }

      const [createdReport] = await tx
        .insert(reportTable)
        .values({
          reporterId: input.reporterId,
          targetType: target.targetType,
          targetId: target.targetId,
          reason: input.reason,
          notes: normalizeReportNotes(input.notes),
          moderationCaseId: caseRow.id,
          createdAt: now,
        })
        .returning()
      if (!createdReport) {
        throw new Error("Failed to create report.")
      }

      if (
        shouldEscalateCasePriority({
          reason: input.reason,
          uniqueReporterCountWithinWindow: await uniqueReportersInLast24Hours(
            tx,
            caseRow.id,
            now
          ),
        })
      ) {
        const [updatedCase] = await tx
          .update(moderationCase)
          .set({ priority: "urgent" })
          .where(eq(moderationCase.id, caseRow.id))
          .returning()
        if (updatedCase) caseRow = updatedCase
      }

      return { ok: true, value: mapReportRow(createdReport) }
    })

  if (result.ok) {
    await emitOperationalEvent(operationalEventLogger, {
      event: "report_submitted",
      reportId: result.value.id,
      moderationCaseId: result.value.moderationCaseId,
      reporterId: result.value.reporterId,
      targetType: result.value.targetType,
      targetId: result.value.targetId,
      reason: result.value.reason,
      status: "submitted",
    })
  }

  return result
}

async function claimCase(input: {
  actorId: string
  caseId: string
}): Promise<ServiceResult<ModerationCaseRecord, ModerationCaseCommandError>> {
  const staff = await ensureStaff(input.actorId)
  if (!staff.ok) return staff

  const [updated] = await db
    .update(moderationCase)
    .set({
      status: "reviewing",
      assigneeId: input.actorId,
    })
    .where(eq(moderationCase.id, input.caseId))
    .returning()

  if (!updated) return { ok: false, error: { kind: "case_not_found" } }
  return { ok: true, value: mapCaseRow(updated) }
}

async function assignCase(input: {
  actorId: string
  caseId: string
  assigneeId: string
}): Promise<ServiceResult<ModerationCaseRecord, ModerationCaseCommandError>> {
  const staff = await ensureStaff(input.actorId)
  if (!staff.ok) return staff
  const assignee = await ensureStaff(input.assigneeId)
  if (!assignee.ok) return { ok: false, error: { kind: "assignee_not_found" } }

  const [updated] = await db
    .update(moderationCase)
    .set({
      status: "reviewing",
      assigneeId: input.assigneeId,
    })
    .where(eq(moderationCase.id, input.caseId))
    .returning()

  if (!updated) return { ok: false, error: { kind: "case_not_found" } }
  return { ok: true, value: mapCaseRow(updated) }
}

async function unassignCase(input: {
  actorId: string
  caseId: string
}): Promise<ServiceResult<ModerationCaseRecord, ModerationCaseCommandError>> {
  const staff = await ensureStaff(input.actorId)
  if (!staff.ok) return staff

  const [updated] = await db
    .update(moderationCase)
    .set({
      status: "open",
      assigneeId: null,
    })
    .where(eq(moderationCase.id, input.caseId))
    .returning()

  if (!updated) return { ok: false, error: { kind: "case_not_found" } }
  return { ok: true, value: mapCaseRow(updated) }
}

async function dismissCase(input: {
  actorId: string
  caseId: string
  reason: ReportReason
  internalNotes: string
}): Promise<ServiceResult<ModerationCaseRecord, ModerationCaseCommandError>> {
  const staff = await ensureStaff(input.actorId)
  if (!staff.ok) return staff
  const notes = normalizeRequiredInternalNotes(input.internalNotes)
  if (!notes) return { ok: false, error: { kind: "internal_notes_required" } }

  const result: ServiceResult<
    {
      caseRecord: ModerationCaseRecord
      targetType: ReportTargetType
      targetId: string
    },
    ModerationCaseCommandError
  > = await db.transaction(async (tx) => {
    const [caseRow] = await tx
      .select()
      .from(moderationCase)
      .where(eq(moderationCase.id, input.caseId))
      .limit(1)
    if (!caseRow) return { ok: false, error: { kind: "case_not_found" } }

    const now = new Date()
    await insertAction(tx, {
      caseId: input.caseId,
      actorId: input.actorId,
      action: "dismiss_case",
      reason: input.reason,
      publicReason: null,
      internalNotes: notes,
      conflictOverride: false,
      createdAt: now,
    })

    const [updated] = await tx
      .update(moderationCase)
      .set({ status: "dismissed", resolvedAt: now })
      .where(eq(moderationCase.id, input.caseId))
      .returning()
    if (!updated) throw new Error("Failed to dismiss moderation case.")

    return {
      ok: true,
      value: {
        caseRecord: mapCaseRow(updated),
        targetType: caseRow.targetType,
        targetId: caseRow.targetId,
      },
    }
  })

  if (!result.ok) return result

  await emitOperationalEvent(operationalEventLogger, {
    event: "moderation_action_taken",
    caseId: result.value.caseRecord.id,
    actorId: input.actorId,
    targetType: result.value.targetType,
    targetId: result.value.targetId,
    action: "dismiss_case",
    reason: input.reason,
    status: "taken",
  })

  return { ok: true, value: result.value.caseRecord }
}

async function actionCase(input: {
  actorId: string
  caseId: string
  action: ModerationActionType
  reason: ReportReason
  publicReason?: string | null
  internalNotes: string
  expectedTargetUpdatedAt?: Date | null
  conflictOverride?: boolean
}): Promise<ServiceResult<ModerationCaseRecord, ModerationCaseCommandError>> {
  const staff = await ensureStaff(input.actorId)
  if (!staff.ok) return staff
  const notes = normalizeRequiredInternalNotes(input.internalNotes)
  if (!notes) return { ok: false, error: { kind: "internal_notes_required" } }
  const publicReason = normalizePublicRemovalReason(input.publicReason)
  if (isContentRemovalAction(input.action) && !publicReason) {
    return { ok: false, error: { kind: "public_reason_required" } }
  }

  const result: ServiceResult<
    {
      caseRecord: ModerationCaseRecord
      targetType: ReportTargetType
      targetId: string
      didAct: boolean
    },
    ModerationCaseCommandError
  > = await db.transaction(async (tx) => {
    const [caseRow] = await tx
      .select()
      .from(moderationCase)
      .where(eq(moderationCase.id, input.caseId))
      .limit(1)
    if (!caseRow) return { ok: false, error: { kind: "case_not_found" } }

    const target = await resolveCaseTarget(tx, caseRow)
    if (!target) return { ok: false, error: { kind: "target_not_found" } }

    if (!caseActionMatchesTarget(input.action, caseRow.targetType)) {
      return { ok: false, error: { kind: "invalid_action_for_target" } }
    }

    if (isSameStateCaseActionRetry(input.action, target)) {
      return {
        ok: true,
        value: {
          caseRecord: mapCaseRow(caseRow),
          targetType: caseRow.targetType,
          targetId: caseRow.targetId,
          didAct: false,
        },
      }
    }

    if (
      hasTargetUpdateConflict({
        expectedUpdatedAt: input.expectedTargetUpdatedAt,
        actualUpdatedAt: target.updatedAt,
        conflictOverride: input.conflictOverride,
      })
    ) {
      return { ok: false, error: { kind: "target_conflict" } }
    }

    const now = new Date()
    if (input.action === "remove_post") {
      await tx
        .update(postTable)
        .set({
          removedAt: now,
          removalPublicReason: publicReason,
          updatedAt: now,
        })
        .where(eq(postTable.id, target.targetId))
      if (shouldCreateContentRemovalNotification(target)) {
        await insertRemovalNotification(
          tx,
          input.actorId,
          target,
          publicReason ?? ""
        )
      }
    } else if (input.action === "restore_post") {
      await tx
        .update(postTable)
        .set({
          removedAt: null,
          removalPublicReason: null,
          updatedAt: now,
        })
        .where(eq(postTable.id, target.targetId))
    } else if (input.action === "remove_comment") {
      await tx
        .update(commentTable)
        .set({
          removedAt: now,
          removalPublicReason: publicReason,
          updatedAt: now,
        })
        .where(eq(commentTable.id, target.targetId))
      if (!target.deletedAt && target.postId) {
        await tx
          .update(postTable)
          .set({
            commentCount: sql<number>`greatest(${postTable.commentCount} - 1, 0)`,
            updatedAt: now,
          })
          .where(eq(postTable.id, target.postId))
        if (shouldCreateContentRemovalNotification(target)) {
          await insertRemovalNotification(
            tx,
            input.actorId,
            target,
            publicReason ?? ""
          )
        }
      }
    } else if (input.action === "restore_comment") {
      await tx
        .update(commentTable)
        .set({
          removedAt: null,
          removalPublicReason: null,
          updatedAt: now,
        })
        .where(eq(commentTable.id, target.targetId))
      if (!target.deletedAt && target.postId) {
        await tx
          .update(postTable)
          .set({
            commentCount: sql<number>`${postTable.commentCount} + 1`,
            updatedAt: now,
          })
          .where(eq(postTable.id, target.postId))
      }
    }

    await insertAction(tx, {
      caseId: input.caseId,
      actorId: input.actorId,
      action: input.action,
      reason: input.reason,
      publicReason: isContentRemovalAction(input.action) ? publicReason : null,
      internalNotes: notes,
      conflictOverride: input.conflictOverride === true,
      createdAt: now,
    })

    const [updatedCase] = await tx
      .update(moderationCase)
      .set({ status: "actioned", resolvedAt: now })
      .where(eq(moderationCase.id, input.caseId))
      .returning()
    if (!updatedCase) throw new Error("Failed to update moderation case.")

    return {
      ok: true,
      value: {
        caseRecord: mapCaseRow(updatedCase),
        targetType: caseRow.targetType,
        targetId: caseRow.targetId,
        didAct: true,
      },
    }
  })

  if (!result.ok) return result

  if (result.value.didAct) {
    await emitOperationalEvent(operationalEventLogger, {
      event: "moderation_action_taken",
      caseId: result.value.caseRecord.id,
      actorId: input.actorId,
      targetType: result.value.targetType,
      targetId: result.value.targetId,
      action: input.action,
      reason: input.reason,
      status: "taken",
    })
  }

  return { ok: true, value: result.value.caseRecord }
}

async function listCases(input: {
  actorId: string
}): Promise<
  ServiceResult<ModerationCaseSummary[], ModerationCaseCommandError>
> {
  const staff = await ensureStaff(input.actorId)
  if (!staff.ok) return staff

  const [caseRows, reportRows] = await Promise.all([
    db.select().from(moderationCase),
    db
      .select({ moderationCaseId: reportTable.moderationCaseId })
      .from(reportTable),
  ])

  const reportCounts = new Map<string, number>()
  for (const row of reportRows) {
    if (!row.moderationCaseId) continue
    reportCounts.set(
      row.moderationCaseId,
      (reportCounts.get(row.moderationCaseId) ?? 0) + 1
    )
  }

  const summaries = caseRows
    .map((row) => ({
      ...mapCaseRow(row),
      reportCount: reportCounts.get(row.id) ?? 0,
    }))
    .sort(compareCasesForQueue)

  return { ok: true, value: summaries }
}

async function getCase(input: {
  actorId: string
  caseId: string
}): Promise<ServiceResult<ModerationCaseDetail, ModerationCaseCommandError>> {
  const staff = await ensureStaff(input.actorId)
  if (!staff.ok) return staff

  const [caseRow] = await db
    .select()
    .from(moderationCase)
    .where(eq(moderationCase.id, input.caseId))
    .limit(1)
  if (!caseRow) return { ok: false, error: { kind: "case_not_found" } }

  const [reportRows, actionRows, target] = await Promise.all([
    db
      .select()
      .from(reportTable)
      .where(eq(reportTable.moderationCaseId, input.caseId)),
    db
      .select()
      .from(moderationAction)
      .where(eq(moderationAction.caseId, input.caseId)),
    resolveCaseTarget(db, caseRow),
  ])

  return {
    ok: true,
    value: {
      ...mapCaseRow(caseRow),
      target: target ? toCaseTargetDetail(target) : null,
      reports: reportRows.map(mapReportRow),
      actions: actionRows.map(mapActionRow),
    },
  }
}

async function resolvePublicTarget(
  input: ReportableTargetInput
): Promise<ResolvedTarget | null> {
  if (input.type === "post") {
    const [row] = await db
      .select({
        id: postTable.id,
        publicId: postTable.publicId,
        authorId: postTable.authorId,
        text: postTable.text,
        deletedAt: postTable.deletedAt,
        removedAt: postTable.removedAt,
        removalPublicReason: postTable.removalPublicReason,
        updatedAt: postTable.updatedAt,
      })
      .from(postTable)
      .where(eq(postTable.publicId, input.publicId))
      .limit(1)
    if (!row) return null
    return {
      targetType: "post",
      targetId: row.id,
      ownerId: row.authorId,
      postId: null,
      text: row.text,
      label: row.publicId,
      deletedAt: row.deletedAt,
      removedAt: row.removedAt,
      removalPublicReason: row.removalPublicReason,
      updatedAt: row.updatedAt,
      targetRef: {
        type: "post",
        postId: row.id,
        authorId: row.authorId,
        deletedAt: row.deletedAt,
        removedAt: row.removedAt,
      },
    }
  }

  if (input.type === "comment") {
    const [row] = await db
      .select({
        id: commentTable.id,
        postId: commentTable.postId,
        authorId: commentTable.authorId,
        text: commentTable.text,
        deletedAt: commentTable.deletedAt,
        removedAt: commentTable.removedAt,
        removalPublicReason: commentTable.removalPublicReason,
        updatedAt: commentTable.updatedAt,
      })
      .from(commentTable)
      .where(eq(commentTable.id, input.commentId))
      .limit(1)
    if (!row) return null
    return {
      targetType: "comment",
      targetId: row.id,
      ownerId: row.authorId,
      postId: row.postId,
      text: row.text,
      label: row.id,
      deletedAt: row.deletedAt,
      removedAt: row.removedAt,
      removalPublicReason: row.removalPublicReason,
      updatedAt: row.updatedAt,
      targetRef: {
        type: "comment",
        commentId: row.id,
        postId: row.postId,
        authorId: row.authorId,
        deletedAt: row.deletedAt,
        removedAt: row.removedAt,
      },
    }
  }

  const [row] = await db
    .select({
      id: profileTable.id,
      userId: profileTable.userId,
      username: profileTable.username,
    })
    .from(profileTable)
    .where(eq(profileTable.username, input.username))
    .limit(1)
  if (!row) return null
  return {
    targetType: "profile",
    targetId: row.id,
    ownerId: row.userId,
    postId: null,
    text: null,
    label: `@${row.username}`,
    deletedAt: null,
    removedAt: null,
    removalPublicReason: null,
    updatedAt: null,
    targetRef: { type: "profile", userId: row.userId },
  }
}

async function resolveCaseTarget(
  query: Pick<Tx, "select"> | typeof db,
  caseRow: typeof moderationCase.$inferSelect
): Promise<ResolvedTarget | null> {
  if (caseRow.targetType === "post") {
    const [row] = await query
      .select({
        id: postTable.id,
        publicId: postTable.publicId,
        authorId: postTable.authorId,
        text: postTable.text,
        deletedAt: postTable.deletedAt,
        removedAt: postTable.removedAt,
        removalPublicReason: postTable.removalPublicReason,
        updatedAt: postTable.updatedAt,
      })
      .from(postTable)
      .where(eq(postTable.id, caseRow.targetId))
      .limit(1)
    if (!row) return null
    return {
      targetType: "post",
      targetId: row.id,
      ownerId: row.authorId,
      postId: null,
      text: row.text,
      label: row.publicId,
      deletedAt: row.deletedAt,
      removedAt: row.removedAt,
      removalPublicReason: row.removalPublicReason,
      updatedAt: row.updatedAt,
      targetRef: {
        type: "post",
        postId: row.id,
        authorId: row.authorId,
        deletedAt: row.deletedAt,
        removedAt: row.removedAt,
      },
    }
  }
  if (caseRow.targetType === "comment") {
    const [row] = await query
      .select({
        id: commentTable.id,
        postId: commentTable.postId,
        authorId: commentTable.authorId,
        text: commentTable.text,
        deletedAt: commentTable.deletedAt,
        removedAt: commentTable.removedAt,
        removalPublicReason: commentTable.removalPublicReason,
        updatedAt: commentTable.updatedAt,
      })
      .from(commentTable)
      .where(eq(commentTable.id, caseRow.targetId))
      .limit(1)
    if (!row) return null
    return {
      targetType: "comment",
      targetId: row.id,
      ownerId: row.authorId,
      postId: row.postId,
      text: row.text,
      label: row.id,
      deletedAt: row.deletedAt,
      removedAt: row.removedAt,
      removalPublicReason: row.removalPublicReason,
      updatedAt: row.updatedAt,
      targetRef: {
        type: "comment",
        commentId: row.id,
        postId: row.postId,
        authorId: row.authorId,
        deletedAt: row.deletedAt,
        removedAt: row.removedAt,
      },
    }
  }

  const [row] = await query
    .select({
      id: profileTable.id,
      userId: profileTable.userId,
      username: profileTable.username,
    })
    .from(profileTable)
    .where(eq(profileTable.id, caseRow.targetId))
    .limit(1)
  if (!row) return null
  return {
    targetType: "profile",
    targetId: row.id,
    ownerId: row.userId,
    postId: null,
    text: null,
    label: `@${row.username}`,
    deletedAt: null,
    removedAt: null,
    removalPublicReason: null,
    updatedAt: null,
    targetRef: { type: "profile", userId: row.userId },
  }
}

async function findDuplicateActiveReport(
  tx: Tx,
  input: { reporterId: string; targetType: ReportTargetType; targetId: string }
) {
  const [row] = await tx
    .select({ id: reportTable.id })
    .from(reportTable)
    .innerJoin(
      moderationCase,
      eq(reportTable.moderationCaseId, moderationCase.id)
    )
    .where(
      and(
        eq(reportTable.reporterId, input.reporterId),
        eq(reportTable.targetType, input.targetType),
        eq(reportTable.targetId, input.targetId),
        inArray(moderationCase.status, ACTIVE_REPORT_CASE_STATUSES)
      )
    )
    .limit(1)
  return row ?? null
}

async function findOpenCaseForTarget(tx: Tx, target: ResolvedTarget) {
  const [row] = await tx
    .select()
    .from(moderationCase)
    .where(
      and(
        eq(moderationCase.targetType, target.targetType),
        eq(moderationCase.targetId, target.targetId),
        eq(moderationCase.status, "open")
      )
    )
    .limit(1)
  return row ?? null
}

async function uniqueReportersInLast24Hours(
  tx: Tx,
  caseId: string,
  asOf: Date
): Promise<number> {
  const windowStart = reportVolumeWindowStart(asOf)
  const rows = await tx
    .select({ reporterId: reportTable.reporterId })
    .from(reportTable)
    .where(
      and(
        eq(reportTable.moderationCaseId, caseId),
        gte(reportTable.createdAt, windowStart)
      )
    )
  return new Set(rows.map((row) => row.reporterId)).size
}

async function ensureStaff(
  actorId: string
): Promise<ServiceResult<true, ModerationCaseCommandError>> {
  const viewer = await authorization.getViewerContext({ userId: actorId })
  if (!viewer.isAuthenticated || !viewer.role || !isStaffRole(viewer.role)) {
    return { ok: false, error: { kind: "forbidden" } }
  }
  return { ok: true, value: true }
}

async function insertAction(tx: Tx, input: Omit<ModerationActionRecord, "id">) {
  await tx.insert(moderationAction).values({
    caseId: input.caseId,
    actorId: input.actorId,
    action: input.action,
    reason: input.reason,
    publicReason: input.publicReason,
    internalNotes: input.internalNotes,
    conflictOverride: input.conflictOverride,
    createdAt: input.createdAt,
  })
}

async function insertRemovalNotification(
  tx: Tx,
  actorId: string,
  target: ResolvedTarget,
  publicReason: string
) {
  await tx.insert(notification).values({
    recipientId: target.ownerId,
    type: "content_removed",
    actorId,
    data: contentRemovalNotificationData({
      targetType: target.targetType,
      targetId: target.targetId,
      publicReason,
    }),
  })
}

function mapCaseRow(
  row: typeof moderationCase.$inferSelect
): ModerationCaseRecord {
  return {
    id: row.id,
    targetType: row.targetType,
    targetId: row.targetId,
    status: row.status,
    priority: row.priority,
    assigneeId: row.assigneeId,
    createdAt: row.createdAt,
    resolvedAt: row.resolvedAt,
  }
}

function mapReportRow(
  row: typeof reportTable.$inferSelect
): ModerationReportRecord {
  if (!row.moderationCaseId) {
    throw new Error("Report is missing moderationCaseId.")
  }
  return {
    id: row.id,
    reporterId: row.reporterId,
    targetType: row.targetType,
    targetId: row.targetId,
    reason: row.reason,
    notes: row.notes,
    moderationCaseId: row.moderationCaseId,
    createdAt: row.createdAt,
  }
}

function mapActionRow(
  row: typeof moderationAction.$inferSelect
): ModerationActionRecord {
  return {
    id: row.id,
    caseId: row.caseId,
    actorId: row.actorId,
    action: row.action,
    reason: row.reason,
    publicReason: row.publicReason,
    internalNotes: row.internalNotes,
    conflictOverride: row.conflictOverride,
    createdAt: row.createdAt,
  }
}

function toCaseTargetDetail(
  target: ResolvedTarget
): ModerationCaseTargetDetail {
  return toModerationCaseTargetDetail({
    type: target.targetType,
    id: target.targetId,
    authorId: target.ownerId,
    label: target.label,
    text: target.text,
    deletedAt: target.deletedAt,
    removedAt: target.removedAt,
    removalPublicReason: target.removalPublicReason,
    updatedAt: target.updatedAt,
  })
}
