import { z } from "zod"
import { staffService } from "../services/staff/staff.production.js"
import { mapStaffErrorToTRPC } from "../transport/staff-errors.js"
import { protectedProcedure, router } from "../trpc.js"

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
      if (!result.ok) throw mapStaffErrorToTRPC(result.error)
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
      if (!result.ok) throw mapStaffErrorToTRPC(result.error)
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
      if (!result.ok) throw mapStaffErrorToTRPC(result.error)
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
      if (!result.ok) throw mapStaffErrorToTRPC(result.error)
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
      if (!result.ok) throw mapStaffErrorToTRPC(result.error)
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
      if (!result.ok) throw mapStaffErrorToTRPC(result.error)
      return result.value
    }),
})
