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
import {
  mapMediaServiceErrorToTRPC,
  mapMediaUploadGateErrorToTRPC,
} from "../transport/media-errors.js"
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
      if (!result.ok) throw mapMediaServiceErrorToTRPC(result.error)
      return result.value
    }),

  confirmUpload: protectedProcedure
    .input(z.object({ mediaId: mediaIdSchema }))
    .mutation(async ({ ctx, input }) => {
      const result = await mediaService.confirmUpload(
        input.mediaId,
        ctx.user.id
      )
      if (!result.ok) throw mapMediaServiceErrorToTRPC(result.error)
      return result.value
    }),

  retryUpload: protectedProcedure
    .input(z.object({ mediaId: mediaIdSchema }))
    .mutation(async ({ ctx, input }) => {
      const result = await mediaService.reissueUploadUrl(
        input.mediaId,
        ctx.user.id
      )
      if (!result.ok) throw mapMediaServiceErrorToTRPC(result.error)
      return result.value
    }),

  removeUpload: protectedProcedure
    .input(z.object({ mediaId: mediaIdSchema }))
    .mutation(async ({ ctx, input }) => {
      const result = await mediaService.abandonMedia(input.mediaId, ctx.user.id)
      if (!result.ok) throw mapMediaServiceErrorToTRPC(result.error)
      return result.value
    }),
})

async function assertCanUpload(
  ctx: Pick<Context, "session" | "accountLifecycle">,
  purpose: "post_attachment" | "profile_avatar" | "profile_banner"
) {
  const launchReadiness = await launchReadinessService.getReadiness()
  if (!launchReadiness.mediaUploadsEnabled) {
    throw mapMediaUploadGateErrorToTRPC({ kind: "launch_not_ready" })
  }

  const appUserState = await getCurrentAppUserState(ctx)
  if (appUserState.kind === "active_onboarded_profile") return
  if (
    appUserState.kind === "verified_profileless" &&
    purpose === "profile_avatar"
  ) {
    return
  }

  throw mapMediaUploadGateErrorToTRPC({ kind: "profile_required" })
}
