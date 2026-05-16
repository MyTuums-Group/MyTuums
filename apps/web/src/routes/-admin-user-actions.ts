import type { AccountStatus, UserRole } from "@workspace/types"

export type AdminUserActions = {
  canSuspend: boolean
  canUnsuspend: boolean
  canConfirmUnderage: boolean
  roleOptions: Array<Exclude<UserRole, "owner">>
}

export type AdminUserActionVisibility = {
  showSuspend: boolean
  showUnsuspend: boolean
  showConfirmUnderage: boolean
  showRoleChange: boolean
  hasAnyAction: boolean
}

export function getAdminUserActionVisibility(input: {
  accountStatus: AccountStatus
  actions: AdminUserActions
}): AdminUserActionVisibility {
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
