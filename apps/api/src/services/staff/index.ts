import type {
  AccountStatus,
  Result,
  StaffAccountAction,
  StaffAccountActions,
  SuspensionDuration,
  UserRole,
} from "@workspace/types"
import {
  canChangeStaffRole,
  canInspectStaffRole,
  canPerformStaffAccountAction,
  getStaffAccountActionPolicy,
  isStaffRole,
  isStaffRoleDemotion,
} from "@workspace/types"

export type StaffUserRow = {
  id: string
  email: string
  emailVerified: boolean
  role: UserRole
  accountStatus: AccountStatus
  suspendedUntil: Date | null
  suspensionPublicReason: string | null
}

export type StaffRoleChangeAuditRow = {
  actorId: string
  targetUserId: string
  oldRole: UserRole
  newRole: UserRole
  internalNotes: string
  createdAt: Date
}

export type StaffProfileRow = {
  userId: string
  username: string
  displayName: string | null
}

export type StaffUserSearchRow = StaffUserRow & {
  profile: StaffProfileRow | null
}

export type StaffModerationCaseRow = {
  id: string
  assigneeId: string | null
  status: "open" | "reviewing" | "dismissed" | "actioned"
}

export type StaffState = {
  users: StaffUserRow[]
  profiles?: StaffProfileRow[]
  roleChangeAudits: StaffRoleChangeAuditRow[]
  moderationCases: StaffModerationCaseRow[]
  invalidatedSessions: string[]
}

export type StaffRoleChangeMutation = {
  actorId: string
  targetUserId: string
  oldRole: UserRole
  newRole: UserRole
  internalNotes: string
  unassignOpenCases: boolean
}

export type StaffSuspensionMutation = {
  targetUserId: string
  suspendedUntil: Date | null
  publicReason: string
  unassignOpenCases: boolean
}

export type StaffUnsuspensionMutation = {
  targetUserId: string
}

export type OwnerBootstrapMutation = {
  targetUserId: string
  oldRole: UserRole
}

export type StaffUserActions = StaffAccountActions

export type StaffUserDetail = {
  id: string
  emailVerified: boolean
  role: UserRole
  accountStatus: AccountStatus
  suspendedUntil: Date | null
  suspensionPublicReason: string | null
  profile: {
    username: string
    displayName: string | null
  } | null
  actions: StaffUserActions
}

export type StaffUserSearchItem = {
  id: string
  username: string
  displayName: string | null
  role: UserRole
  accountStatus: AccountStatus
}

export type StaffRepository = {
  findUserById(userId: string): Promise<StaffUserRow | null>
  findUserByEmail(email: string): Promise<StaffUserRow | null>
  findProfileByUserId(userId: string): Promise<StaffProfileRow | null>
  searchUserProfiles(input: {
    query: string
    limit: number
  }): Promise<StaffUserSearchRow[]>
  countOwners(): Promise<number>
  applyRoleChange(input: StaffRoleChangeMutation): Promise<void>
  applySuspension(input: StaffSuspensionMutation): Promise<void>
  applyUnsuspension(input: StaffUnsuspensionMutation): Promise<void>
  applyOwnerBootstrap(input: OwnerBootstrapMutation): Promise<void>
}

export type ChangeRoleError =
  | { kind: "actor_not_found" }
  | { kind: "target_not_found" }
  | { kind: "internal_notes_required" }
  | { kind: "role_change_not_allowed" }

export type ChangeRoleOutput = {
  targetUserId: string
  oldRole: UserRole
  newRole: UserRole
}

export type SuspendUserError =
  | { kind: "actor_not_found" }
  | { kind: "target_not_found" }
  | { kind: "internal_notes_required" }
  | { kind: "suspension_not_allowed" }

export type SuspendUserOutput = {
  targetUserId: string
  suspendedUntil: Date | null
  publicReason: string
}

export type UnsuspendUserOutput = {
  targetUserId: string
}

export type OwnerBootstrapError =
  | { kind: "invalid_secret" }
  | { kind: "user_not_found" }
  | { kind: "user_not_verified" }
  | { kind: "owner_already_exists" }

export type StaffReadError =
  | { kind: "actor_not_found" }
  | { kind: "target_not_found" }
  | { kind: "staff_access_not_allowed" }

export type OwnerBootstrapOutput = {
  ownerId: string
  alreadyOwner: boolean
}

export type StaffService = {
  getUser(input: {
    actorId: string
    targetUserId: string
  }): Promise<Result<StaffUserDetail, StaffReadError>>
  searchUsers(input: {
    actorId: string
    query: string
    limit: number
  }): Promise<Result<StaffUserSearchItem[], StaffReadError>>
  changeRole(input: {
    actorId: string
    targetUserId: string
    newRole: UserRole
    internalNotes: string
  }): Promise<Result<ChangeRoleOutput, ChangeRoleError>>
  suspendUser(input: {
    actorId: string
    targetUserId: string
    duration: SuspensionDuration
    internalNotes: string
    publicReason: string
  }): Promise<Result<SuspendUserOutput, SuspendUserError>>
  confirmUnderage(input: {
    actorId: string
    targetUserId: string
    internalNotes: string
  }): Promise<Result<SuspendUserOutput, SuspendUserError>>
  unsuspendUser(input: {
    actorId: string
    targetUserId: string
    internalNotes: string
  }): Promise<Result<UnsuspendUserOutput, SuspendUserError>>
  bootstrapOwner(input: {
    email: string
    secret: string
    expectedSecret: string | undefined
  }): Promise<Result<OwnerBootstrapOutput, OwnerBootstrapError>>
}

export function createStaffService(repository: StaffRepository): StaffService {
  async function getStaffActor(
    actorId: string
  ): Promise<Result<StaffUserRow, StaffReadError>> {
    const actor = await repository.findUserById(actorId)
    if (!actor) return { ok: false, error: { kind: "actor_not_found" } }
    if (!isStaffRole(actor.role)) {
      return { ok: false, error: { kind: "staff_access_not_allowed" } }
    }
    return { ok: true, value: actor }
  }

  async function suspendUser(input: {
    actorId: string
    targetUserId: string
    duration: SuspensionDuration
    internalNotes: string
    publicReason: string
    policyAction: StaffAccountAction
  }): Promise<Result<SuspendUserOutput, SuspendUserError>> {
    const actor = await repository.findUserById(input.actorId)
    if (!actor) return { ok: false, error: { kind: "actor_not_found" } }

    const target = await repository.findUserById(input.targetUserId)
    if (!target) return { ok: false, error: { kind: "target_not_found" } }

    if (!input.internalNotes.trim()) {
      return { ok: false, error: { kind: "internal_notes_required" } }
    }

    if (
      !canPerformStaffAccountAction({
        actorRole: actor.role,
        target,
        action: input.policyAction,
      })
    ) {
      return { ok: false, error: { kind: "suspension_not_allowed" } }
    }

    const suspendedUntil = suspensionExpiresAt(input.duration)
    await repository.applySuspension({
      targetUserId: target.id,
      suspendedUntil,
      publicReason: input.publicReason,
      unassignOpenCases: isStaffRole(target.role),
    })

    return {
      ok: true,
      value: {
        targetUserId: target.id,
        suspendedUntil,
        publicReason: input.publicReason,
      },
    }
  }

  return {
    async getUser(input) {
      const actorResult = await getStaffActor(input.actorId)
      if (!actorResult.ok) return actorResult

      const target = await repository.findUserById(input.targetUserId)
      if (!target) return { ok: false, error: { kind: "target_not_found" } }

      if (!canInspectStaffRole(actorResult.value.role, target.role)) {
        return { ok: false, error: { kind: "staff_access_not_allowed" } }
      }

      const profile = await repository.findProfileByUserId(target.id)
      return {
        ok: true,
        value: toStaffUserDetail(actorResult.value.role, target, profile),
      }
    },

    async searchUsers(input) {
      const actorResult = await getStaffActor(input.actorId)
      if (!actorResult.ok) return actorResult

      const query = input.query.trim()
      if (!query) return { ok: true, value: [] }

      const limit = Math.min(50, Math.max(1, input.limit))
      const rows = await repository.searchUserProfiles({ query, limit })
      return {
        ok: true,
        value: rows
          .filter((row) =>
            canInspectStaffRole(actorResult.value.role, row.role)
          )
          .map(toStaffUserSearchItem),
      }
    },

    async changeRole(input) {
      const actor = await repository.findUserById(input.actorId)
      if (!actor) return { ok: false, error: { kind: "actor_not_found" } }

      const target = await repository.findUserById(input.targetUserId)
      if (!target) return { ok: false, error: { kind: "target_not_found" } }

      const internalNotes = input.internalNotes.trim()
      if (!internalNotes) {
        return { ok: false, error: { kind: "internal_notes_required" } }
      }

      if (
        input.newRole === "owner" ||
        !canChangeStaffRole({
          actorRole: actor.role,
          currentTargetRole: target.role,
          targetAccountStatus: target.accountStatus,
          newRole: input.newRole,
        })
      ) {
        return { ok: false, error: { kind: "role_change_not_allowed" } }
      }

      const oldRole = target.role
      await repository.applyRoleChange({
        actorId: actor.id,
        targetUserId: target.id,
        oldRole,
        newRole: input.newRole,
        internalNotes,
        unassignOpenCases:
          isStaffRoleDemotion(oldRole, input.newRole) && isStaffRole(oldRole),
      })

      return {
        ok: true,
        value: { targetUserId: target.id, oldRole, newRole: input.newRole },
      }
    },

    suspendUser(input) {
      return suspendUser({ ...input, policyAction: "suspend" })
    },

    confirmUnderage(input) {
      return suspendUser({
        ...input,
        duration: "indefinite",
        publicReason: "underage",
        policyAction: "confirm_underage",
      })
    },

    async unsuspendUser(input) {
      const actor = await repository.findUserById(input.actorId)
      if (!actor) return { ok: false, error: { kind: "actor_not_found" } }

      const target = await repository.findUserById(input.targetUserId)
      if (!target) return { ok: false, error: { kind: "target_not_found" } }

      if (!input.internalNotes.trim()) {
        return { ok: false, error: { kind: "internal_notes_required" } }
      }

      if (
        !canPerformStaffAccountAction({
          actorRole: actor.role,
          target,
          action: "unsuspend",
        })
      ) {
        return { ok: false, error: { kind: "suspension_not_allowed" } }
      }

      await repository.applyUnsuspension({ targetUserId: target.id })
      return { ok: true, value: { targetUserId: target.id } }
    },

    async bootstrapOwner(input) {
      if (!input.expectedSecret || input.secret !== input.expectedSecret) {
        return { ok: false, error: { kind: "invalid_secret" } }
      }

      const target = await repository.findUserByEmail(input.email)
      if (!target) return { ok: false, error: { kind: "user_not_found" } }
      if (!target.emailVerified) {
        return { ok: false, error: { kind: "user_not_verified" } }
      }

      const ownerCount = await repository.countOwners()
      if (target.role === "owner" && ownerCount === 1) {
        return { ok: true, value: { ownerId: target.id, alreadyOwner: true } }
      }
      if (ownerCount > 0) {
        return { ok: false, error: { kind: "owner_already_exists" } }
      }

      await repository.applyOwnerBootstrap({
        targetUserId: target.id,
        oldRole: target.role,
      })
      return { ok: true, value: { ownerId: target.id, alreadyOwner: false } }
    },
  }
}

export function createInMemoryStaffService(
  state: StaffState
): StaffService & { snapshot(): StaffState } {
  const repository: StaffRepository = {
    findUserById(userId) {
      return Promise.resolve(
        state.users.find((user) => user.id === userId) ?? null
      )
    },
    findUserByEmail(email) {
      const normalized = email.trim().toLowerCase()
      return Promise.resolve(
        state.users.find((user) => user.email.toLowerCase() === normalized) ??
          null
      )
    },
    findProfileByUserId(userId) {
      return Promise.resolve(
        state.profiles?.find((profile) => profile.userId === userId) ?? null
      )
    },
    searchUserProfiles(input) {
      const normalized = input.query.trim().toLowerCase()
      if (!normalized) return Promise.resolve([])
      const rows = state.users
        .map((user) => ({
          ...user,
          profile:
            state.profiles?.find((profile) => profile.userId === user.id) ??
            null,
        }))
        .filter((row) => {
          const username = row.profile?.username.toLowerCase() ?? ""
          const displayName = row.profile?.displayName?.toLowerCase() ?? ""
          return (
            username.includes(normalized) || displayName.includes(normalized)
          )
        })
        .slice(0, input.limit)
      return Promise.resolve(rows)
    },
    countOwners() {
      return Promise.resolve(
        state.users.filter((user) => user.role === "owner").length
      )
    },
    applyRoleChange(input) {
      const target = state.users.find((user) => user.id === input.targetUserId)
      if (!target)
        throw new Error("Target user disappeared during role change.")

      target.role = input.newRole
      if (input.unassignOpenCases) {
        unassignOpenModerationCases(state, target.id)
      }
      state.roleChangeAudits.push({
        actorId: input.actorId,
        targetUserId: input.targetUserId,
        oldRole: input.oldRole,
        newRole: input.newRole,
        internalNotes: input.internalNotes,
        createdAt: new Date(),
      })
      state.invalidatedSessions.push(input.targetUserId)
      return Promise.resolve()
    },
    applySuspension(input) {
      const target = state.users.find((user) => user.id === input.targetUserId)
      if (!target) throw new Error("Target user disappeared during suspension.")

      target.accountStatus = "suspended"
      target.suspendedUntil = input.suspendedUntil
      target.suspensionPublicReason = input.publicReason
      if (input.unassignOpenCases) {
        unassignOpenModerationCases(state, target.id)
      }
      state.invalidatedSessions.push(input.targetUserId)
      return Promise.resolve()
    },
    applyUnsuspension(input) {
      const target = state.users.find((user) => user.id === input.targetUserId)
      if (!target)
        throw new Error("Target user disappeared during unsuspension.")

      target.accountStatus = "active"
      target.suspendedUntil = null
      target.suspensionPublicReason = null
      state.invalidatedSessions.push(input.targetUserId)
      return Promise.resolve()
    },
    applyOwnerBootstrap(input) {
      const target = state.users.find((user) => user.id === input.targetUserId)
      if (!target)
        throw new Error("Target user disappeared during owner bootstrap.")

      target.role = "owner"
      state.roleChangeAudits.push({
        actorId: input.targetUserId,
        targetUserId: input.targetUserId,
        oldRole: input.oldRole,
        newRole: "owner",
        internalNotes: "Owner bootstrap command.",
        createdAt: new Date(),
      })
      state.invalidatedSessions.push(input.targetUserId)
      return Promise.resolve()
    },
  }

  return {
    ...createStaffService(repository),

    snapshot() {
      return {
        users: state.users.map((user) => ({ ...user })),
        roleChangeAudits: state.roleChangeAudits.map((audit) => ({ ...audit })),
        moderationCases: state.moderationCases.map((moderationCase) => ({
          ...moderationCase,
        })),
        invalidatedSessions: [...state.invalidatedSessions],
      }
    },
  }
}

function toStaffUserDetail(
  actorRole: UserRole,
  target: StaffUserRow,
  profile: StaffProfileRow | null
): StaffUserDetail {
  return {
    id: target.id,
    emailVerified: target.emailVerified,
    role: target.role,
    accountStatus: target.accountStatus,
    suspendedUntil: target.suspendedUntil,
    suspensionPublicReason: target.suspensionPublicReason,
    profile: profile
      ? {
          username: profile.username,
          displayName: profile.displayName,
        }
      : null,
    actions: staffActionsForUser(actorRole, target),
  }
}

function toStaffUserSearchItem(row: StaffUserSearchRow): StaffUserSearchItem {
  return {
    id: row.id,
    username: row.profile?.username ?? row.id,
    displayName: row.profile?.displayName ?? null,
    role: row.role,
    accountStatus: row.accountStatus,
  }
}

function staffActionsForUser(
  actorRole: UserRole,
  target: StaffUserRow
): StaffUserActions {
  return getStaffAccountActionPolicy({ actorRole, target }).actions
}

function unassignOpenModerationCases(
  state: StaffState,
  assigneeId: string
): void {
  for (const moderationCase of state.moderationCases) {
    if (
      moderationCase.assigneeId === assigneeId &&
      (moderationCase.status === "open" ||
        moderationCase.status === "reviewing")
    ) {
      moderationCase.assigneeId = null
    }
  }
}

export function suspensionExpiresAt(
  duration: SuspensionDuration,
  now = new Date()
): Date | null {
  switch (duration) {
    case "24h":
      return addMilliseconds(now, 24 * 60 * 60 * 1000)
    case "7d":
      return addMilliseconds(now, 7 * 24 * 60 * 60 * 1000)
    case "30d":
      return addMilliseconds(now, 30 * 24 * 60 * 60 * 1000)
    case "indefinite":
      return null
  }
}

function addMilliseconds(date: Date, milliseconds: number): Date {
  return new Date(date.getTime() + milliseconds)
}
