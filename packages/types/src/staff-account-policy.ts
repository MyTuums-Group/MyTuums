import type { AccountStatus, UserRole } from "./index.js"

export type StaffAssignableRole = Exclude<UserRole, "owner">

export type StaffAccountAction = "suspend" | "unsuspend" | "confirm_underage"

export type StaffAccountTarget = {
  role: UserRole
  accountStatus: AccountStatus
}

export type StaffAccountActions = {
  canSuspend: boolean
  canUnsuspend: boolean
  canConfirmUnderage: boolean
  roleOptions: StaffAssignableRole[]
}

export type StaffAccountActionPolicy = {
  canInspect: boolean
  actions: StaffAccountActions
}

export type StaffAccountActionVisibility = {
  showSuspend: boolean
  showUnsuspend: boolean
  showConfirmUnderage: boolean
  showRoleChange: boolean
  hasAnyAction: boolean
}

const STAFF_ASSIGNABLE_ROLES = [
  "user",
  "moderator",
  "admin",
] as const satisfies readonly StaffAssignableRole[]

export function getStaffAccountActionPolicy(input: {
  actorRole: UserRole
  target: StaffAccountTarget
}): StaffAccountActionPolicy {
  const canActOnTarget =
    input.target.accountStatus !== "account_deleted" &&
    canSuspendStaffRole(input.actorRole, input.target.role)
  const roleOptions =
    input.target.accountStatus === "account_deleted"
      ? []
      : STAFF_ASSIGNABLE_ROLES.filter((newRole) =>
          canChangeStaffRole({
            actorRole: input.actorRole,
            currentTargetRole: input.target.role,
            targetAccountStatus: input.target.accountStatus,
            newRole,
          })
        )

  return {
    canInspect: canInspectStaffRole(input.actorRole, input.target.role),
    actions: {
      canSuspend: canActOnTarget && input.target.accountStatus !== "suspended",
      canUnsuspend:
        canActOnTarget && input.target.accountStatus === "suspended",
      canConfirmUnderage: canActOnTarget,
      roleOptions,
    },
  }
}

export function getStaffAccountActionVisibility(input: {
  accountStatus: AccountStatus
  actions: StaffAccountActions
}): StaffAccountActionVisibility {
  const showSuspend =
    input.actions.canSuspend && input.accountStatus !== "suspended"
  const showUnsuspend =
    input.actions.canUnsuspend && input.accountStatus === "suspended"
  const showConfirmUnderage = input.actions.canConfirmUnderage
  const showRoleChange = input.actions.roleOptions.length > 0

  return {
    showSuspend,
    showUnsuspend,
    showConfirmUnderage,
    showRoleChange,
    hasAnyAction:
      showSuspend || showUnsuspend || showConfirmUnderage || showRoleChange,
  }
}

export function canPerformStaffAccountAction(input: {
  actorRole: UserRole
  target: StaffAccountTarget
  action: StaffAccountAction
}): boolean {
  const actions = getStaffAccountActionPolicy(input).actions

  switch (input.action) {
    case "suspend":
      return actions.canSuspend
    case "unsuspend":
      return actions.canUnsuspend
    case "confirm_underage":
      return actions.canConfirmUnderage
  }
}

export function canInspectStaffRole(
  actorRole: UserRole,
  targetRole: UserRole
): boolean {
  switch (actorRole) {
    case "owner":
      return true
    case "admin":
      return targetRole === "user" || targetRole === "moderator"
    case "moderator":
      return targetRole === "user"
    case "user":
      return false
  }
}

export function canChangeStaffRole(input: {
  actorRole: UserRole
  currentTargetRole: UserRole
  targetAccountStatus: AccountStatus
  newRole: StaffAssignableRole
}): boolean {
  if (
    input.targetAccountStatus === "account_deleted" ||
    input.currentTargetRole === "owner"
  ) {
    return false
  }

  if (input.actorRole === "owner") {
    return input.newRole !== input.currentTargetRole
  }

  if (input.actorRole === "admin") {
    const allowedRoles = new Set<UserRole>(["user", "moderator"])
    return (
      allowedRoles.has(input.currentTargetRole) &&
      allowedRoles.has(input.newRole) &&
      input.newRole !== input.currentTargetRole
    )
  }

  return false
}

export function canSuspendStaffRole(
  actorRole: UserRole,
  targetRole: UserRole
): boolean {
  if (targetRole === "owner") return false

  switch (actorRole) {
    case "owner":
      return (
        targetRole === "user" ||
        targetRole === "moderator" ||
        targetRole === "admin"
      )
    case "admin":
      return targetRole === "user" || targetRole === "moderator"
    case "moderator":
      return targetRole === "user"
    case "user":
      return false
  }
}

export function isStaffRole(role: UserRole): boolean {
  return role === "moderator" || role === "admin" || role === "owner"
}

export function isStaffRoleDemotion(
  oldRole: UserRole,
  newRole: UserRole
): boolean {
  return staffRoleRank(newRole) < staffRoleRank(oldRole)
}

function staffRoleRank(role: UserRole): number {
  switch (role) {
    case "user":
      return 0
    case "moderator":
      return 1
    case "admin":
      return 2
    case "owner":
      return 3
  }
}
