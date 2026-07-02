import Fastify, { type FastifyInstance } from "fastify"
import { TRPCError } from "@trpc/server"
import { afterEach, describe, expect, it } from "vitest"
import type { Context } from "../context.js"
import { registerMobileRoutes, type MobileCaller } from "../mobile-routes.js"

const apps: FastifyInstance[] = []

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()))
})

describe("mobile REST routes", () => {
  it("returns the current mobile session state", async () => {
    const app = createMobileApp({
      currentAppUser: () =>
        Promise.resolve({
          kind: "active_onboarded_profile",
          profile: { username: "gabriel" },
        }),
    })

    const response = await app.inject({
      method: "GET",
      url: "/api/mobile/v1/session",
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      kind: "active_onboarded_profile",
      profile: { username: "gabriel" },
    })
  })

  it("forwards onboarding payloads to the existing profile caller", async () => {
    let receivedInput: unknown
    const app = createMobileApp({
      profile: {
        submitOnboarding: (input: unknown) => {
          receivedInput = input
          return Promise.resolve({ username: "playerone" })
        },
      },
    })

    const response = await app.inject({
      method: "POST",
      url: "/api/mobile/v1/onboarding",
      payload: {
        username: "playerone",
        displayName: "Player One",
        favoriteGameIds: ["9f987870-8f76-4bb4-88b0-f8f70f2408bc"],
      },
    })

    expect(response.statusCode).toBe(200)
    expect(receivedInput).toEqual({
      username: "playerone",
      displayName: "Player One",
      favoriteGameIds: ["9f987870-8f76-4bb4-88b0-f8f70f2408bc"],
    })
  })

  it("maps query params to typed feed pagination input", async () => {
    let receivedInput: unknown
    const app = createMobileApp({
      post: {
        forYouFeed: (input: unknown) => {
          receivedInput = input
          return Promise.resolve({ items: [], nextCursor: null })
        },
      },
    })

    const response = await app.inject({
      method: "GET",
      url: "/api/mobile/v1/feed/for-you?cursor=feed-cursor&limit=12",
    })

    expect(response.statusCode).toBe(200)
    expect(receivedInput).toEqual({ cursor: "feed-cursor", limit: 12 })
  })

  it("forwards media upload and report payloads", async () => {
    const calls: unknown[] = []
    const app = createMobileApp({
      media: {
        createUpload: (input: unknown) => {
          calls.push(["media", input])
          return Promise.resolve({
            mediaId: "e984bcd4-1b68-4316-9efc-4d5e3bd4fbbb",
          })
        },
      },
      moderation: {
        submitReport: (input: unknown) => {
          calls.push(["report", input])
          return Promise.resolve({ id: "report-1" })
        },
      },
    })

    const mediaResponse = await app.inject({
      method: "POST",
      url: "/api/mobile/v1/media/uploads",
      payload: {
        mimeType: "image/png",
        byteSize: 1024,
        purpose: "post_attachment",
      },
    })
    const reportResponse = await app.inject({
      method: "POST",
      url: "/api/mobile/v1/reports",
      payload: {
        target: { type: "post", publicId: "post_public_id" },
        reason: "spam",
        notes: "duplicate",
      },
    })

    expect(mediaResponse.statusCode).toBe(200)
    expect(reportResponse.statusCode).toBe(200)
    expect(calls).toEqual([
      [
        "media",
        {
          mimeType: "image/png",
          byteSize: 1024,
          purpose: "post_attachment",
        },
      ],
      [
        "report",
        {
          target: { type: "post", publicId: "post_public_id" },
          reason: "spam",
          notes: "duplicate",
        },
      ],
    ])
  })

  it("normalizes tRPC errors for mobile REST clients", async () => {
    const app = createMobileApp({
      currentAppUser: () =>
        Promise.reject(
          new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          })
        ),
    })

    const response = await app.inject({
      method: "GET",
      url: "/api/mobile/v1/session",
    })

    expect(response.statusCode).toBe(401)
    expect(response.json()).toEqual({
      error: {
        code: "UNAUTHORIZED",
        message: "Sign in required.",
      },
    })
  })
})

function createMobileApp(caller: Record<string, unknown>) {
  const app = Fastify({ logger: false })
  apps.push(app)
  registerMobileRoutes(app, {
    createContext: () => Promise.resolve({} as Context),
    createCaller: () => caller as MobileCaller,
  })
  return app
}
