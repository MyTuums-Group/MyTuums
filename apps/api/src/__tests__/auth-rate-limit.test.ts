import Fastify, { type FastifyInstance } from "fastify"
import { describe, expect, it, vi } from "vitest"
import { registerAuthRoutes } from "../auth/handler.js"
import {
  AUTH_RATE_LIMITED_ERROR,
  AUTH_RATE_LIMIT_POLICIES,
  createAuthRateLimitGuard,
  type AuthRateLimitPolicyOverrides,
} from "../auth/rate-limit.js"
import {
  createInMemoryRateLimiter,
  type RateLimiter,
  type RateLimitPolicy,
} from "../services/rate-limit/index.js"

const NOW = new Date("2026-05-15T12:00:00.000Z")
const ONE_MINUTE_MS = 60 * 1000

vi.hoisted(() => {
  process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/mytuums"
  process.env.BETTER_AUTH_SECRET ??= "test-secret-with-at-least-32-characters"
  process.env.NODE_ENV = "test"
})

describe("auth rate limits", () => {
  it("blocks login attempts and opens a new window after reset", async () => {
    let now = NOW
    const guard = createAuthRateLimitGuard({
      rateLimiter: createInMemoryRateLimiter(),
      policies: {
        login: testPolicy("auth_login", 2),
      },
      now: () => now,
    })
    const input = {
      method: "POST",
      pathname: "/api/auth/sign-in/email",
      body: { email: "Player@Example.com", password: "wrong-password" },
      ipAddress: "203.0.113.20",
    }

    await expect(guard.consume(input)).resolves.toEqual({ allowed: true })
    await expect(guard.consume(input)).resolves.toEqual({ allowed: true })
    await expect(guard.consume(input)).resolves.toEqual({
      allowed: false,
      retryAfterSeconds: 60,
    })

    now = new Date(NOW.getTime() + ONE_MINUTE_MS + 1)

    await expect(guard.consume(input)).resolves.toEqual({ allowed: true })
  })

  it("keys sensitive BetterAuth endpoints by IP plus safe identifier hashes", async () => {
    const consumed: Array<Parameters<RateLimiter["consume"]>[0]> = []
    const guard = createAuthRateLimitGuard({
      rateLimiter: {
        consume(input) {
          consumed.push(input)
          return Promise.resolve({ allowed: true })
        },
      },
      now: () => NOW,
    })

    await guard.consume({
      method: "POST",
      pathname: "/api/auth/sign-up/email",
      body: { email: "signup@example.com" },
      ipAddress: "203.0.113.21",
    })
    await guard.consume({
      method: "POST",
      pathname: "/api/auth/sign-in/email",
      body: { email: "login@example.com" },
      ipAddress: "203.0.113.22",
    })
    await guard.consume({
      method: "POST",
      pathname: "/api/auth/forget-password",
      body: { email: "reset@example.com" },
      ipAddress: "203.0.113.23",
    })
    await guard.consume({
      method: "POST",
      pathname: "/api/auth/reset-password",
      body: { token: "reset-token" },
      ipAddress: "203.0.113.24",
    })
    await guard.consume({
      method: "POST",
      pathname: "/api/auth/send-verification-email",
      body: { email: "verify@example.com" },
      ipAddress: "203.0.113.25",
    })

    expect(consumed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: AUTH_RATE_LIMIT_POLICIES.registration.action,
        }),
        expect.objectContaining({
          action: AUTH_RATE_LIMIT_POLICIES.login.action,
        }),
        expect.objectContaining({
          action: AUTH_RATE_LIMIT_POLICIES.passwordResetRequest.action,
        }),
        expect.objectContaining({
          action: AUTH_RATE_LIMIT_POLICIES.passwordResetCompletion.action,
        }),
        expect.objectContaining({
          action: AUTH_RATE_LIMIT_POLICIES.emailVerificationResend.action,
        }),
      ])
    )
    expect(consumed.some((input) => input.key.startsWith("ip:"))).toBe(true)
    expect(consumed.some((input) => input.key.startsWith("email:"))).toBe(true)
    expect(consumed.some((input) => input.key.startsWith("token:"))).toBe(true)
    for (const input of consumed) {
      expect(input.key).not.toContain("example.com")
      expect(input.key).not.toContain("203.0.113")
      expect(input.key).not.toContain("reset-token")
      expect(input.now).toEqual(NOW)
    }
  })

  it("returns the same safe 429 shape for limited login attempts", async () => {
    const { app, handledRequests } = createAuthTestApp({
      login: testPolicy("auth_login", 1),
    })

    try {
      await expectAuthOk(
        app,
        "/api/auth/sign-in/email",
        {
          email: "known@example.com",
          password: "wrong-password",
        },
        "203.0.113.30"
      )
      const knownLimited = await authPost(
        app,
        "/api/auth/sign-in/email",
        {
          email: "known@example.com",
          password: "wrong-password",
        },
        "203.0.113.30"
      )

      await expectAuthOk(
        app,
        "/api/auth/sign-in/email",
        {
          email: "missing@example.com",
          password: "wrong-password",
        },
        "203.0.113.31"
      )
      const missingLimited = await authPost(
        app,
        "/api/auth/sign-in/email",
        {
          email: "missing@example.com",
          password: "wrong-password",
        },
        "203.0.113.31"
      )

      expect(knownLimited.statusCode).toBe(429)
      expect(missingLimited.statusCode).toBe(429)
      expect(knownLimited.headers["retry-after"]).toBe("60")
      expect(missingLimited.headers["retry-after"]).toBe("60")
      expect(knownLimited.json()).toEqual(AUTH_RATE_LIMITED_ERROR)
      expect(missingLimited.json()).toEqual(knownLimited.json())
      expect(handledRequests).toHaveLength(2)
    } finally {
      await app.close()
    }
  })

  it("rate limits registration, password reset, and verification resend routes before BetterAuth", async () => {
    const { app, handledRequests } = createAuthTestApp({
      registration: testPolicy("auth_registration", 1),
      passwordResetRequest: testPolicy("auth_password_reset_request", 1),
      passwordResetCompletion: testPolicy("auth_password_reset_completion", 1),
      emailVerificationResend: testPolicy("auth_email_verification_resend", 1),
    })

    try {
      const cases = [
        {
          path: "/api/auth/sign-up/email",
          payload: {
            email: "signup@example.com",
            password: "password123",
            name: "Signup Player",
          },
          ipAddress: "203.0.113.40",
        },
        {
          path: "/api/auth/forget-password",
          payload: { email: "reset-request@example.com" },
          ipAddress: "203.0.113.41",
        },
        {
          path: "/api/auth/reset-password",
          payload: { token: "reset-token", newPassword: "new-password123" },
          ipAddress: "203.0.113.42",
        },
        {
          path: "/api/auth/send-verification-email",
          payload: { email: "verify@example.com" },
          ipAddress: "203.0.113.43",
        },
      ]

      for (const item of cases) {
        await expectAuthOk(app, item.path, item.payload, item.ipAddress)
        const limited = await authPost(
          app,
          item.path,
          item.payload,
          item.ipAddress
        )

        expect(limited.statusCode).toBe(429)
        expect(limited.headers["retry-after"]).toBe("60")
        expect(limited.json()).toEqual(AUTH_RATE_LIMITED_ERROR)
      }

      expect(handledRequests).toHaveLength(cases.length)
    } finally {
      await app.close()
    }
  })
})

function createAuthTestApp(rateLimitPolicies: AuthRateLimitPolicyOverrides) {
  const app = Fastify({ logger: false })
  const handledRequests: Request[] = []

  registerAuthRoutes(app, {
    authHandler(request) {
      handledRequests.push(request)
      return Promise.resolve(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      )
    },
    getLaunchReadiness() {
      return Promise.resolve({ publicSignupEnabled: true })
    },
    isDeletedEmailHeld() {
      return Promise.resolve(false)
    },
    now: () => NOW,
    rateLimiter: createInMemoryRateLimiter(),
    rateLimitPolicies,
  })

  return { app, handledRequests }
}

async function expectAuthOk(
  app: FastifyInstance,
  path: string,
  payload: Record<string, unknown>,
  ipAddress: string
): Promise<void> {
  const response = await authPost(app, path, payload, ipAddress)
  expect(response.statusCode).toBe(200)
}

function authPost(
  app: FastifyInstance,
  path: string,
  payload: Record<string, unknown>,
  ipAddress: string
) {
  return app.inject({
    method: "POST",
    url: path,
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ipAddress,
    },
    payload,
  })
}

function testPolicy(action: string, limit: number): RateLimitPolicy {
  return {
    action,
    limit,
    windowMs: ONE_MINUTE_MS,
  }
}
