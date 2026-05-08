import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Context } from "./context.js";
import { isActionAllowedForAccount } from "./services/account-status/index.js";
export type { AppRouter } from "./app-router.js";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;
export const mergeRouters = t.mergeRouters;

// ── Auth middleware ──────────────────────────────────────────────────

const isAuthenticated = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }

  if (!ctx.accountLifecycle) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Account not found",
    });
  }

  if (!isActionAllowedForAccount(ctx.accountLifecycle, "protected_action")) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Account status does not allow this action",
    });
  }

  return next({
    ctx: {
      // Pass the session and user to downstream procedures
      session: ctx.session,
      user: ctx.session.user,
      accountLifecycle: ctx.accountLifecycle,
    },
  });
});

/** Procedure that requires a valid session. Returns 401 if unauthenticated. */
export const protectedProcedure = t.procedure.use(isAuthenticated);