import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { profile } from "@workspace/db/schema";
import {
  createUsername,
  DISPLAY_NAME_MAX_LENGTH,
  BIO_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
} from "@workspace/types";
import { protectedProcedure, publicProcedure, router } from "../trpc.js";

export const profileRouter = router({
  /**
   * Create a profile during onboarding.
   * Requires auth. Username is immutable once set.
   */
  submitOnboarding: protectedProcedure
    .input(
      z.object({
        username: z
          .string()
          .min(USERNAME_MIN_LENGTH)
          .max(USERNAME_MAX_LENGTH),
        displayName: z.string().max(DISPLAY_NAME_MAX_LENGTH).optional(),
        bio: z.string().max(BIO_MAX_LENGTH).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Validate username format + reserved list
      const result = createUsername(input.username);
      if (!result.ok) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: result.error.message,
        });
      }
      const username = result.value;

      // 2. Check if user already has a profile (one per user)
      const [existing] = await db
        .select({ id: profile.id })
        .from(profile)
        .where(eq(profile.userId, ctx.user.id))
        .limit(1);

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You already have a profile.",
        });
      }

      // 3. Insert — unique constraint on username handles race conditions atomically
      try {
        const [row] = await db
          .insert(profile)
          .values({
            userId: ctx.user.id,
            username,
            displayName: input.displayName?.trim() || null,
            bio: input.bio?.trim() || null,
          })
          .returning();

        return row;
      } catch (err) {
        // PostgreSQL unique violation code 23505
        if (
          typeof err === "object" &&
          err !== null &&
          "code" in err &&
          (err as { code: string }).code === "23505"
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This username is already taken.",
          });
        }
        throw err;
      }
    }),

  /**
   * Fetch a profile by username.
   * Public — used for /@{username} pages.
   */
  getByUsername: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ input }) => {
      const [row] = await db
        .select()
        .from(profile)
        .where(eq(profile.username, input.username.toLowerCase()))
        .limit(1);

      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Profile not found.",
        });
      }

      return row;
    }),

  /**
   * Check if the authenticated user has a profile.
   * Used by the frontend route guard to redirect to onboarding.
   */
  checkExists: protectedProcedure.query(async ({ ctx }) => {
    const [row] = await db
      .select({ id: profile.id })
      .from(profile)
      .where(eq(profile.userId, ctx.user.id))
      .limit(1);

    return { hasProfile: row !== undefined };
  }),
});
