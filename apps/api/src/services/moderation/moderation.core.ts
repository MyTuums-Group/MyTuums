import {
  type AccountStatus,
  type CasePriority,
  type CaseStatus,
  type ModerationActionType,
  type ReportReason,
  type ReportTargetType,
  type UserRole,
} from "@workspace/types"
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
import {
  initialCasePriorityForReport,
  isActiveReportCaseStatus,
  normalizeReportNotes,
  reportVolumeWindowStart,
  shouldEscalateCasePriority,
} from "./report-intake.js"
import {
  contentRemovalNotificationData,
  shouldCreateContentRemovalNotification,
} from "./side-effects.js"

export type ModerationUserRecord = {
  id: string
  role: UserRole
  accountStatus: AccountStatus
}

export type ModerationProfileRecord = {
  id: string
  userId: string
  username: string
}

export type ModerationPostRecord = {
  id: string
  publicId: string
  authorId: string
  text: string
  commentCount: number
  deletedAt: Date | null
  removedAt: Date | null
  removalPublicReason: string | null
  updatedAt: Date
}

export type ModerationCommentRecord = {
  id: string
  postId: string
  authorId: string
  text: string
  deletedAt: Date | null
  removedAt: Date | null
  removalPublicReason: string | null
  updatedAt: Date
}

export type ModerationBlockRecord = {
  blockerId: string
  blockedId: string
}

export type ModerationCaseRecord = {
  id: string
  targetType: ReportTargetType
  targetId: string
  status: CaseStatus
  priority: CasePriority
  assigneeId: string | null
  createdAt: Date
  resolvedAt: Date | null
}

export type ModerationReportRecord = {
  id: string
  reporterId: string
  targetType: ReportTargetType
  targetId: string
  reason: ReportReason
  notes: string | null
  moderationCaseId: string
  createdAt: Date
}

export type ModerationActionRecord = {
  id: string
  caseId: string
  actorId: string
  action: ModerationActionType
  reason: ReportReason
  publicReason: string | null
  internalNotes: string | null
  conflictOverride: boolean
  createdAt: Date
}

export type ModerationNotificationRecord = {
  recipientId: string
  type: "content_removed"
  actorId: string
  data: Record<string, unknown>
  isRead: boolean
}

export type ModerationCaseSummary = ModerationCaseRecord & {
  reportCount: number
}

export type ModerationCaseTargetDetail = {
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

export type ModerationCaseDetail = ModerationCaseRecord & {
  target: ModerationCaseTargetDetail | null
  reports: ModerationReportRecord[]
  actions: ModerationActionRecord[]
}

export type ReportableTargetInput =
  | { type: "post"; publicId: string }
  | { type: "comment"; commentId: string }
  | { type: "profile"; username: string }

export type SubmitReportInput = {
  reporterId: string
  target: ReportableTargetInput
  reason: ReportReason
  notes?: string | null
}

export type SubmitReportError =
  | { kind: "reporter_not_found" }
  | { kind: "target_not_found" }
  | { kind: "target_not_visible" }
  | { kind: "duplicate_report" }

export type ModerationCaseCommandError =
  | { kind: "forbidden" }
  | { kind: "case_not_found" }
  | { kind: "assignee_not_found" }
  | { kind: "internal_notes_required" }
  | { kind: "public_reason_required" }
  | { kind: "target_not_found" }
  | { kind: "invalid_action_for_target" }
  | { kind: "target_conflict" }

export type ModerationService = {
  submitReport(
    input: SubmitReportInput
  ): Promise<
    | { ok: true; value: ModerationReportRecord }
    | { ok: false; error: SubmitReportError }
  >
  claimCase(input: {
    actorId: string
    caseId: string
  }): Promise<
    | { ok: true; value: ModerationCaseRecord }
    | { ok: false; error: ModerationCaseCommandError }
  >
  assignCase(input: {
    actorId: string
    caseId: string
    assigneeId: string
  }): Promise<
    | { ok: true; value: ModerationCaseRecord }
    | { ok: false; error: ModerationCaseCommandError }
  >
  unassignCase(input: {
    actorId: string
    caseId: string
  }): Promise<
    | { ok: true; value: ModerationCaseRecord }
    | { ok: false; error: ModerationCaseCommandError }
  >
  dismissCase(input: {
    actorId: string
    caseId: string
    reason: ReportReason
    internalNotes: string
  }): Promise<
    | { ok: true; value: ModerationCaseRecord }
    | { ok: false; error: ModerationCaseCommandError }
  >
  actionCase(input: {
    actorId: string
    caseId: string
    action: ModerationActionType
    reason: ReportReason
    publicReason?: string | null
    internalNotes: string
    expectedTargetUpdatedAt?: Date | null
    conflictOverride?: boolean
  }): Promise<
    | { ok: true; value: ModerationCaseRecord }
    | { ok: false; error: ModerationCaseCommandError }
  >
  listCases(input: {
    actorId: string
  }): Promise<
    | { ok: true; value: ModerationCaseSummary[] }
    | { ok: false; error: ModerationCaseCommandError }
  >
  getCase(input: {
    actorId: string
    caseId: string
  }): Promise<
    | { ok: true; value: ModerationCaseDetail }
    | { ok: false; error: ModerationCaseCommandError }
  >
}

export type InMemoryModerationState = {
  users: ModerationUserRecord[]
  profiles: ModerationProfileRecord[]
  posts: ModerationPostRecord[]
  comments: ModerationCommentRecord[]
  blocks: ModerationBlockRecord[]
  reports: ModerationReportRecord[]
  cases: ModerationCaseRecord[]
  actions: ModerationActionRecord[]
  notifications: ModerationNotificationRecord[]
  now?: () => Date
}

type ResolvedTarget = {
  targetType: ReportTargetType
  targetId: string
  ownerId: string
  deletedAt: Date | null
  removedAt: Date | null
}

export function createInMemoryModerationService(
  initialState: InMemoryModerationState
): ModerationService & { snapshot(): InMemoryModerationState } {
  const state = {
    ...initialState,
    users: [...initialState.users],
    profiles: [...initialState.profiles],
    posts: [...initialState.posts],
    comments: [...initialState.comments],
    blocks: [...initialState.blocks],
    reports: [...initialState.reports],
    cases: [...initialState.cases],
    actions: [...initialState.actions],
    notifications: [...initialState.notifications],
  }
  const now = initialState.now ?? (() => new Date())

  let nextReportNumber = state.reports.length + 1
  let nextCaseNumber = state.cases.length + 1
  let nextActionNumber = state.actions.length + 1

  function submitReport(input: SubmitReportInput) {
    const reporter = state.users.find((user) => user.id === input.reporterId)
    if (!reporter) {
      return Promise.resolve({
        ok: false,
        error: { kind: "reporter_not_found" },
      } as const)
    }

    const target = resolveTarget(input.target)
    if (!target) {
      return Promise.resolve({
        ok: false,
        error: { kind: "target_not_found" },
      } as const)
    }

    if (!canReporterSeeTarget(input.reporterId, target)) {
      return Promise.resolve({
        ok: false,
        error: { kind: "target_not_visible" },
      } as const)
    }

    const duplicate = state.reports.find((report) => {
      const moderationCase = state.cases.find(
        (item) => item.id === report.moderationCaseId
      )
      return (
        report.reporterId === input.reporterId &&
        report.targetType === target.targetType &&
        report.targetId === target.targetId &&
        moderationCase !== undefined &&
        isActiveReportCaseStatus(moderationCase.status)
      )
    })

    if (duplicate) {
      return Promise.resolve({
        ok: false,
        error: { kind: "duplicate_report" },
      } as const)
    }

    const createdAt = now()
    let moderationCase = state.cases.find(
      (item) =>
        item.targetType === target.targetType &&
        item.targetId === target.targetId &&
        item.status === "open"
    )

    if (!moderationCase) {
      moderationCase = {
        id: `case-${nextCaseNumber}`,
        targetType: target.targetType,
        targetId: target.targetId,
        status: "open",
        priority: initialCasePriorityForReport(input.reason),
        assigneeId: null,
        createdAt,
        resolvedAt: null,
      }
      nextCaseNumber += 1
      state.cases.push(moderationCase)
    }

    const report: ModerationReportRecord = {
      id: `report-${nextReportNumber}`,
      reporterId: input.reporterId,
      targetType: target.targetType,
      targetId: target.targetId,
      reason: input.reason,
      notes: normalizeReportNotes(input.notes),
      moderationCaseId: moderationCase.id,
      createdAt,
    }
    nextReportNumber += 1
    state.reports.push(report)

    if (
      shouldEscalateCasePriority({
        reason: input.reason,
        uniqueReporterCountWithinWindow: uniqueReporterCountWithinWindow(
          moderationCase.id,
          createdAt
        ),
      })
    ) {
      moderationCase.priority = "urgent"
    }

    return Promise.resolve({ ok: true, value: report } as const)
  }

  function uniqueReporterCountWithinWindow(caseId: string, asOf: Date): number {
    const windowStart = reportVolumeWindowStart(asOf)
    return new Set(
      state.reports
        .filter(
          (report) =>
            report.moderationCaseId === caseId &&
            report.createdAt >= windowStart &&
            report.createdAt <= asOf
        )
        .map((report) => report.reporterId)
    ).size
  }

  function resolveTarget(input: ReportableTargetInput): ResolvedTarget | null {
    switch (input.type) {
      case "post": {
        const post = state.posts.find(
          (item) => item.publicId === input.publicId
        )
        if (!post) return null
        return {
          targetType: "post",
          targetId: post.id,
          ownerId: post.authorId,
          deletedAt: post.deletedAt,
          removedAt: post.removedAt,
        }
      }
      case "comment": {
        const comment = state.comments.find(
          (item) => item.id === input.commentId
        )
        if (!comment) return null
        return {
          targetType: "comment",
          targetId: comment.id,
          ownerId: comment.authorId,
          deletedAt: comment.deletedAt,
          removedAt: comment.removedAt,
        }
      }
      case "profile": {
        const profile = state.profiles.find(
          (item) => item.username === input.username
        )
        if (!profile) return null
        return {
          targetType: "profile",
          targetId: profile.id,
          ownerId: profile.userId,
          deletedAt: null,
          removedAt: null,
        }
      }
    }
  }

  function canReporterSeeTarget(
    reporterId: string,
    target: ResolvedTarget
  ): boolean {
    if (target.deletedAt || target.removedAt) return false
    if (reporterId === target.ownerId) return true
    const owner = state.users.find((user) => user.id === target.ownerId)
    if (!owner || owner.accountStatus !== "active") return false
    return !state.blocks.some(
      (block) =>
        (block.blockerId === reporterId &&
          block.blockedId === target.ownerId) ||
        (block.blockerId === target.ownerId && block.blockedId === reporterId)
    )
  }

  function claimCase(input: { actorId: string; caseId: string }) {
    const actor = state.users.find((user) => user.id === input.actorId)
    if (!actor || !isStaffRole(actor.role)) {
      return Promise.resolve({
        ok: false,
        error: { kind: "forbidden" },
      } as const)
    }

    const moderationCase = state.cases.find((item) => item.id === input.caseId)
    if (!moderationCase) {
      return Promise.resolve({
        ok: false,
        error: { kind: "case_not_found" },
      } as const)
    }

    moderationCase.status = "reviewing"
    moderationCase.assigneeId = input.actorId
    return Promise.resolve({ ok: true, value: moderationCase } as const)
  }

  function assignCase(input: {
    actorId: string
    caseId: string
    assigneeId: string
  }) {
    const actor = state.users.find((user) => user.id === input.actorId)
    const assignee = state.users.find((user) => user.id === input.assigneeId)
    if (!actor || !isStaffRole(actor.role)) {
      return Promise.resolve({
        ok: false,
        error: { kind: "forbidden" },
      } as const)
    }
    if (!assignee || !isStaffRole(assignee.role)) {
      return Promise.resolve({
        ok: false,
        error: { kind: "assignee_not_found" },
      } as const)
    }

    const moderationCase = state.cases.find((item) => item.id === input.caseId)
    if (!moderationCase) {
      return Promise.resolve({
        ok: false,
        error: { kind: "case_not_found" },
      } as const)
    }

    moderationCase.status = "reviewing"
    moderationCase.assigneeId = input.assigneeId
    return Promise.resolve({ ok: true, value: moderationCase } as const)
  }

  function unassignCase(input: { actorId: string; caseId: string }) {
    const actor = state.users.find((user) => user.id === input.actorId)
    if (!actor || !isStaffRole(actor.role)) {
      return Promise.resolve({
        ok: false,
        error: { kind: "forbidden" },
      } as const)
    }

    const moderationCase = state.cases.find((item) => item.id === input.caseId)
    if (!moderationCase) {
      return Promise.resolve({
        ok: false,
        error: { kind: "case_not_found" },
      } as const)
    }

    moderationCase.status = "open"
    moderationCase.assigneeId = null
    return Promise.resolve({ ok: true, value: moderationCase } as const)
  }

  function dismissCase(input: {
    actorId: string
    caseId: string
    reason: ReportReason
    internalNotes: string
  }) {
    const actor = state.users.find((user) => user.id === input.actorId)
    if (!actor || !isStaffRole(actor.role)) {
      return Promise.resolve({
        ok: false,
        error: { kind: "forbidden" },
      } as const)
    }

    const notes = normalizeRequiredInternalNotes(input.internalNotes)
    if (!notes) {
      return Promise.resolve({
        ok: false,
        error: { kind: "internal_notes_required" },
      } as const)
    }

    const moderationCase = state.cases.find((item) => item.id === input.caseId)
    if (!moderationCase) {
      return Promise.resolve({
        ok: false,
        error: { kind: "case_not_found" },
      } as const)
    }

    const actedAt = now()
    moderationCase.status = "dismissed"
    moderationCase.resolvedAt = actedAt
    state.actions.push({
      id: `action-${nextActionNumber}`,
      caseId: moderationCase.id,
      actorId: input.actorId,
      action: "dismiss_case",
      reason: input.reason,
      publicReason: null,
      internalNotes: notes,
      conflictOverride: false,
      createdAt: actedAt,
    })
    nextActionNumber += 1

    return Promise.resolve({ ok: true, value: moderationCase } as const)
  }

  function actionCase(input: {
    actorId: string
    caseId: string
    action: ModerationActionType
    reason: ReportReason
    publicReason?: string | null
    internalNotes: string
    expectedTargetUpdatedAt?: Date | null
    conflictOverride?: boolean
  }) {
    const actor = state.users.find((user) => user.id === input.actorId)
    if (!actor || !isStaffRole(actor.role)) {
      return Promise.resolve({
        ok: false,
        error: { kind: "forbidden" },
      } as const)
    }

    const notes = normalizeRequiredInternalNotes(input.internalNotes)
    if (!notes) {
      return Promise.resolve({
        ok: false,
        error: { kind: "internal_notes_required" },
      } as const)
    }

    const publicReason = normalizePublicRemovalReason(input.publicReason)
    if (!publicReason && isContentRemovalAction(input.action)) {
      return Promise.resolve({
        ok: false,
        error: { kind: "public_reason_required" },
      } as const)
    }

    const moderationCase = state.cases.find((item) => item.id === input.caseId)
    if (!moderationCase) {
      return Promise.resolve({
        ok: false,
        error: { kind: "case_not_found" },
      } as const)
    }

    if (!caseActionMatchesTarget(input.action, moderationCase.targetType)) {
      return Promise.resolve({
        ok: false,
        error: { kind: "invalid_action_for_target" },
      } as const)
    }

    if (input.action === "remove_post") {
      if (moderationCase.targetType !== "post") {
        return Promise.resolve({
          ok: false,
          error: { kind: "invalid_action_for_target" },
        } as const)
      }

      const target = state.posts.find(
        (post) => post.id === moderationCase.targetId
      )
      if (!target) {
        return Promise.resolve({
          ok: false,
          error: { kind: "target_not_found" },
        } as const)
      }

      if (isSameStateCaseActionRetry(input.action, target)) {
        return Promise.resolve({ ok: true, value: moderationCase } as const)
      }

      if (
        hasTargetUpdateConflict({
          expectedUpdatedAt: input.expectedTargetUpdatedAt,
          actualUpdatedAt: target.updatedAt,
          conflictOverride: input.conflictOverride,
        })
      ) {
        return Promise.resolve({
          ok: false,
          error: { kind: "target_conflict" },
        } as const)
      }

      const actedAt = now()
      target.removedAt = actedAt
      target.removalPublicReason = publicReason
      target.updatedAt = actedAt
      moderationCase.status = "actioned"
      moderationCase.resolvedAt = actedAt
      appendAction({
        caseId: moderationCase.id,
        actorId: input.actorId,
        action: input.action,
        reason: input.reason,
        publicReason,
        internalNotes: notes,
        conflictOverride: input.conflictOverride === true,
        createdAt: actedAt,
      })
      if (
        shouldCreateContentRemovalNotification({
          targetType: "post",
          deletedAt: target.deletedAt,
        })
      ) {
        state.notifications.push({
          recipientId: target.authorId,
          type: "content_removed",
          actorId: input.actorId,
          data: contentRemovalNotificationData({
            targetType: "post",
            targetId: target.id,
            publicReason: publicReason ?? "",
          }),
          isRead: false,
        })
      }

      return Promise.resolve({ ok: true, value: moderationCase } as const)
    }

    if (input.action === "restore_post") {
      if (moderationCase.targetType !== "post") {
        return Promise.resolve({
          ok: false,
          error: { kind: "invalid_action_for_target" },
        } as const)
      }

      const target = state.posts.find(
        (post) => post.id === moderationCase.targetId
      )
      if (!target) {
        return Promise.resolve({
          ok: false,
          error: { kind: "target_not_found" },
        } as const)
      }

      if (isSameStateCaseActionRetry(input.action, target)) {
        return Promise.resolve({ ok: true, value: moderationCase } as const)
      }

      if (
        hasTargetUpdateConflict({
          expectedUpdatedAt: input.expectedTargetUpdatedAt,
          actualUpdatedAt: target.updatedAt,
          conflictOverride: input.conflictOverride,
        })
      ) {
        return Promise.resolve({
          ok: false,
          error: { kind: "target_conflict" },
        } as const)
      }

      const actedAt = now()
      target.removedAt = null
      target.removalPublicReason = null
      target.updatedAt = actedAt
      moderationCase.status = "actioned"
      moderationCase.resolvedAt = actedAt
      appendAction({
        caseId: moderationCase.id,
        actorId: input.actorId,
        action: input.action,
        reason: input.reason,
        publicReason: null,
        internalNotes: notes,
        conflictOverride: input.conflictOverride === true,
        createdAt: actedAt,
      })

      return Promise.resolve({ ok: true, value: moderationCase } as const)
    }

    if (input.action === "remove_comment") {
      if (moderationCase.targetType !== "comment") {
        return Promise.resolve({
          ok: false,
          error: { kind: "invalid_action_for_target" },
        } as const)
      }

      const target = state.comments.find(
        (comment) => comment.id === moderationCase.targetId
      )
      if (!target) {
        return Promise.resolve({
          ok: false,
          error: { kind: "target_not_found" },
        } as const)
      }

      if (isSameStateCaseActionRetry(input.action, target)) {
        return Promise.resolve({ ok: true, value: moderationCase } as const)
      }

      if (
        hasTargetUpdateConflict({
          expectedUpdatedAt: input.expectedTargetUpdatedAt,
          actualUpdatedAt: target.updatedAt,
          conflictOverride: input.conflictOverride,
        })
      ) {
        return Promise.resolve({
          ok: false,
          error: { kind: "target_conflict" },
        } as const)
      }

      const actedAt = now()
      target.removedAt = actedAt
      target.removalPublicReason = publicReason
      target.updatedAt = actedAt
      if (!target.deletedAt) {
        const parentPost = state.posts.find((post) => post.id === target.postId)
        if (parentPost) {
          parentPost.commentCount = Math.max(0, parentPost.commentCount - 1)
          parentPost.updatedAt = actedAt
        }
      }
      moderationCase.status = "actioned"
      moderationCase.resolvedAt = actedAt
      appendAction({
        caseId: moderationCase.id,
        actorId: input.actorId,
        action: input.action,
        reason: input.reason,
        publicReason,
        internalNotes: notes,
        conflictOverride: input.conflictOverride === true,
        createdAt: actedAt,
      })
      if (
        shouldCreateContentRemovalNotification({
          targetType: "comment",
          deletedAt: target.deletedAt,
          postId: target.postId,
        })
      ) {
        state.notifications.push({
          recipientId: target.authorId,
          type: "content_removed",
          actorId: input.actorId,
          data: contentRemovalNotificationData({
            targetType: "comment",
            targetId: target.id,
            publicReason: publicReason ?? "",
          }),
          isRead: false,
        })
      }

      return Promise.resolve({ ok: true, value: moderationCase } as const)
    }

    if (input.action === "restore_comment") {
      if (moderationCase.targetType !== "comment") {
        return Promise.resolve({
          ok: false,
          error: { kind: "invalid_action_for_target" },
        } as const)
      }

      const target = state.comments.find(
        (comment) => comment.id === moderationCase.targetId
      )
      if (!target) {
        return Promise.resolve({
          ok: false,
          error: { kind: "target_not_found" },
        } as const)
      }

      if (isSameStateCaseActionRetry(input.action, target)) {
        return Promise.resolve({ ok: true, value: moderationCase } as const)
      }

      if (
        hasTargetUpdateConflict({
          expectedUpdatedAt: input.expectedTargetUpdatedAt,
          actualUpdatedAt: target.updatedAt,
          conflictOverride: input.conflictOverride,
        })
      ) {
        return Promise.resolve({
          ok: false,
          error: { kind: "target_conflict" },
        } as const)
      }

      const actedAt = now()
      target.removedAt = null
      target.removalPublicReason = null
      target.updatedAt = actedAt
      if (!target.deletedAt) {
        const parentPost = state.posts.find((post) => post.id === target.postId)
        if (parentPost) {
          parentPost.commentCount += 1
          parentPost.updatedAt = actedAt
        }
      }
      moderationCase.status = "actioned"
      moderationCase.resolvedAt = actedAt
      appendAction({
        caseId: moderationCase.id,
        actorId: input.actorId,
        action: input.action,
        reason: input.reason,
        publicReason: null,
        internalNotes: notes,
        conflictOverride: input.conflictOverride === true,
        createdAt: actedAt,
      })

      return Promise.resolve({ ok: true, value: moderationCase } as const)
    }

    return Promise.resolve({
      ok: false,
      error: { kind: "invalid_action_for_target" },
    } as const)
  }

  function appendAction(input: Omit<ModerationActionRecord, "id">): void {
    state.actions.push({
      id: `action-${nextActionNumber}`,
      ...input,
    })
    nextActionNumber += 1
  }

  function listCases(input: { actorId: string }) {
    const actor = state.users.find((user) => user.id === input.actorId)
    if (!actor || !isStaffRole(actor.role)) {
      return Promise.resolve({
        ok: false,
        error: { kind: "forbidden" },
      } as const)
    }

    const summaries = state.cases
      .map((moderationCase) => ({
        ...moderationCase,
        reportCount: state.reports.filter(
          (report) => report.moderationCaseId === moderationCase.id
        ).length,
      }))
      .sort(compareCasesForQueue)

    return Promise.resolve({ ok: true, value: summaries } as const)
  }

  function getCase(input: { actorId: string; caseId: string }) {
    const actor = state.users.find((user) => user.id === input.actorId)
    if (!actor || !isStaffRole(actor.role)) {
      return Promise.resolve({
        ok: false,
        error: { kind: "forbidden" },
      } as const)
    }

    const moderationCase = state.cases.find((item) => item.id === input.caseId)
    if (!moderationCase) {
      return Promise.resolve({
        ok: false,
        error: { kind: "case_not_found" },
      } as const)
    }

    return Promise.resolve({
      ok: true,
      value: {
        ...moderationCase,
        target: caseTargetDetail(moderationCase),
        reports: state.reports.filter(
          (report) => report.moderationCaseId === moderationCase.id
        ),
        actions: state.actions.filter(
          (action) => action.caseId === moderationCase.id
        ),
      },
    } as const)
  }

  function caseTargetDetail(
    moderationCase: ModerationCaseRecord
  ): ModerationCaseTargetDetail | null {
    if (moderationCase.targetType === "post") {
      const target = state.posts.find(
        (post) => post.id === moderationCase.targetId
      )
      if (!target) return null
      return toModerationCaseTargetDetail({
        type: "post",
        id: target.id,
        authorId: target.authorId,
        label: target.publicId,
        text: target.text,
        deletedAt: target.deletedAt,
        removedAt: target.removedAt,
        removalPublicReason: target.removalPublicReason,
        updatedAt: target.updatedAt,
      })
    }
    if (moderationCase.targetType === "comment") {
      const target = state.comments.find(
        (comment) => comment.id === moderationCase.targetId
      )
      if (!target) return null
      return toModerationCaseTargetDetail({
        type: "comment",
        id: target.id,
        authorId: target.authorId,
        label: target.id,
        text: target.text,
        deletedAt: target.deletedAt,
        removedAt: target.removedAt,
        removalPublicReason: target.removalPublicReason,
        updatedAt: target.updatedAt,
      })
    }
    const target = state.profiles.find(
      (profile) => profile.id === moderationCase.targetId
    )
    if (!target) return null
    return toModerationCaseTargetDetail({
      type: "profile",
      id: target.id,
      authorId: target.userId,
      label: `@${target.username}`,
      text: null,
      deletedAt: null,
      removedAt: null,
      removalPublicReason: null,
      updatedAt: null,
    })
  }

  return {
    submitReport,
    claimCase,
    assignCase,
    unassignCase,
    dismissCase,
    actionCase,
    listCases,
    getCase,
    snapshot() {
      return {
        ...state,
        users: [...state.users],
        profiles: [...state.profiles],
        posts: [...state.posts],
        comments: [...state.comments],
        blocks: [...state.blocks],
        reports: [...state.reports],
        cases: [...state.cases],
        actions: [...state.actions],
        notifications: [...state.notifications],
      }
    },
  }
}
