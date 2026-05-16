import { describe, expect, it } from "vitest"
import { resolveDocsAccess } from "../lib/docs-access"

const docsReturnUrl = "https://docs.mytuums.com/docs/platform/overview?tab=setup"
const webAppBaseUrl = "https://mytuums.com"
const readerBootstrap = {
  sections: [
    {
      id: "platform",
      title: "Platform",
      pages: [
        {
          slug: "overview",
          title: "Overview",
          sourcePath: "CONTEXT.md",
          kind: "context" as const,
          diagramIds: [] as string[],
        },
      ],
    },
  ],
  homeEntry: {
    sectionId: "platform",
    pageSlug: "overview",
    pageTitle: "Overview",
  },
  contentBuild: {
    environment: "test",
    generatedAt: "2026-01-01T00:00:00.000Z",
    commitSha: "abc1234",
  },
}

class TransportError extends Error {
  readonly data: { code: string }

  constructor(code: string) {
    super(code)
    this.name = "TransportError"
    this.data = { code }
  }
}

describe("resolveDocsAccess", () => {
  it("redirects logged-out users to the main login flow with a return URL", async () => {
    await expect(
      resolveDocsAccess({
        loadAppUserState: () => Promise.resolve({ kind: "unauthenticated" }),
        loadReaderBootstrap: () => Promise.reject(new Error("reader bootstrap should not load")),
        returnUrl: docsReturnUrl,
        webAppBaseUrl,
      })
    ).resolves.toEqual({
      kind: "redirect",
      target: "login",
      href: "https://mytuums.com/login?returnTo=https%3A%2F%2Fdocs.mytuums.com%2Fdocs%2Fplatform%2Foverview%3Ftab%3Dsetup",
    })
  })

  it("redirects unverified users to the main verification flow with a return URL", async () => {
    await expect(
      resolveDocsAccess({
        loadAppUserState: () =>
          Promise.resolve({
            kind: "authenticated_unverified",
            user: { id: "user-1" },
          }),
        loadReaderBootstrap: () => Promise.reject(new Error("reader bootstrap should not load")),
        returnUrl: docsReturnUrl,
        webAppBaseUrl,
      })
    ).resolves.toEqual({
      kind: "redirect",
      target: "verify-email",
      href: "https://mytuums.com/verify-email?returnTo=https%3A%2F%2Fdocs.mytuums.com%2Fdocs%2Fplatform%2Foverview%3Ftab%3Dsetup",
    })
  })

  it.each(["suspended", "account_deleted"] as const)(
    "denies %s users before docs navigation loads",
    async (accountStatus) => {
      let bootstrapLoaded = false

      await expect(
        resolveDocsAccess({
          loadAppUserState: () =>
            Promise.resolve({
              kind: "limited_account",
              user: { id: "user-1" },
              accountStatus,
            }),
          loadReaderBootstrap: () => {
            bootstrapLoaded = true
            return Promise.resolve(readerBootstrap)
          },
          returnUrl: docsReturnUrl,
          webAppBaseUrl,
        })
      ).resolves.toEqual({ kind: "denied", reason: "inactive_account" })

      expect(bootstrapLoaded).toBe(false)
    }
  )

  it("shows access denied when active accounts lack docs authorization", async () => {
    await expect(
      resolveDocsAccess({
        loadAppUserState: () =>
          Promise.resolve({
            kind: "active_onboarded_profile",
            user: { id: "user-1" },
            profile: { username: "player" },
          }),
        loadReaderBootstrap: () => Promise.reject(new TransportError("FORBIDDEN")),
        returnUrl: docsReturnUrl,
        webAppBaseUrl,
      })
    ).resolves.toEqual({ kind: "denied", reason: "forbidden_role" })
  })

  it("authorizes verified admins and owners without requiring profile onboarding", async () => {
    await expect(
      resolveDocsAccess({
        loadAppUserState: () =>
          Promise.resolve({
            kind: "verified_profileless",
            user: { id: "admin-1" },
          }),
        loadReaderBootstrap: () => Promise.resolve(readerBootstrap),
        returnUrl: docsReturnUrl,
        webAppBaseUrl,
      })
    ).resolves.toEqual({ kind: "authorized", bootstrap: readerBootstrap })
  })
})