/**
 * BetterAuth route handler - registers /api/auth/* on a Fastify app.
 *
 * Thin adapter: converts Fastify request -> Web Request -> BetterAuth handler -> Fastify response.
 * Business logic lives in the auth config (auth.ts), not here.
 */

import type { FastifyInstance } from "fastify"
import { fromNodeHeaders } from "better-auth/node"
import { auth } from "../auth.js"
import { isDeletedEmailHeld } from "../services/account-deletion/index.js"
import { launchReadinessService } from "../services/launch-readiness/launch-readiness.production.js"
import {
  emitOperationalEvent,
  operationalEventLogger,
} from "../services/operational-events.js"
import { postgresRateLimiter } from "../services/rate-limit/production.js"
import type { RateLimiter } from "../services/rate-limit/index.js"
import { getRequestIp } from "../transport/request-info.js"
import { setRetryAfterHeader } from "../transport/rate-limit.js"
import {
  AUTH_RATE_LIMITED_ERROR,
  createAuthRateLimitGuard,
  type AuthRateLimitPolicyOverrides,
} from "./rate-limit.js"

type AuthHandler = (request: Request) => Promise<Response>

type AuthRouteOptions = {
  authHandler?: AuthHandler
  rateLimiter?: RateLimiter
  rateLimitPolicies?: AuthRateLimitPolicyOverrides
  now?: () => Date
  getLaunchReadiness?: () => Promise<{ publicSignupEnabled: boolean }>
  isDeletedEmailHeld?: (email: string) => Promise<boolean>
}

/**
 * Register BetterAuth's catch-all handler under /api/auth/*.
 * Handles GET and POST for all BetterAuth routes (sign-in, sign-up, session, etc.).
 */
export function registerAuthRoutes(
  app: FastifyInstance,
  options: AuthRouteOptions = {}
): void {
  const authHandler = options.authHandler ?? auth.handler
  const authRateLimit = createAuthRateLimitGuard({
    rateLimiter: options.rateLimiter ?? postgresRateLimiter,
    policies: options.rateLimitPolicies,
    now: options.now,
  })
  const getLaunchReadiness =
    options.getLaunchReadiness ?? (() => launchReadinessService.getReadiness())
  const checkDeletedEmailHeld = options.isDeletedEmailHeld ?? isDeletedEmailHeld

  app.route({
    method: ["GET", "POST"],
    url: "/api/auth/*",
    async handler(request, reply) {
      try {
        const url = new URL(request.url, `http://${request.headers.host}`)
        const rateLimit = await authRateLimit.consume({
          method: request.method,
          pathname: url.pathname,
          body: request.body,
          ipAddress: getRequestIp(request),
        })

        if (!rateLimit.allowed) {
          setRetryAfterHeader(reply, rateLimit.retryAfterSeconds)
          return reply.status(429).send(AUTH_RATE_LIMITED_ERROR)
        }

        const isSignUp = request.method === "POST" && isSignUpRequest(url)
        if (isSignUp) {
          const launchReadiness = await getLaunchReadiness()
          if (!launchReadiness.publicSignupEnabled) {
            return reply.status(403).send({
              code: "PUBLIC_SIGNUP_DISABLED",
              message:
                "Public signup is disabled until MyTuums launch readiness gates are complete.",
              status: 403,
            })
          }

          const email = getSignUpEmail(request.body)
          if (email && (await checkDeletedEmailHeld(email))) {
            return reply.status(409).send({
              code: "DELETED_EMAIL_HELD",
              message:
                "This email is temporarily unavailable after account deletion.",
              status: 409,
            })
          }
        }

        const headers = fromNodeHeaders(request.headers)

        const req = new Request(url.toString(), {
          method: request.method,
          headers,
          ...(request.body ? { body: JSON.stringify(request.body) } : {}),
        })

        const response = await authHandler(req)

        reply.status(response.status)
        response.headers.forEach((value, key) => reply.header(key, value))
        const body = response.body ? await response.text() : null
        if (isSignUp && response.ok) {
          const userId = getSignUpUserId(body)
          if (userId) {
            await emitOperationalEvent(operationalEventLogger, {
              event: "signup_completed",
              userId,
              status: "completed",
              authProvider: "email",
            })
          }
        }
        void reply.send(body)
        return
      } catch (error) {
        app.log.error(`Auth error: ${String(error)}`)
        return reply
          .status(500)
          .send({ error: "Internal authentication error" })
      }
    },
  })
}

function isSignUpRequest(url: URL): boolean {
  return url.pathname === "/api/auth/sign-up/email"
}

function getSignUpEmail(body: unknown): string | null {
  if (typeof body !== "object" || body === null || !("email" in body)) {
    return null
  }

  const email = (body as { email: unknown }).email
  return typeof email === "string" ? email : null
}

function getSignUpUserId(body: string | null): string | null {
  if (!body) return null
  try {
    const parsed = JSON.parse(body) as unknown
    if (typeof parsed !== "object" || parsed === null) return null
    if ("user" in parsed) {
      const user = (parsed as { user: unknown }).user
      if (typeof user === "object" && user !== null && "id" in user) {
        const id = (user as { id: unknown }).id
        return typeof id === "string" ? id : null
      }
    }
    if ("id" in parsed) {
      const id = (parsed as { id: unknown }).id
      return typeof id === "string" ? id : null
    }
  } catch {
    return null
  }
  return null
}
