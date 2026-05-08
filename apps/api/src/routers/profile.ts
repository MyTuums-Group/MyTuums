import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  USERNAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  DISPLAY_NAME_MAX_LENGTH,
  BIO_MAX_LENGTH,
} from "@workspace/types";
import { protectedProcedure, publicProcedure, router } from "../trpc.js";
import { authorization } from "../authorization/index.js";
import {
  submitOnboarding,
  getByUsername,
  checkProfileExists,
  getMyProfile,
  type OnboardingError,
  type ProfileAccessError,
} from "../services/profile/index.js";

// ── Domain error → tRPC error mapping ────────────────────────────────

function mapOnboardingError(error: OnboardingError): TRPCError {
  switch (error.kind) {
    case "invalid_username":
      return new TRPCError({ code: "BAD_REQUEST", message: error.message });
    case "already_has_profile":
      return new TRPCError({ code: "CONFLICT", message: "You already have a profile." });
    case "username_taken":
      return new TRPCError({ code: "CONFLICT", message: "This username is already taken." });
  }
}

function mapProfileAccessError(error: ProfileAccessError): TRPCError {
  switch (error.kind) {
    case "not_found":
      return new TRPCError({ code: "NOT_FOUND", message: "Profile not found." });
    case "not_visible":
      return new TRPCError({ code: "FORBIDDEN", message: "This profile is not available." });
  }
}

// ── Router ───────────────────────────────────────────────────────────

export const profileRouter = router({
  /**
   * Fetch the authenticated user's own profile.
   * Returns null if the user has not completed onboarding yet.
   */
  getMyProfile: protectedProcedure.query(async ({ ctx }) => {
    const profile = await getMyProfile(ctx.user.id);
    return profile;
  }),

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
      const result = await submitOnboarding(ctx.user.id, {
        username: input.username,
        displayName: input.displayName ?? null,
        bio: input.bio ?? null,
      });
      if (!result.ok) {
        throw mapOnboardingError(result.error);
      }
      return result.value;
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
        : null;
      const result = await getByUsername(input.username, viewerCtx, authorization);
      if (!result.ok) {
        throw mapProfileAccessError(result.error);
      }
      return result.value;
    }),

  /**
   * Check if the authenticated user has a profile.
   * Used by the frontend route guard to redirect to onboarding.
   */
  checkExists: protectedProcedure.query(async ({ ctx }) => {
    return checkProfileExists(ctx.user.id);
  }),
});