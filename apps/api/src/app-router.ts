import { router, publicProcedure, protectedProcedure } from "./trpc.js";
import { profileRouter } from "./routers/profile.js";
import { getCurrentAppUserState } from "./services/app-user-state/index.js";

export const appRouter = router({
  health: publicProcedure.query(() => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  })),

  currentAppUser: publicProcedure.query(({ ctx }) => getCurrentAppUserState(ctx)),

  me: protectedProcedure.query(({ ctx }) => ({
    user: ctx.user,
    session: ctx.session,
  })),

  profile: profileRouter,
});

export type AppRouter = typeof appRouter;