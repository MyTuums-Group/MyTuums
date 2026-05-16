import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { MAX_FAVORITE_GAMES } from "@workspace/types"
import { accountActionProcedure, protectedProcedure, router } from "../trpc.js"
import {
  getSettings,
  updateProfile,
  updateThemePreference,
} from "../services/settings/index.js"
import {
  deleteOwnAccount,
  type AccountDeletionError,
} from "../services/account-deletion/index.js"
import { unblockUser } from "../services/engagement/index.js"
import { mapBlockUserErrorToTRPC } from "../transport/engagement-errors.js"
import type { SettingsProfileError } from "../services/settings/index.js"

const nullableMediaIdSchema = z.string().uuid().nullable().optional()
const themePreferenceSchema = z.enum(["system", "light", "dark"])

export const settingsRouter = router({
  get: protectedProcedure.query(({ ctx }) =>
    getSettings({
      userId: ctx.user.id,
      email: ctx.user.email ?? "",
      appVersion: process.env.npm_package_version ?? "0.0.1",
      buildInfo:
        process.env.APP_BUILD_INFO ?? process.env.GITHUB_SHA ?? "local",
    })
  ),

  updateProfile: protectedProcedure
    .input(
      z.object({
        displayName: z.string().nullable().optional(),
        bio: z.string().nullable().optional(),
        avatarMediaId: nullableMediaIdSchema,
        bannerMediaId: nullableMediaIdSchema,
        favoriteGameIds: z
          .array(z.string().uuid())
          .max(MAX_FAVORITE_GAMES)
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await updateProfile(ctx.user.id, input)
      if (!result.ok) throw mapSettingsProfileErrorToTRPC(result.error)
      return result.value
    }),

  updateThemePreference: protectedProcedure
    .input(z.object({ theme: themePreferenceSchema }))
    .mutation(async ({ ctx, input }) => {
      const result = await updateThemePreference(ctx.user.id, input.theme)
      if (!result.ok) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not update theme preference.",
        })
      }
      return result.value
    }),

  unblockUser: protectedProcedure
    .input(z.object({ userId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const result = await unblockUser({
        blockerId: ctx.user.id,
        blockedId: input.userId,
      })
      if (!result.ok) throw mapBlockUserErrorToTRPC(result.error)
      return result.value
    }),

  deleteAccount: accountActionProcedure("delete_account")
    .input(z.object({ password: z.string().min(1).max(128) }))
    .mutation(async ({ ctx, input }) => {
      const result = await deleteOwnAccount({
        userId: ctx.user.id,
        password: input.password,
      })
      if (!result.ok) throw mapAccountDeletionErrorToTRPC(result.error)
      return result.value
    }),
})

function mapSettingsProfileErrorToTRPC(error: SettingsProfileError): TRPCError {
  switch (error.kind) {
    case "profile_not_found":
      return new TRPCError({
        code: "NOT_FOUND",
        message: "Profile not found.",
      })
    case "invalid_profile":
    case "invalid_favorite_games":
      return new TRPCError({
        code: "BAD_REQUEST",
        message: error.message,
      })
    case "media_attachment_failed":
      return new TRPCError({
        code: "BAD_REQUEST",
        message: `Could not attach ${error.slot} media: ${error.reason}`,
      })
  }
}

function mapAccountDeletionErrorToTRPC(error: AccountDeletionError): TRPCError {
  switch (error.kind) {
    case "account_not_found":
      return new TRPCError({
        code: "NOT_FOUND",
        message: "Account not found.",
      })
    case "already_deleted":
      return new TRPCError({
        code: "CONFLICT",
        message: "This account has already been deleted.",
      })
    case "invalid_password":
      return new TRPCError({
        code: "BAD_REQUEST",
        message: "Password confirmation failed.",
      })
    case "owner_cannot_self_delete":
      return new TRPCError({
        code: "FORBIDDEN",
        message: "Owner accounts cannot be self-deleted.",
      })
    case "staff_cannot_self_delete":
      return new TRPCError({
        code: "FORBIDDEN",
        message: "Staff accounts cannot be self-deleted.",
      })
  }
}
