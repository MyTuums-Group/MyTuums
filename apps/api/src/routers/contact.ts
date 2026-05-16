import { z } from "zod"
import {
  CONTACT_EMAIL_MAX_LENGTH,
  CONTACT_MESSAGE_MAX_LENGTH,
} from "@workspace/types"
import { contactSubmissionService } from "../services/contact/index.js"
import { mapContactSubmitErrorToTRPC } from "../transport/contact-errors.js"
import { getRequestIp, getUserAgent } from "../transport/request-info.js"
import { setRetryAfterHeader } from "../transport/rate-limit.js"
import { publicProcedure, router } from "../trpc.js"

export const contactRouter = router({
  submit: publicProcedure
    .input(
      z.object({
        email: z.string().max(CONTACT_EMAIL_MAX_LENGTH).optional(),
        category: z.enum([
          "account_access",
          "moderation_or_safety",
          "privacy_or_data",
          "bug_report",
          "general_support",
          "other",
        ]),
        message: z.string().max(CONTACT_MESSAGE_MAX_LENGTH + 100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await contactSubmissionService.submit({
        viewer: ctx.session
          ? {
              userId: ctx.session.user.id,
              email: ctx.session.user.email,
            }
          : null,
        email: input.email,
        category: input.category,
        message: input.message,
        ipAddress: getRequestIp(ctx.req),
        userAgent: getUserAgent(ctx.req.headers["user-agent"]),
      })

      if (!result.ok) {
        if (result.error.kind === "rate_limited") {
          setRetryAfterHeader(ctx.reply, result.error.retryAfterSeconds)
        }
        throw mapContactSubmitErrorToTRPC(result.error)
      }

      return {
        id: result.value.id,
        emailStatus: result.value.emailStatus,
        retentionExpiresAt: result.value.retentionExpiresAt,
      }
    }),
})
