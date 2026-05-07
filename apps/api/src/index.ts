import Fastify, { type FastifyRequest, type FastifyReply } from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import { eq } from "drizzle-orm";
import { appRouter } from "./trpc";
import { createContext } from "./context";
import { auth } from "./auth";
import { fromNodeHeaders } from "better-auth/node";
import { env } from "@workspace/config";
import { db } from "@workspace/db";
import { profile } from "@workspace/db/schema";

export async function buildApp() {
  const app = Fastify({ logger: true });

  // CORS — allow web app origin
  await app.register(cors, {
    origin: env.NODE_ENV === "production"
      ? ["https://mytuums.com", "https://www.mytuums.com"]
      : ["http://localhost:5173"],
    credentials: true,
  });

  // Cookies (required for BetterAuth sessions)
  await app.register(cookie);

  // BetterAuth handler — catch-all under /api/auth/*
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
        void reply.send(body ? (body.startsWith("{") ? JSON.parse(body) : body) : null);
        return;
      } catch (error) {
        app.log.error(`Auth error: ${String(error)}`);
        return reply.status(500).send({ error: "Internal authentication error" });
      }
    },
  });

  // tRPC plugin — mounted at /trpc
  await app.register(fastifyTRPCPlugin, {
    prefix: "/trpc",
    trpcOptions: {
      router: appRouter,
      createContext: ({ req, res }: { req: FastifyRequest; res: FastifyReply }) =>
        createContext(req, res as unknown as import("fastify").FastifyReply),
    },
  });

  // Health check
  app.get("/healthz", () => ({
    status: "healthy",
    timestamp: new Date().toISOString(),
  }));

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
      const [row] = await db
        .select({ id: profile.id })
        .from(profile)
        .where(eq(profile.userId, session.user.id))
        .limit(1);
      return { hasProfile: row !== undefined };
    } catch {
      return reply.status(500).send({ hasProfile: false });
    }
  });

  return app;
}

// Start the server when this module is run directly (not imported)
const port = parseInt(process.env.API_PORT ?? "4000", 10);
const app = await buildApp();
try {
  await app.listen({ port, host: "0.0.0.0" });
  app.log.info(`API server listening on http://0.0.0.0:${port}`);
} catch (err) {
  app.log.error(`Failed to start server: ${String(err)}`);
  process.exit(1);
}
