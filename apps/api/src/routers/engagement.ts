import { z } from "zod"
import { authorization } from "../authorization/index.js"
import {
  blockUser,
  getProfileEngagement,
  toggleCommentLike,
  toggleFollow,
  togglePostLike,
  unblockUser,
} from "../services/engagement/index.js"
import { postPublicIdSchema } from "../services/post/presentation.js"
import { getOwnerByUsername } from "../services/profile/index.js"
import {
  mapBlockUserErrorToTRPC,
  mapProfileEngagementUnavailableToTRPC,
  mapToggleFollowErrorToTRPC,
  mapToggleLikeErrorToTRPC,
} from "../transport/engagement-errors.js"
import { mapProfileAccessErrorToTRPC } from "../transport/profile-errors.js"
import { protectedProcedure, router } from "../trpc.js"

export const engagementRouter = router({
  profileState: protectedProcedure
    .input(z.object({ username: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const viewer = await authorization.getViewerContext({
        userId: ctx.user.id,
      })
      const owner = await getOwnerByUsername(
        input.username,
        viewer,
        authorization
      )
      if (!owner.ok) {
        throw mapProfileAccessErrorToTRPC(owner.error)
      }

      const state = await getProfileEngagement({
        viewerId: ctx.user.id,
        targetUserId: owner.value.userId,
      })

      if (!state) {
        throw mapProfileEngagementUnavailableToTRPC()
      }

      return {
        followerCount: state.followerCount,
        followingCount: state.followingCount,
        isFollowing: state.isFollowing,
        isBlocked: state.isBlocked,
      }
    }),

  togglePostLike: protectedProcedure
    .input(z.object({ publicId: postPublicIdSchema }))
    .mutation(async ({ ctx, input }) => {
      const result = await togglePostLike({
        actorId: ctx.user.id,
        publicId: input.publicId,
      })
      if (!result.ok) {
        throw mapToggleLikeErrorToTRPC(result.error)
      }
      return result.value
    }),

  toggleCommentLike: protectedProcedure
    .input(z.object({ commentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const result = await toggleCommentLike({
        actorId: ctx.user.id,
        commentId: input.commentId,
      })
      if (!result.ok) {
        throw mapToggleLikeErrorToTRPC(result.error)
      }
      return result.value
    }),

  toggleFollow: protectedProcedure
    .input(z.object({ username: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const viewer = await authorization.getViewerContext({
        userId: ctx.user.id,
      })
      const owner = await getOwnerByUsername(
        input.username,
        viewer,
        authorization
      )
      if (!owner.ok) {
        throw mapProfileAccessErrorToTRPC(owner.error)
      }

      const result = await toggleFollow({
        followerId: ctx.user.id,
        followedId: owner.value.userId,
      })
      if (!result.ok) {
        throw mapToggleFollowErrorToTRPC(result.error)
      }
      return result.value
    }),

  blockUser: protectedProcedure
    .input(z.object({ username: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const owner = await getOwnerByUsername(
        input.username,
        null,
        authorization
      )
      if (!owner.ok) {
        throw mapProfileAccessErrorToTRPC(owner.error)
      }

      const result = await blockUser({
        blockerId: ctx.user.id,
        blockedId: owner.value.userId,
      })
      if (!result.ok) {
        throw mapBlockUserErrorToTRPC(result.error)
      }
      return result.value
    }),

  unblockUser: protectedProcedure
    .input(z.object({ username: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const owner = await getOwnerByUsername(
        input.username,
        null,
        authorization
      )
      if (!owner.ok) {
        throw mapProfileAccessErrorToTRPC(owner.error)
      }

      const result = await unblockUser({
        blockerId: ctx.user.id,
        blockedId: owner.value.userId,
      })
      if (!result.ok) {
        throw mapBlockUserErrorToTRPC(result.error)
      }
      return result.value
    }),
})
