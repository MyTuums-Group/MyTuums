import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { getAdminUserActionVisibility } from "../routes/-admin-user-actions"

const routeTree = readFileSync("apps/web/src/routeTree.gen.ts", "utf8")

describe("admin user detail", () => {
  it("registers /admin/users/$userId in the app route tree", () => {
    expect(routeTree).toContain("/admin/users/$userId")
  })

  it("shows moderator-appropriate account actions without role changes", () => {
    expect(
      getAdminUserActionVisibility({
        accountStatus: "active",
        actions: {
          canSuspend: true,
          canUnsuspend: false,
          canConfirmUnderage: true,
          roleOptions: [],
        },
      })
    ).toEqual({
      showSuspend: true,
      showUnsuspend: false,
      showConfirmUnderage: true,
      showRoleChange: false,
      hasAnyAction: true,
    })
  })

  it("shows admin role-change controls only when the API exposes options", () => {
    expect(
      getAdminUserActionVisibility({
        accountStatus: "active",
        actions: {
          canSuspend: true,
          canUnsuspend: false,
          canConfirmUnderage: true,
          roleOptions: ["moderator"],
        },
      }).showRoleChange
    ).toBe(true)

    expect(
      getAdminUserActionVisibility({
        accountStatus: "active",
        actions: {
          canSuspend: false,
          canUnsuspend: false,
          canConfirmUnderage: false,
          roleOptions: [],
        },
      }).hasAnyAction
    ).toBe(false)
  })

  it("swaps suspend for unsuspend when a target is already suspended", () => {
    expect(
      getAdminUserActionVisibility({
        accountStatus: "suspended",
        actions: {
          canSuspend: false,
          canUnsuspend: true,
          canConfirmUnderage: true,
          roleOptions: [],
        },
      })
    ).toMatchObject({
      showSuspend: false,
      showUnsuspend: true,
      showConfirmUnderage: true,
    })
  })
})
