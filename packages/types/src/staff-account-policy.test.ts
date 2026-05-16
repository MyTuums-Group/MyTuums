import { describe, expect, it } from "vitest"
import {
  canChangeStaffRole,
  canInspectStaffRole,
  canPerformStaffAccountAction,
  getStaffAccountActionPolicy,
  getStaffAccountActionVisibility,
  isStaffRole,
  isStaffRoleDemotion,
} from "./staff-account-policy.js"

describe("staff account action policy", () => {
  it("centralizes the staff role hierarchy", () => {
    expect(canInspectStaffRole("owner", "admin")).toBe(true)
    expect(canInspectStaffRole("admin", "moderator")).toBe(true)
    expect(canInspectStaffRole("admin", "admin")).toBe(false)
    expect(canInspectStaffRole("moderator", "user")).toBe(true)
    expect(canInspectStaffRole("moderator", "admin")).toBe(false)

    expect(
      canChangeStaffRole({
        actorRole: "owner",
        currentTargetRole: "user",
        targetAccountStatus: "active",
        newRole: "admin",
      })
    ).toBe(true)
    expect(
      canChangeStaffRole({
        actorRole: "admin",
        currentTargetRole: "user",
        targetAccountStatus: "active",
        newRole: "admin",
      })
    ).toBe(false)
    expect(
      canChangeStaffRole({
        actorRole: "owner",
        currentTargetRole: "user",
        targetAccountStatus: "account_deleted",
        newRole: "admin",
      })
    ).toBe(false)
  })

  it("derives action availability from role and account status", () => {
    expect(
      getStaffAccountActionPolicy({
        actorRole: "admin",
        target: { role: "moderator", accountStatus: "active" },
      }).actions
    ).toEqual({
      canSuspend: true,
      canUnsuspend: false,
      canConfirmUnderage: true,
      roleOptions: ["user"],
    })

    expect(
      getStaffAccountActionPolicy({
        actorRole: "admin",
        target: { role: "moderator", accountStatus: "suspended" },
      }).actions
    ).toMatchObject({
      canSuspend: false,
      canUnsuspend: true,
      canConfirmUnderage: true,
    })

    expect(
      getStaffAccountActionPolicy({
        actorRole: "owner",
        target: { role: "user", accountStatus: "account_deleted" },
      }).actions
    ).toEqual({
      canSuspend: false,
      canUnsuspend: false,
      canConfirmUnderage: false,
      roleOptions: [],
    })
  })

  it("answers command and UI action questions with the same language", () => {
    expect(
      canPerformStaffAccountAction({
        actorRole: "moderator",
        target: { role: "user", accountStatus: "active" },
        action: "suspend",
      })
    ).toBe(true)
    expect(
      canPerformStaffAccountAction({
        actorRole: "moderator",
        target: { role: "user", accountStatus: "active" },
        action: "unsuspend",
      })
    ).toBe(false)

    expect(
      getStaffAccountActionVisibility({
        accountStatus: "suspended",
        actions: {
          canSuspend: false,
          canUnsuspend: true,
          canConfirmUnderage: true,
          roleOptions: [],
        },
      })
    ).toEqual({
      showSuspend: false,
      showUnsuspend: true,
      showConfirmUnderage: true,
      showRoleChange: false,
      hasAnyAction: true,
    })
  })

  it("names staff role traits used by adapters and command side effects", () => {
    expect(isStaffRole("moderator")).toBe(true)
    expect(isStaffRole("user")).toBe(false)
    expect(isStaffRoleDemotion("admin", "moderator")).toBe(true)
    expect(isStaffRoleDemotion("moderator", "admin")).toBe(false)
  })
})
