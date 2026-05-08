// ── Profile REST route: session-aware profile-existence check ──
// Thin adapter — extracts session from headers, delegates to profileService.

import type { FastifyInstance } from "fastify";
import { auth } from "./auth.js";
import { checkProfileExists } from "./services/profile/index.js";

export function registerProfileRoutes(app: FastifyInstance): void {
  // Profile exists check (used by frontend route guard)
  app.get("/api/profile/exists", async (request, reply) => {
    try {
      const headers = new Headers();
      for (const [k, v] of Object.entries(request.headers)) {
        if (typeof v === "string") headers.set(k, v);
      }
      const session = await auth.api.getSession({ headers });
      if (!session) {
        return reply.status(401).send({ hasProfile: false });
      }
      return checkProfileExists(session.user.id);
    } catch {
      return reply.status(500).send({ hasProfile: false });
    }
  });
}