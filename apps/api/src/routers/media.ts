import { TRPCError } from "@trpc/server"
import { z } from "zod"
import type { Context } from "../context.js"
import { protectedProcedure, router } from "../trpc.js"
import { getCurrentAppUserState } from "../services/app-user-state/index.js"
import { launchReadinessService } from "../services/launch-readiness/launch-readiness.production.js"
import { mediaService } from "../services/media/media-service.production.js"
import {
  RATE_LIMIT_POLICIES,
  createUserRateLimitKey,
} from "../services/rate-limit/index.js"
import { enforceRateLimit } from "../transport/rate-limit.js"

const mediaIdSchema = z.string().uuid()

export const mediaRouter = router({
  createUpload: protectedProcedure
    .input(
      z.object({
        mimeType: z.string().min(1),
        byteSize: z.number().int().positive(),
        purpose: z
          .enum(["post_attachment", "profile_avatar", "profile_banner"])
          .default("post_attachment"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertCanUpload(ctx, input.purpose)
      await enforceRateLimit({
        key: createUserRateLimitKey(ctx.user.id),
        policy: RATE_LIMIT_POLICIES.uploadCreate,
        reply: ctx.reply,
        message: "Too many upload URL requests.",
      })
      const result = await mediaService.createUploadIntent(ctx.user.id, input)
      if (!result.ok) throw mediaError(result.error.kind)
      return result.value
    }),

  confirmUpload: protectedProcedure
    .input(z.object({ mediaId: mediaIdSchema }))
    .mutation(async ({ ctx, input }) => {
      const result = await mediaService.confirmUpload(
        input.mediaId,
        ctx.user.id
      )
      if (!result.ok) throw mediaError(result.error.kind)
      return result.value
    }),

  retryUpload: protectedProcedure
    .input(z.object({ mediaId: mediaIdSchema }))
    .mutation(async ({ ctx, input }) => {
      const result = await mediaService.reissueUploadUrl(
        input.mediaId,
        ctx.user.id
      )
      if (!result.ok) throw mediaError(result.error.kind)
      return result.value
    }),

  removeUpload: protectedProcedure
    .input(z.object({ mediaId: mediaIdSchema }))
    .mutation(async ({ ctx, input }) => {
      const result = await mediaService.abandonMedia(input.mediaId, ctx.user.id)
      if (!result.ok) throw mediaError(result.error.kind)
      return result.value
    }),
})

async function assertCanUpload(
  ctx: Pick<Context, "session" | "accountLifecycle">,
  purpose: "post_attachment" | "profile_avatar" | "profile_banner"
) {
  const launchReadiness = await launchReadinessService.getReadiness()
  if (!launchReadiness.mediaUploadsEnabled) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Media uploads are disabled until launch readiness gates pass.",
    })
  }

  const appUserState = await getCurrentAppUserState(ctx)
  if (appUserState.kind === "active_onboarded_profile") return
  if (
    appUserState.kind === "verified_profileless" &&
    purpose === "profile_avatar"
  ) {
    return
  }

  throw new TRPCError({
    code: "FORBIDDEN",
    message: "You need a verified onboarded profile to upload media.",
  })
}

function mediaError(kind: string): TRPCError {
  switch (kind) {
    case "invalid_mime_type":
    case "file_too_large":
    case "invalid_purpose":
    case "blob_size_mismatch":
    case "blob_type_mismatch":
      return new TRPCError({ code: "BAD_REQUEST", message: kind })
    case "media_not_found":
    case "blob_not_found":
      return new TRPCError({ code: "NOT_FOUND", message: kind })
    case "wrong_owner":
      return new TRPCError({ code: "FORBIDDEN", message: kind })
    case "media_not_pending":
    case "media_not_ready":
    case "media_expired":
    case "already_attached":
      return new TRPCError({ code: "CONFLICT", message: kind })
    default:
      return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: kind })
  }
}
