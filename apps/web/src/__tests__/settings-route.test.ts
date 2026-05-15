import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  decideRootNavigation,
  type RootGuardSession,
} from "../routes/-root-guard"

const routeTree = readFileSync("apps/web/src/routeTree.gen.ts", "utf8")

const session = {
  user: {
    id: "user-1",
    email: "player@example.com",
    name: "Player",
    emailVerified: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  },
  session: {
    id: "session-1",
    userId: "user-1",
    expiresAt: new Date("2026-02-01T00:00:00.000Z"),
    token: "token",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  },
} satisfies NonNullable<RootGuardSession>

const onboardedState = { kind: "active_onboarded_profile" } as const

describe("settings route", () => {
  it("registers /settings in the app route tree", () => {
    expect(routeTree).toContain("/settings")
  })

  it("keeps settings available only to authenticated app users", async () => {
    await expect(
      decideRootNavigation({
        pathname: "/settings",
        session: null,
        appUserState: null,
      })
    ).resolves.toEqual({ kind: "redirect", to: "/login" })

    await expect(
      decideRootNavigation({
        pathname: "/settings",
        session,
        appUserState: () => Promise.resolve(onboardedState),
      })
    ).resolves.toEqual({ kind: "allow" })
  })
})
