import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  MODERATION_ACTIONS,
  PUBLIC_REMOVAL_REASONS,
  REPORT_REASONS,
  moderationService,
} from "../services/moderation/index.js";
import type {
  ModerationCaseCommandError,
  SubmitReportError,
} from "../services/moderation/index.js";
import { protectedProcedure, router } from "../trpc.js";

const reportReasonSchema = z.enum(REPORT_REASONS);
const publicRemovalReasonSchema = z.enum(PUBLIC_REMOVAL_REASONS);
const moderationActionSchema = z.enum(MODERATION_ACTIONS);

const reportTargetSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("post"),
    publicId: z.string().min(8).max(64),
  }),
  z.object({
    type: z.literal("comment"),
    commentId: z.string().uuid(),
  }),
  z.object({
    type: z.literal("profile"),
    username: z.string().min(1).max(80),
  }),
]);

export const moderationRouter = router({
  submitReport: protectedProcedure
    .input(
      z.object({
        target: reportTargetSchema,
        reason: reportReasonSchema,
        notes: z.string().max(2000).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await moderationService.submitReport({
        reporterId: ctx.user.id,
        target: input.target,
        reason: input.reason,
        notes: input.notes ?? null,
      });

      if (!result.ok) {
        throw mapSubmitReportErrorToTRPC(result.error);
      }

      return {
        id: result.value.id,
        targetType: result.value.targetType,
        reason: result.value.reason,
        createdAt: result.value.createdAt,
      };
    }),

  listCases: protectedProcedure.query(async ({ ctx }) => {
    const result = await moderationService.listCases({ actorId: ctx.user.id });
    if (!result.ok) {
      throw mapCaseCommandErrorToTRPC(result.error);
    }
    return result.value;
  }),

  getCase: protectedProcedure
    .input(z.object({ caseId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const result = await moderationService.getCase({
        actorId: ctx.user.id,
        caseId: input.caseId,
      });
      if (!result.ok) {
        throw mapCaseCommandErrorToTRPC(result.error);
      }
      return result.value;
    }),

  claimCase: protectedProcedure
    .input(z.object({ caseId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const result = await moderationService.claimCase({
        actorId: ctx.user.id,
        caseId: input.caseId,
      });
      if (!result.ok) {
        throw mapCaseCommandErrorToTRPC(result.error);
      }
      return result.value;
    }),

  assignCase: protectedProcedure
    .input(
      z.object({
        caseId: z.string().uuid(),
        assigneeId: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await moderationService.assignCase({
        actorId: ctx.user.id,
        caseId: input.caseId,
        assigneeId: input.assigneeId,
      });
      if (!result.ok) {
        throw mapCaseCommandErrorToTRPC(result.error);
      }
      return result.value;
    }),

  unassignCase: protectedProcedure
    .input(z.object({ caseId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const result = await moderationService.unassignCase({
        actorId: ctx.user.id,
        caseId: input.caseId,
      });
      if (!result.ok) {
        throw mapCaseCommandErrorToTRPC(result.error);
      }
      return result.value;
    }),

  dismissCase: protectedProcedure
    .input(
      z.object({
        caseId: z.string().uuid(),
        reason: reportReasonSchema,
        internalNotes: z.string().max(4000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await moderationService.dismissCase({
        actorId: ctx.user.id,
        caseId: input.caseId,
        reason: input.reason,
        internalNotes: input.internalNotes,
      });
      if (!result.ok) {
        throw mapCaseCommandErrorToTRPC(result.error);
      }
      return result.value;
    }),

  actionCase: protectedProcedure
    .input(
      z.object({
        caseId: z.string().uuid(),
        action: moderationActionSchema,
        reason: reportReasonSchema,
        publicReason: publicRemovalReasonSchema.nullable().optional(),
        internalNotes: z.string().max(4000),
        expectedTargetUpdatedAt: z.coerce.date().nullable().optional(),
        conflictOverride: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await moderationService.actionCase({
        actorId: ctx.user.id,
        caseId: input.caseId,
        action: input.action,
        reason: input.reason,
        publicReason: input.publicReason ?? null,
        internalNotes: input.internalNotes,
        expectedTargetUpdatedAt: input.expectedTargetUpdatedAt ?? null,
        conflictOverride: input.conflictOverride ?? false,
      });
      if (!result.ok) {
        throw mapCaseCommandErrorToTRPC(result.error);
      }
      return result.value;
    }),
});

function mapSubmitReportErrorToTRPC(error: SubmitReportError): TRPCError {
  switch (error.kind) {
    case "reporter_not_found":
      return new TRPCError({
        code: "UNAUTHORIZED",
        message: "Authentication required.",
      });
    case "target_not_found":
    case "target_not_visible":
      return new TRPCError({
        code: "NOT_FOUND",
        message: "This report target is not available.",
      });
    case "duplicate_report":
      return new TRPCError({
        code: "CONFLICT",
        message: "You already have an active report for this target.",
      });
  }
}

function mapCaseCommandErrorToTRPC(
  error: ModerationCaseCommandError,
): TRPCError {
  switch (error.kind) {
    case "forbidden":
      return new TRPCError({
        code: "FORBIDDEN",
        message: "This moderation tool is not available.",
      });
    case "case_not_found":
    case "target_not_found":
      return new TRPCError({
        code: "NOT_FOUND",
        message: "This moderation case is not available.",
      });
    case "assignee_not_found":
      return new TRPCError({
        code: "BAD_REQUEST",
        message: "Assignee must be a staff user.",
      });
    case "internal_notes_required":
      return new TRPCError({
        code: "BAD_REQUEST",
        message: "Internal notes are required.",
      });
    case "public_reason_required":
      return new TRPCError({
        code: "BAD_REQUEST",
        message: "A public reason is required for removal actions.",
      });
    case "invalid_action_for_target":
      return new TRPCError({
        code: "BAD_REQUEST",
        message: "That moderation action cannot be used for this target.",
      });
    case "target_conflict":
      return new TRPCError({
        code: "CONFLICT",
        message: "The target changed since this case was loaded.",
      });
  }
}
