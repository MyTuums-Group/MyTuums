import { z } from "zod"
import {
  list,
  markAllRead,
  markRead,
  unreadCount,
} from "../services/notification/index.js"
import { mapNotificationMarkReadErrorToTRPC } from "../transport/notification-errors.js"
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
        throw mapNotificationMarkReadErrorToTRPC(result.error)
      }

      return result.value
    }),

  markAllRead: protectedProcedure.mutation(({ ctx }) =>
    markAllRead({ recipientId: ctx.user.id })
  ),
})
