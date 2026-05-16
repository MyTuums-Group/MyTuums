import { z } from "zod"
import { SEARCH_MIN_QUERY_LENGTH } from "@workspace/types"
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
import { settingsRouter } from "./routers/settings.js"
import { staffRouter } from "./routers/staff.js"
import { authorization } from "./authorization/index.js"
import { getCurrentAppUserState } from "./services/app-user-state/index.js"
import { launchReadinessService } from "./services/launch-readiness/launch-readiness.production.js"
import {
  createSearchService,
  type AppSearchInput,
} from "./services/search/index.js"
import { searchQueries } from "./services/search/production.js"
import {
  RATE_LIMIT_POLICIES,
  createUserIpRateLimitKey,
} from "./services/rate-limit/index.js"
import { getRequestIp } from "./transport/request-info.js"
import { enforceRateLimit } from "./transport/rate-limit.js"

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
        query: z.string().max(100),
        limit: z.number().int().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const viewer = await authorization.getViewerContext({
        userId: ctx.user.id,
      })
      const searchInput: AppSearchInput = {
        query:
          input.query.trim().length >= SEARCH_MIN_QUERY_LENGTH
            ? input.query
            : "",
        limit: input.limit ?? 10,
      }

      if (searchInput.query) {
        await enforceRateLimit({
          key: createUserIpRateLimitKey({
            userId: ctx.user.id,
            ipAddress: getRequestIp(ctx.req),
          }),
          policy: RATE_LIMIT_POLICIES.search,
          reply: ctx.reply,
          message: "Too many search requests.",
        })
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
  settings: settingsRouter,
  staff: staffRouter,
  contact: contactRouter,
})

export type AppRouter = typeof appRouter
