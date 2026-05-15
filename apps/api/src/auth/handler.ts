/**
 * BetterAuth route handler - registers /api/auth/* on a Fastify app.
 *
 * Thin adapter: converts Fastify request -> Web Request -> BetterAuth handler -> Fastify response.
 * Business logic lives in the auth config (auth.ts), not here.
 */

import type { FastifyInstance } from "fastify"
import { fromNodeHeaders } from "better-auth/node"
import { auth } from "../auth.js"
import { launchReadinessService } from "../services/launch-readiness/launch-readiness.production.js"

/**
 * Register BetterAuth's catch-all handler under /api/auth/*.
 * Handles GET and POST for all BetterAuth routes (sign-in, sign-up, session, etc.).
 */
export function registerAuthRoutes(app: FastifyInstance): void {
  app.route({
    method: ["GET", "POST"],
    url: "/api/auth/*",
    async handler(request, reply) {
      try {
        const url = new URL(request.url, `http://${request.headers.host}`)
        if (request.method === "POST" && isSignUpRequest(url)) {
          const launchReadiness = await launchReadinessService.getReadiness()
          if (!launchReadiness.publicSignupEnabled) {
            return reply.status(403).send({
              code: "PUBLIC_SIGNUP_DISABLED",
              message:
                "Public signup is disabled until MyTuums launch readiness gates are complete.",
              status: 403,
            })
          }
        }

        const headers = fromNodeHeaders(request.headers)

        const req = new Request(url.toString(), {
          method: request.method,
          headers,
          ...(request.body ? { body: JSON.stringify(request.body) } : {}),
        })

        const response = await auth.handler(req)

        reply.status(response.status)
        response.headers.forEach((value, key) => reply.header(key, value))
        const body = response.body ? await response.text() : null
        void reply.send(body)
        return
      } catch (error) {
        app.log.error(`Auth error: ${String(error)}`)
        return reply.status(500).send({ error: "Internal authentication error" })
      }
    },
  })
}

function isSignUpRequest(url: URL): boolean {
  return url.pathname === "/api/auth/sign-up/email"
}
