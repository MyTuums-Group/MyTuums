import { z } from "zod"
import { router, publicProcedure, protectedProcedure } from "./trpc.js"
import { contactRouter } from "./routers/contact.js"
import { docsRouter } from "./routers/docs.js"
import { engagementRouter } from "./routers/engagement.js"
import { gameRouter } from "./routers/game.js"
import { mediaRouter } from "./routers/media.js"
import { moderationRouter } from "./routers/moderation.js"
import { notificationRouter } from "./routers/notification.js"
import { profileRouter } from "./routers/profile.js"
import { postRouter } from "./routers/post.js"
import { staffRouter } from "./routers/staff.js"
import { authorization } from "./authorization/index.js"
import { getCurrentAppUserState } from "./services/app-user-state/index.js"
import { launchReadinessService } from "./services/launch-readiness/launch-readiness.production.js"
import {
  createSearchService,
  type AppSearchInput,
} from "./services/search/index.js"
import { searchQueries } from "./services/search/production.js"

const appSearch = createSearchService(searchQueries)

export const appRouter = router({
  health: publicProcedure.query(() => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  })),

  currentAppUser: publicProcedure.query(({ ctx }) =>
    getCurrentAppUserState(ctx)
  ),

  launchReadiness: publicProcedure.query(() =>
    launchReadinessService.getReadiness()
  ),

  me: protectedProcedure.query(({ ctx }) => ({
    user: ctx.user,
    session: ctx.session,
  })),

  search: protectedProcedure
    .input(
      z.object({
        query: z.string(),
        limit: z.number().int().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const viewer = await authorization.getViewerContext({
        userId: ctx.user.id,
      })
      const searchInput: AppSearchInput = {
        query: input.query ?? "",
        limit: input.limit ?? 10,
      }
      return appSearch.appSearch(viewer, searchInput)
    }),

  profile: profileRouter,
  post: postRouter,
  engagement: engagementRouter,
  game: gameRouter,
  media: mediaRouter,
  moderation: moderationRouter,
  notification: notificationRouter,
  docs: docsRouter,
  staff: staffRouter,
  contact: contactRouter,
})

export type AppRouter = typeof appRouter
