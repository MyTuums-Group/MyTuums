import Fastify, { type FastifyRequest, type FastifyReply } from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import { appRouter } from "./app-router.js";
import { createContext } from "./context";
import { registerAuthRoutes } from "./auth/handler.js";
import { registerProfileRoutes } from "./profile-routes.js";
import { env } from "@workspace/config";

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

  // BetterAuth — catch-all under /api/auth/*
  registerAuthRoutes(app);

  // Profile REST routes
  registerProfileRoutes(app);

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