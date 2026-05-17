import { z } from "zod"
import { authorization } from "../authorization/index.js"
import { feedVisibilityQueries } from "../services/feed/production.js"
import { GamePageEligibility } from "../services/feed/index.js"
import {
  getBySlug,
  listActive,
  listFavoritesByUserId,
  setFavorite,
} from "../services/game/index.js"
import { postPresentation } from "../services/post/presentation.production.js"
import { getOwnerByUsername } from "../services/profile/index.js"
import {
  mapFavoriteGameErrorToTRPC,
  mapGameAccessErrorToTRPC,
} from "../transport/game-errors.js"
import { gameSlugSchema } from "../transport/value-object-schemas.js"
import { mapProfileAccessErrorToTRPC } from "../transport/profile-errors.js"
import { protectedProcedure, publicProcedure, router } from "../trpc.js"

const DEFAULT_PAGE_LIMIT = 20
const MAX_PAGE_LIMIT = 50

const gameFeedSchema = z.object({
  slug: gameSlugSchema,
  cursor: z.string().optional(),
  limit: z
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_LIMIT)
    .default(DEFAULT_PAGE_LIMIT),
})

export const gameRouter = router({
  listActive: protectedProcedure.query(() => listActive()),

  detail: publicProcedure
    .input(z.object({ slug: gameSlugSchema }))
    .query(async ({ ctx, input }) => {
      const result = await getBySlug(input.slug, ctx.session?.user.id ?? null)
      if (!result.ok) {
        throw mapGameAccessErrorToTRPC(result.error)
      }
      return result.value
    }),

  feed: publicProcedure.input(gameFeedSchema).query(async ({ ctx, input }) => {
    const viewer = await getViewerFromContext(ctx)
    const result = await getBySlug(input.slug, ctx.session?.user.id ?? null)
    if (!result.ok) {
      throw mapGameAccessErrorToTRPC(result.error)
    }

    const pageInput = await postPresentation.toFeedPageInput(viewer, input)
    const page = await feedVisibilityQueries.queryFeed({
      viewer,
      eligibility: GamePageEligibility.create(result.value.game.id),
      limit: pageInput.limit,
      cursor: pageInput.cursor,
    })

    return postPresentation.toFeedResponse(viewer, page)
  }),

  myFavorites: protectedProcedure.query(({ ctx }) =>
    listFavoritesByUserId(ctx.user.id)
  ),

  profileFavorites: publicProcedure
    .input(z.object({ username: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const viewer = await getViewerFromContext(ctx)
      const owner = await getOwnerByUsername(
        input.username,
        viewer,
        authorization
      )
      if (!owner.ok) {
        throw mapProfileAccessErrorToTRPC(owner.error)
      }
      return listFavoritesByUserId(owner.value.userId)
    }),

  setFavorite: protectedProcedure
    .input(
      z.object({
        slug: gameSlugSchema,
        favorite: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await setFavorite({
        userId: ctx.user.id,
        slug: input.slug,
        favorite: input.favorite,
      })
      if (!result.ok) {
        throw mapFavoriteGameErrorToTRPC(result.error)
      }
      return result.value
    }),
})

async function getViewerFromContext(ctx: {
  session: { user: { id: string } } | null
}) {
  return authorization.getViewerContext(
    ctx.session ? { userId: ctx.session.user.id } : null
  )
}
