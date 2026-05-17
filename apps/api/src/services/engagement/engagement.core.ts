import type { NotificationType, Result } from "@workspace/types"
import {
  emitOperationalEvent,
  noopOperationalEventLogger,
  type OperationalEventLogger,
} from "../operational-events.js"

export type EngagementPostRow = {
  id: string
  publicId: string
  authorId: string
  likeCount: number
  deletedAt: Date | null
  removedAt: Date | null
}

export type EngagementCommentRow = {
  id: string
  postId: string
  authorId: string
  likeCount: number
  deletedAt: Date | null
  removedAt: Date | null
}

export type EngagementProfileRow = {
  userId: string
  followerCount: number
  followingCount: number
}

export type PostLikeRow = {
  userId: string
  postId: string
}

export type CommentLikeRow = {
  userId: string
  commentId: string
}

export type FollowRow = {
  followerId: string
  followedId: string
}

export type BlockRow = {
  blockerId: string
  blockedId: string
}

export type EngagementNotificationRow = {
  recipientId: string
  type: NotificationType
  actorId: string | null
  data: Record<string, unknown>
  isRead: boolean
}

export type TogglePostLikeError =
  | { kind: "not_found" }
  | { kind: "not_available" }
  | { kind: "blocked" }

export type TogglePostLikeOutput = {
  publicId: string
  liked: boolean
  likeCount: number
}

export type ToggleCommentLikeError =
  | { kind: "not_found" }
  | { kind: "not_available" }
  | { kind: "blocked" }

export type ToggleCommentLikeOutput = {
  commentId: string
  liked: boolean
  likeCount: number
}

export type ToggleFollowError =
  | { kind: "not_found" }
  | { kind: "self_follow" }
  | { kind: "blocked" }

export type ToggleFollowOutput = {
  followedId: string
  following: boolean
  followerCount: number
  followingCount: number
}

export type BlockUserError = { kind: "not_found" } | { kind: "self_block" }

export type BlockUserOutput = {
  blockedId: string
  blocked: true
  removedFollowCount: number
}

export type UnblockUserOutput = {
  blockedId: string
  blocked: false
}

export type ProfileEngagementState = {
  targetUserId: string
  followerCount: number
  followingCount: number
  isFollowing: boolean
  isBlocked: boolean
}

export type EngagementService = {
  togglePostLike(input: {
    actorId: string
    publicId: string
  }): Promise<Result<TogglePostLikeOutput, TogglePostLikeError>>
  toggleCommentLike(input: {
    actorId: string
    commentId: string
  }): Promise<Result<ToggleCommentLikeOutput, ToggleCommentLikeError>>
  toggleFollow(input: {
    followerId: string
    followedId: string
  }): Promise<Result<ToggleFollowOutput, ToggleFollowError>>
  blockUser(input: {
    blockerId: string
    blockedId: string
  }): Promise<Result<BlockUserOutput, BlockUserError>>
  unblockUser(input: {
    blockerId: string
    blockedId: string
  }): Promise<Result<UnblockUserOutput, BlockUserError>>
  listVisibleNotifications(input: {
    recipientId: string
  }): Promise<EngagementNotificationRow[]>
  countUnreadNotifications(input: { recipientId: string }): Promise<number>
}

export type InMemoryEngagementState = {
  posts: EngagementPostRow[]
  comments: EngagementCommentRow[]
  profiles: EngagementProfileRow[]
  postLikes: PostLikeRow[]
  commentLikes: CommentLikeRow[]
  follows: FollowRow[]
  blocks: BlockRow[]
  notifications: EngagementNotificationRow[]
}

export function createInMemoryEngagementService(
  state: InMemoryEngagementState,
  logger: OperationalEventLogger = noopOperationalEventLogger
): EngagementService & { snapshot(): InMemoryEngagementState } {
  return {
    async togglePostLike(input) {
      await Promise.resolve()
      const post = state.posts.find((row) => row.publicId === input.publicId)
      if (!post) return { ok: false, error: { kind: "not_found" } }
      if (post.deletedAt || post.removedAt) {
        return { ok: false, error: { kind: "not_available" } }
      }
      if (isBlockedPair(state.blocks, input.actorId, post.authorId)) {
        return { ok: false, error: { kind: "blocked" } }
      }

      const existingIndex = state.postLikes.findIndex(
        (like) => like.userId === input.actorId && like.postId === post.id
      )

      if (existingIndex >= 0) {
        state.postLikes.splice(existingIndex, 1)
        post.likeCount = Math.max(0, post.likeCount - 1)
        return {
          ok: true,
          value: {
            publicId: post.publicId,
            liked: false,
            likeCount: post.likeCount,
          },
        }
      }

      state.postLikes.push({ userId: input.actorId, postId: post.id })
      post.likeCount += 1

      if (input.actorId !== post.authorId) {
        addNotificationOnce(state.notifications, {
          recipientId: post.authorId,
          type: "post_like",
          actorId: input.actorId,
          data: { postId: post.id },
          isRead: false,
        })
      }

      return {
        ok: true,
        value: {
          publicId: post.publicId,
          liked: true,
          likeCount: post.likeCount,
        },
      }
    },

    async toggleCommentLike(input) {
      await Promise.resolve()
      const comment = state.comments.find((row) => row.id === input.commentId)
      if (!comment) return { ok: false, error: { kind: "not_found" } }
      if (comment.deletedAt || comment.removedAt) {
        return { ok: false, error: { kind: "not_available" } }
      }
      if (isBlockedPair(state.blocks, input.actorId, comment.authorId)) {
        return { ok: false, error: { kind: "blocked" } }
      }

      const existingIndex = state.commentLikes.findIndex(
        (like) => like.userId === input.actorId && like.commentId === comment.id
      )

      if (existingIndex >= 0) {
        state.commentLikes.splice(existingIndex, 1)
        comment.likeCount = Math.max(0, comment.likeCount - 1)
        return {
          ok: true,
          value: {
            commentId: comment.id,
            liked: false,
            likeCount: comment.likeCount,
          },
        }
      }

      state.commentLikes.push({
        userId: input.actorId,
        commentId: comment.id,
      })
      comment.likeCount += 1

      if (input.actorId !== comment.authorId) {
        addNotificationOnce(state.notifications, {
          recipientId: comment.authorId,
          type: "comment_like",
          actorId: input.actorId,
          data: { commentId: comment.id, postId: comment.postId },
          isRead: false,
        })
      }

      return {
        ok: true,
        value: {
          commentId: comment.id,
          liked: true,
          likeCount: comment.likeCount,
        },
      }
    },

    async toggleFollow(input) {
      await Promise.resolve()
      if (input.followerId === input.followedId) {
        return { ok: false, error: { kind: "self_follow" } }
      }

      const follower = findProfile(state.profiles, input.followerId)
      const followed = findProfile(state.profiles, input.followedId)
      if (!follower || !followed) {
        return { ok: false, error: { kind: "not_found" } }
      }
      if (isBlockedPair(state.blocks, input.followerId, input.followedId)) {
        return { ok: false, error: { kind: "blocked" } }
      }

      const existingIndex = state.follows.findIndex(
        (follow) =>
          follow.followerId === input.followerId &&
          follow.followedId === input.followedId
      )

      if (existingIndex >= 0) {
        state.follows.splice(existingIndex, 1)
        follower.followingCount = Math.max(0, follower.followingCount - 1)
        followed.followerCount = Math.max(0, followed.followerCount - 1)
        return {
          ok: true,
          value: {
            followedId: followed.userId,
            following: false,
            followerCount: followed.followerCount,
            followingCount: follower.followingCount,
          },
        }
      }

      state.follows.push({
        followerId: input.followerId,
        followedId: input.followedId,
      })
      follower.followingCount += 1
      followed.followerCount += 1
      addNotificationOnce(state.notifications, {
        recipientId: input.followedId,
        type: "follow",
        actorId: input.followerId,
        data: { followerId: input.followerId },
        isRead: false,
      })

      await emitOperationalEvent(logger, {
        event: "follow_created",
        followerId: input.followerId,
        followedId: input.followedId,
        status: "following",
      })

      return {
        ok: true,
        value: {
          followedId: followed.userId,
          following: true,
          followerCount: followed.followerCount,
          followingCount: follower.followingCount,
        },
      }
    },

    async blockUser(input) {
      await Promise.resolve()
      if (input.blockerId === input.blockedId) {
        return { ok: false, error: { kind: "self_block" } }
      }

      const blocker = findProfile(state.profiles, input.blockerId)
      const blocked = findProfile(state.profiles, input.blockedId)
      if (!blocker || !blocked) {
        return { ok: false, error: { kind: "not_found" } }
      }

      const hasBlock = state.blocks.some(
        (block) =>
          block.blockerId === input.blockerId &&
          block.blockedId === input.blockedId
      )

      if (!hasBlock) {
        state.blocks.push({
          blockerId: input.blockerId,
          blockedId: input.blockedId,
        })
      }

      const removedFollowCount = removeFollowEdges(state, [
        {
          followerId: input.blockerId,
          followedId: input.blockedId,
        },
        {
          followerId: input.blockedId,
          followedId: input.blockerId,
        },
      ])

      return {
        ok: true,
        value: {
          blockedId: input.blockedId,
          blocked: true,
          removedFollowCount,
        },
      }
    },

    async unblockUser(input) {
      await Promise.resolve()
      if (input.blockerId === input.blockedId) {
        return { ok: false, error: { kind: "self_block" } }
      }

      const blocker = findProfile(state.profiles, input.blockerId)
      const blocked = findProfile(state.profiles, input.blockedId)
      if (!blocker || !blocked) {
        return { ok: false, error: { kind: "not_found" } }
      }

      state.blocks = state.blocks.filter(
        (block) =>
          !(
            block.blockerId === input.blockerId &&
            block.blockedId === input.blockedId
          )
      )

      return {
        ok: true,
        value: {
          blockedId: input.blockedId,
          blocked: false,
        },
      }
    },

    async listVisibleNotifications(input) {
      await Promise.resolve()
      return visibleNotifications(state, input.recipientId).map((row) => ({
        ...row,
        data: { ...row.data },
      }))
    },

    async countUnreadNotifications(input) {
      await Promise.resolve()
      return visibleNotifications(state, input.recipientId).filter(
        (notification) => !notification.isRead
      ).length
    },

    snapshot() {
      return {
        posts: state.posts.map((row) => ({ ...row })),
        comments: state.comments.map((row) => ({ ...row })),
        profiles: state.profiles.map((row) => ({ ...row })),
        postLikes: state.postLikes.map((row) => ({ ...row })),
        commentLikes: state.commentLikes.map((row) => ({ ...row })),
        follows: state.follows.map((row) => ({ ...row })),
        blocks: state.blocks.map((row) => ({ ...row })),
        notifications: state.notifications.map((row) => ({
          ...row,
          data: { ...row.data },
        })),
      }
    },
  }
}

function findProfile(
  profiles: EngagementProfileRow[],
  userId: string
): EngagementProfileRow | undefined {
  return profiles.find((profile) => profile.userId === userId)
}

function removeFollowEdges(
  state: InMemoryEngagementState,
  edges: FollowRow[]
): number {
  let removedCount = 0

  for (const edge of edges) {
    const existingIndex = state.follows.findIndex(
      (follow) =>
        follow.followerId === edge.followerId &&
        follow.followedId === edge.followedId
    )
    if (existingIndex === -1) continue

    state.follows.splice(existingIndex, 1)
    removedCount += 1

    const follower = findProfile(state.profiles, edge.followerId)
    const followed = findProfile(state.profiles, edge.followedId)
    if (follower) {
      follower.followingCount = Math.max(0, follower.followingCount - 1)
    }
    if (followed) {
      followed.followerCount = Math.max(0, followed.followerCount - 1)
    }
  }

  return removedCount
}

function addNotificationOnce(
  notifications: EngagementNotificationRow[],
  notification: EngagementNotificationRow
): void {
  const exists = notifications.some((row) =>
    sameNotificationNaturalKey(row, notification)
  )
  if (!exists) notifications.push(notification)
}

function sameNotificationNaturalKey(
  left: EngagementNotificationRow,
  right: EngagementNotificationRow
): boolean {
  if (
    left.recipientId !== right.recipientId ||
    left.type !== right.type ||
    left.actorId !== right.actorId
  ) {
    return false
  }

  switch (left.type) {
    case "follow":
      return true
    case "post_like":
      return left.data.postId === right.data.postId
    case "comment_like":
      return left.data.commentId === right.data.commentId
    case "post_comment":
      return left.data.commentId === right.data.commentId
    case "content_removed":
      return left.data.moderationActionId === right.data.moderationActionId
  }
}

function visibleNotifications(
  state: InMemoryEngagementState,
  recipientId: string
): EngagementNotificationRow[] {
  const rows = state.notifications.filter(
    (notification) => notification.recipientId === recipientId
  )

  for (const row of rows) {
    if (row.actorId && isBlockedPair(state.blocks, recipientId, row.actorId)) {
      row.isRead = true
    }
  }

  return rows.filter(
    (notification) =>
      !notification.actorId ||
      !isBlockedPair(state.blocks, recipientId, notification.actorId)
  )
}

function isBlockedPair(
  blocks: BlockRow[],
  leftUserId: string,
  rightUserId: string
): boolean {
  return blocks.some(
    (block) =>
      (block.blockerId === leftUserId && block.blockedId === rightUserId) ||
      (block.blockerId === rightUserId && block.blockedId === leftUserId)
  )
}
