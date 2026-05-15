import { z } from "zod";
import { CONTACT_EMAIL_MAX_LENGTH, CONTACT_MESSAGE_MAX_LENGTH } from "@workspace/types";
import { contactSubmissionService } from "../services/contact/index.js";
import { mapContactSubmitErrorToTRPC } from "../transport/contact-errors.js";
import { publicProcedure, router } from "../trpc.js";

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
      }),
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
      });

      if (!result.ok) {
        throw mapContactSubmitErrorToTRPC(result.error);
      }

      return {
        id: result.value.id,
        emailStatus: result.value.emailStatus,
        retentionExpiresAt: result.value.retentionExpiresAt,
      };
    }),
});

function getRequestIp(req: { ip?: string; headers: Record<string, unknown> }) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim().length > 0) {
    return forwarded.split(",")[0]?.trim() ?? null;
  }

  return req.ip ?? null;
}

function getUserAgent(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}
