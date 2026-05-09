// ── Current app user state REST route ──
// Thin adapter — builds the API context from Fastify request/reply and delegates to the read model.

import type { FastifyInstance } from "fastify";
import { createContext } from "./context.js";
import { getCurrentAppUserState } from "./services/app-user-state/index.js";

export function registerProfileRoutes(app: FastifyInstance): void {
  app.get("/api/app-user-state", async (request, reply) => {
    try {
      const ctx = await createContext(request, reply);
      return getCurrentAppUserState(ctx);
    } catch {
      return reply.status(500).send({ kind: "unauthenticated" });
    }
  });

  // Backwards-compatible thin adapter for older callers during rollout.
  app.get("/api/profile/exists", async (request, reply) => {
    try {
      const ctx = await createContext(request, reply);
      const state = await getCurrentAppUserState(ctx);
      return { hasProfile: state.kind === "active_onboarded_profile" };
    } catch {
      return reply.status(500).send({ hasProfile: false });
    }
  });
}