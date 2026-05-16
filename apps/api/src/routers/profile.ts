import { z } from "zod"
import {
  USERNAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  DISPLAY_NAME_MAX_LENGTH,
  BIO_MAX_LENGTH,
  MAX_FAVORITE_GAMES,
} from "@workspace/types"
import { protectedProcedure, publicProcedure, router } from "../trpc.js"
import { authorization } from "../authorization/index.js"
import {
  submitOnboarding,
  checkUsernameAvailability,
  getByUsername,
  checkProfileExists,
  getMyProfile,
} from "../services/profile/index.js"
import {
  mapOnboardingErrorToTRPC,
  mapProfileAccessErrorToTRPC,
} from "../transport/profile-errors.js"

// ── Router ───────────────────────────────────────────────────────────

export const profileRouter = router({
  /**
   * Fetch the authenticated user's own profile.
   * Returns null if the user has not completed onboarding yet.
   */
  getMyProfile: protectedProcedure.query(async ({ ctx }) => {
    const profile = await getMyProfile(ctx.user.id)
    return profile
  }),

  /**
   * Create a profile during onboarding.
   * Requires auth. Username is immutable once set.
   */
  submitOnboarding: protectedProcedure
    .input(
      z.object({
        username: z.string().min(USERNAME_MIN_LENGTH).max(USERNAME_MAX_LENGTH),
        displayName: z.string().max(DISPLAY_NAME_MAX_LENGTH).optional(),
        bio: z.string().max(BIO_MAX_LENGTH).optional(),
        avatarMediaId: z.string().uuid().nullable().optional(),
        favoriteGameIds: z
          .array(z.string().uuid())
          .max(MAX_FAVORITE_GAMES)
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await submitOnboarding(ctx.user.id, {
        username: input.username,
        displayName: input.displayName ?? null,
        bio: input.bio ?? null,
        avatarMediaId: input.avatarMediaId ?? null,
        favoriteGameIds: input.favoriteGameIds ?? [],
      })
      if (!result.ok) {
        throw mapOnboardingErrorToTRPC(result.error)
      }
      return result.value
    }),

  /**
   * Check onboarding username availability before profile creation.
   * The unique constraint remains the race guard at submit time.
   */
  checkUsernameAvailability: protectedProcedure
    .input(
      z.object({
        username: z.string().min(1).max(100),
      })
    )
    .query(async ({ input }) => {
      return checkUsernameAvailability(input.username)
    }),

  /**
   * Fetch a profile by username.
   * Public — used for /@{username} pages.
   * Applies visibility rules for authenticated viewers.
   */
  getByUsername: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ ctx, input }) => {
      const viewerCtx = ctx.session?.user
        ? await authorization.getViewerContext({ userId: ctx.session.user.id })
        : null
      const result = await getByUsername(
        input.username,
        viewerCtx,
        authorization
      )
      if (!result.ok) {
        throw mapProfileAccessErrorToTRPC(result.error)
      }
      return result.value
    }),

  /**
   * Check if the authenticated user has a profile.
   * Used by the frontend route guard to redirect to onboarding.
   */
  checkExists: protectedProcedure.query(async ({ ctx }) => {
    return checkProfileExists(ctx.user.id)
  }),
})
