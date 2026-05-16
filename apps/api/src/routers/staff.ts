import { TRPCError } from "@trpc/server"
import { z } from "zod"
import type {
  ChangeRoleError,
  OwnerBootstrapError,
  StaffReadError,
  SuspendUserError,
} from "../services/staff/index.js"
import { staffService } from "../services/staff/staff.production.js"
import { protectedProcedure, router } from "../trpc.js"

const staffError = (
  error:
    | ChangeRoleError
    | SuspendUserError
    | OwnerBootstrapError
    | StaffReadError
): TRPCError => {
  switch (error.kind) {
    case "actor_not_found":
    case "invalid_secret":
      return new TRPCError({ code: "UNAUTHORIZED", message: error.kind })
    case "target_not_found":
    case "user_not_found":
      return new TRPCError({ code: "NOT_FOUND", message: error.kind })
    case "internal_notes_required":
      return new TRPCError({ code: "BAD_REQUEST", message: error.kind })
    case "user_not_verified":
    case "owner_already_exists":
    case "role_change_not_allowed":
    case "staff_access_not_allowed":
    case "suspension_not_allowed":
      return new TRPCError({ code: "FORBIDDEN", message: error.kind })
  }
}

export const staffRouter = router({
  searchUsers: protectedProcedure
    .input(
      z.object({
        query: z.string().max(100),
        limit: z.number().int().min(1).max(50).default(12),
      })
    )
    .query(async ({ ctx, input }) => {
      const result = await staffService.searchUsers({
        actorId: ctx.user.id,
        query: input.query,
        limit: input.limit,
      })
      if (!result.ok) throw staffError(result.error)
      return result.value
    }),

  getUser: protectedProcedure
    .input(
      z.object({
        targetUserId: z.string().min(1),
      })
    )
    .query(async ({ ctx, input }) => {
      const result = await staffService.getUser({
        actorId: ctx.user.id,
        targetUserId: input.targetUserId,
      })
      if (!result.ok) throw staffError(result.error)
      return result.value
    }),

  changeRole: protectedProcedure
    .input(
      z.object({
        targetUserId: z.string().min(1),
        newRole: z.enum(["user", "moderator", "admin"]),
        internalNotes: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await staffService.changeRole({
        actorId: ctx.user.id,
        targetUserId: input.targetUserId,
        newRole: input.newRole,
        internalNotes: input.internalNotes,
      })
      if (!result.ok) throw staffError(result.error)
      return result.value
    }),

  suspendUser: protectedProcedure
    .input(
      z.object({
        targetUserId: z.string().min(1),
        duration: z.enum(["24h", "7d", "30d", "indefinite"]),
        internalNotes: z.string().min(1),
        publicReason: z.string().min(1).max(80),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await staffService.suspendUser({
        actorId: ctx.user.id,
        targetUserId: input.targetUserId,
        duration: input.duration,
        internalNotes: input.internalNotes,
        publicReason: input.publicReason,
      })
      if (!result.ok) throw staffError(result.error)
      return result.value
    }),

  confirmUnderage: protectedProcedure
    .input(
      z.object({
        targetUserId: z.string().min(1),
        internalNotes: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await staffService.confirmUnderage({
        actorId: ctx.user.id,
        targetUserId: input.targetUserId,
        internalNotes: input.internalNotes,
      })
      if (!result.ok) throw staffError(result.error)
      return result.value
    }),

  unsuspendUser: protectedProcedure
    .input(
      z.object({
        targetUserId: z.string().min(1),
        internalNotes: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await staffService.unsuspendUser({
        actorId: ctx.user.id,
        targetUserId: input.targetUserId,
        internalNotes: input.internalNotes,
      })
      if (!result.ok) throw staffError(result.error)
      return result.value
    }),
})
