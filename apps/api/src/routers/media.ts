import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { env } from "@workspace/config";
import type { Context } from "../context.js";
import { protectedProcedure, router } from "../trpc.js";
import { getCurrentAppUserState } from "../services/app-user-state/index.js";
import { mediaService } from "../services/media/media-service.production.js";

const mediaIdSchema = z.string().uuid();

export const mediaRouter = router({
  createUpload: protectedProcedure
    .input(
      z.object({
        mimeType: z.string().min(1),
        byteSize: z.number().int().positive(),
        purpose: z
          .enum(["post_attachment", "profile_avatar", "profile_banner"])
          .default("post_attachment"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertCanUpload(ctx);
      const result = await mediaService.createUploadIntent(ctx.user.id, input);
      if (!result.ok) throw mediaError(result.error.kind);
      return result.value;
    }),

  confirmUpload: protectedProcedure
    .input(z.object({ mediaId: mediaIdSchema }))
    .mutation(async ({ ctx, input }) => {
      const result = await mediaService.confirmUpload(input.mediaId, ctx.user.id);
      if (!result.ok) throw mediaError(result.error.kind);
      return result.value;
    }),

  retryUpload: protectedProcedure
    .input(z.object({ mediaId: mediaIdSchema }))
    .mutation(async ({ ctx, input }) => {
      const result = await mediaService.reissueUploadUrl(input.mediaId, ctx.user.id);
      if (!result.ok) throw mediaError(result.error.kind);
      return result.value;
    }),

  removeUpload: protectedProcedure
    .input(z.object({ mediaId: mediaIdSchema }))
    .mutation(async ({ ctx, input }) => {
      const result = await mediaService.abandonMedia(input.mediaId, ctx.user.id);
      if (!result.ok) throw mediaError(result.error.kind);
      return result.value;
    }),
});

async function assertCanUpload(ctx: Pick<Context, "session" | "accountLifecycle">) {
  if (!env.MEDIA_UPLOADS_ENABLED) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Media uploads are disabled until launch readiness gates pass.",
    });
  }

  const appUserState = await getCurrentAppUserState(ctx);
  if (appUserState.kind !== "active_onboarded_profile") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You need a verified onboarded profile to upload media.",
    });
  }
}

function mediaError(kind: string): TRPCError {
  switch (kind) {
    case "invalid_mime_type":
    case "file_too_large":
    case "invalid_purpose":
    case "blob_size_mismatch":
    case "blob_type_mismatch":
      return new TRPCError({ code: "BAD_REQUEST", message: kind });
    case "media_not_found":
    case "blob_not_found":
      return new TRPCError({ code: "NOT_FOUND", message: kind });
    case "wrong_owner":
      return new TRPCError({ code: "FORBIDDEN", message: kind });
    case "media_not_pending":
    case "media_not_ready":
    case "media_expired":
    case "already_attached":
      return new TRPCError({ code: "CONFLICT", message: kind });
    default:
      return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: kind });
  }
}
