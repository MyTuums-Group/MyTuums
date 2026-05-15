/**
 * BetterAuth route handler — registers /api/auth/* on a Fastify app.
 *
 * Thin adapter: converts Fastify request → Web Request → BetterAuth handler → Fastify response.
 * Business logic lives in the auth config (auth.ts), not here.
 */

import type { FastifyInstance } from "fastify";
import { auth } from "../auth.js";
import { fromNodeHeaders } from "better-auth/node";

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
        const url = new URL(request.url, `http://${request.headers.host}`);
        const headers = fromNodeHeaders(request.headers);

        const req = new Request(url.toString(), {
          method: request.method,
          headers,
          ...(request.body ? { body: JSON.stringify(request.body) } : {}),
        });

        const response = await auth.handler(req);

        reply.status(response.status);
        response.headers.forEach((value, key) => reply.header(key, value));
        const body = response.body ? await response.text() : null;
        void reply.send(body);
        return;
      } catch (error) {
        app.log.error(`Auth error: ${String(error)}`);
        return reply.status(500).send({ error: "Internal authentication error" });
      }
    },
  });
}
