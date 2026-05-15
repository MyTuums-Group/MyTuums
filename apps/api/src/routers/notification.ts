import { TRPCError } from "@trpc/server"
import { z } from "zod"
import {
  list,
  markAllRead,
  markRead,
  unreadCount,
} from "../services/notification/index.js"
import { protectedProcedure, router } from "../trpc.js"

export const notificationRouter = router({
  list: protectedProcedure.query(({ ctx }) =>
    list({ recipientId: ctx.user.id })
  ),

  unreadCount: protectedProcedure.query(({ ctx }) =>
    unreadCount({ recipientId: ctx.user.id })
  ),

  markRead: protectedProcedure
    .input(z.object({ notificationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const result = await markRead({
        recipientId: ctx.user.id,
        notificationId: input.notificationId,
      })

      if (!result.ok) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Notification not found.",
        })
      }

      return result.value
    }),

  markAllRead: protectedProcedure.mutation(({ ctx }) =>
    markAllRead({ recipientId: ctx.user.id })
  ),
})
