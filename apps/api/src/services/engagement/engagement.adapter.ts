import { and, eq, inArray, or, sql } from "drizzle-orm"
import {
  block,
  comment,
  commentLike,
  db,
  follow,
  notification,
  post,
  postLike,
  profile,
} from "@workspace/db"
import type {
  BlockUserError,
  BlockUserOutput,
  EngagementNotificationRow,
  ProfileEngagementState,
  ToggleCommentLikeError,
  ToggleCommentLikeOutput,
  ToggleFollowError,
  ToggleFollowOutput,
  TogglePostLikeError,
  TogglePostLikeOutput,
  UnblockUserOutput,
} from "./engagement.core.js"
import type { Result } from "@workspace/types"

export async function togglePostLike(input: {
  actorId: string
  publicId: string
}): Promise<Result<TogglePostLikeOutput, TogglePostLikeError>> {
  return db.transaction(async (tx) => {
    const [target] = await tx
      .select({
        id: post.id,
        publicId: post.publicId,
        authorId: post.authorId,
        likeCount: post.likeCount,
        deletedAt: post.deletedAt,
        removedAt: post.removedAt,
      })
      .from(post)
      .where(eq(post.publicId, input.publicId))
      .limit(1)

    if (!target) return { ok: false, error: { kind: "not_found" } }
    if (target.deletedAt || target.removedAt) {
      return { ok: false, error: { kind: "not_available" } }
    }
    if (await hasBlockedPair(tx, input.actorId, target.authorId)) {
      return { ok: false, error: { kind: "blocked" } }
    }

    const [existing] = await tx
      .select({ postId: postLike.postId })
      .from(postLike)
      .where(
        and(eq(postLike.userId, input.actorId), eq(postLike.postId, target.id))
      )
      .limit(1)

    if (existing) {
      await tx
        .delete(postLike)
        .where(
          and(
            eq(postLike.userId, input.actorId),
            eq(postLike.postId, target.id)
          )
        )

      const [updated] = await tx
        .update(post)
        .set({
          likeCount: sql<number>`greatest(${post.likeCount} - 1, 0)`,
          updatedAt: new Date(),
        })
        .where(eq(post.id, target.id))
        .returning({ likeCount: post.likeCount })

      return {
        ok: true,
        value: {
          publicId: target.publicId,
          liked: false,
          likeCount: updated?.likeCount ?? Math.max(0, target.likeCount - 1),
        },
      }
    }

    await tx.insert(postLike).values({
      userId: input.actorId,
      postId: target.id,
    })

    const [updated] = await tx
      .update(post)
      .set({
        likeCount: sql<number>`${post.likeCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(post.id, target.id))
      .returning({ likeCount: post.likeCount })

    if (input.actorId !== target.authorId) {
      await tx
        .insert(notification)
        .values({
          recipientId: target.authorId,
          type: "post_like",
          actorId: input.actorId,
          data: { postId: target.id },
        })
        .onConflictDoNothing()
    }

    return {
      ok: true,
      value: {
        publicId: target.publicId,
        liked: true,
        likeCount: updated?.likeCount ?? target.likeCount + 1,
      },
    }
  })
}

export async function toggleCommentLike(input: {
  actorId: string
  commentId: string
}): Promise<Result<ToggleCommentLikeOutput, ToggleCommentLikeError>> {
  return db.transaction(async (tx) => {
    const [target] = await tx
      .select({
        id: comment.id,
        postId: comment.postId,
        authorId: comment.authorId,
        likeCount: comment.likeCount,
        deletedAt: comment.deletedAt,
        removedAt: comment.removedAt,
      })
      .from(comment)
      .where(eq(comment.id, input.commentId))
      .limit(1)

    if (!target) return { ok: false, error: { kind: "not_found" } }
    if (target.deletedAt || target.removedAt) {
      return { ok: false, error: { kind: "not_available" } }
    }
    if (await hasBlockedPair(tx, input.actorId, target.authorId)) {
      return { ok: false, error: { kind: "blocked" } }
    }

    const [existing] = await tx
      .select({ commentId: commentLike.commentId })
      .from(commentLike)
      .where(
        and(
          eq(commentLike.userId, input.actorId),
          eq(commentLike.commentId, target.id)
        )
      )
      .limit(1)

    if (existing) {
      await tx
        .delete(commentLike)
        .where(
          and(
            eq(commentLike.userId, input.actorId),
            eq(commentLike.commentId, target.id)
          )
        )

      const [updated] = await tx
        .update(comment)
        .set({
          likeCount: sql<number>`greatest(${comment.likeCount} - 1, 0)`,
          updatedAt: new Date(),
        })
        .where(eq(comment.id, target.id))
        .returning({ likeCount: comment.likeCount })

      return {
        ok: true,
        value: {
          commentId: target.id,
          liked: false,
          likeCount: updated?.likeCount ?? Math.max(0, target.likeCount - 1),
        },
      }
    }

    await tx.insert(commentLike).values({
      userId: input.actorId,
      commentId: target.id,
    })

    const [updated] = await tx
      .update(comment)
      .set({
        likeCount: sql<number>`${comment.likeCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(comment.id, target.id))
      .returning({ likeCount: comment.likeCount })

    if (input.actorId !== target.authorId) {
      await tx
        .insert(notification)
        .values({
          recipientId: target.authorId,
          type: "comment_like",
          actorId: input.actorId,
          data: { commentId: target.id, postId: target.postId },
        })
        .onConflictDoNothing()
    }

    return {
      ok: true,
      value: {
        commentId: target.id,
        liked: true,
        likeCount: updated?.likeCount ?? target.likeCount + 1,
      },
    }
  })
}

export async function toggleFollow(input: {
  followerId: string
  followedId: string
}): Promise<Result<ToggleFollowOutput, ToggleFollowError>> {
  return db.transaction(async (tx) => {
    if (input.followerId === input.followedId) {
      return { ok: false, error: { kind: "self_follow" } }
    }

    const follower = await findProfileByUserId(tx, input.followerId)
    const followed = await findProfileByUserId(tx, input.followedId)
    if (!follower || !followed) {
      return { ok: false, error: { kind: "not_found" } }
    }
    if (await hasBlockedPair(tx, input.followerId, input.followedId)) {
      return { ok: false, error: { kind: "blocked" } }
    }

    const [existing] = await tx
      .select({ followerId: follow.followerId })
      .from(follow)
      .where(
        and(
          eq(follow.followerId, input.followerId),
          eq(follow.followedId, input.followedId)
        )
      )
      .limit(1)

    if (existing) {
      await tx
        .delete(follow)
        .where(
          and(
            eq(follow.followerId, input.followerId),
            eq(follow.followedId, input.followedId)
          )
        )

      const [updatedFollower] = await tx
        .update(profile)
        .set({
          followingCount: sql<number>`greatest(${profile.followingCount} - 1, 0)`,
          updatedAt: new Date(),
        })
        .where(eq(profile.userId, input.followerId))
        .returning({ followingCount: profile.followingCount })
      const [updatedFollowed] = await tx
        .update(profile)
        .set({
          followerCount: sql<number>`greatest(${profile.followerCount} - 1, 0)`,
          updatedAt: new Date(),
        })
        .where(eq(profile.userId, input.followedId))
        .returning({ followerCount: profile.followerCount })

      return {
        ok: true,
        value: {
          followedId: input.followedId,
          following: false,
          followerCount:
            updatedFollowed?.followerCount ??
            Math.max(0, followed.followerCount - 1),
          followingCount:
            updatedFollower?.followingCount ??
            Math.max(0, follower.followingCount - 1),
        },
      }
    }

    await tx.insert(follow).values({
      followerId: input.followerId,
      followedId: input.followedId,
    })

    const [updatedFollower] = await tx
      .update(profile)
      .set({
        followingCount: sql<number>`${profile.followingCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(profile.userId, input.followerId))
      .returning({ followingCount: profile.followingCount })
    const [updatedFollowed] = await tx
      .update(profile)
      .set({
        followerCount: sql<number>`${profile.followerCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(profile.userId, input.followedId))
      .returning({ followerCount: profile.followerCount })

    await tx
      .insert(notification)
      .values({
        recipientId: input.followedId,
        type: "follow",
        actorId: input.followerId,
        data: { followerId: input.followerId },
      })
      .onConflictDoNothing()

    return {
      ok: true,
      value: {
        followedId: input.followedId,
        following: true,
        followerCount:
          updatedFollowed?.followerCount ?? followed.followerCount + 1,
        followingCount:
          updatedFollower?.followingCount ?? follower.followingCount + 1,
      },
    }
  })
}

export async function blockUser(input: {
  blockerId: string
  blockedId: string
}): Promise<Result<BlockUserOutput, BlockUserError>> {
  return db.transaction(async (tx) => {
    if (input.blockerId === input.blockedId) {
      return { ok: false, error: { kind: "self_block" } }
    }

    const blocker = await findProfileByUserId(tx, input.blockerId)
    const blocked = await findProfileByUserId(tx, input.blockedId)
    if (!blocker || !blocked) {
      return { ok: false, error: { kind: "not_found" } }
    }

    await tx
      .insert(block)
      .values({
        blockerId: input.blockerId,
        blockedId: input.blockedId,
      })
      .onConflictDoNothing()

    const removedFollows = await tx
      .delete(follow)
      .where(
        or(
          and(
            eq(follow.followerId, input.blockerId),
            eq(follow.followedId, input.blockedId)
          ),
          and(
            eq(follow.followerId, input.blockedId),
            eq(follow.followedId, input.blockerId)
          )
        )
      )
      .returning({
        followerId: follow.followerId,
        followedId: follow.followedId,
      })

    for (const removed of removedFollows) {
      await tx
        .update(profile)
        .set({
          followingCount: sql<number>`greatest(${profile.followingCount} - 1, 0)`,
          updatedAt: new Date(),
        })
        .where(eq(profile.userId, removed.followerId))
      await tx
        .update(profile)
        .set({
          followerCount: sql<number>`greatest(${profile.followerCount} - 1, 0)`,
          updatedAt: new Date(),
        })
        .where(eq(profile.userId, removed.followedId))
    }

    return {
      ok: true,
      value: {
        blockedId: input.blockedId,
        blocked: true,
        removedFollowCount: removedFollows.length,
      },
    }
  })
}

export async function unblockUser(input: {
  blockerId: string
  blockedId: string
}): Promise<Result<UnblockUserOutput, BlockUserError>> {
  return db.transaction(async (tx) => {
    if (input.blockerId === input.blockedId) {
      return { ok: false, error: { kind: "self_block" } }
    }

    const blocker = await findProfileByUserId(tx, input.blockerId)
    const blocked = await findProfileByUserId(tx, input.blockedId)
    if (!blocker || !blocked) {
      return { ok: false, error: { kind: "not_found" } }
    }

    await tx
      .delete(block)
      .where(
        and(
          eq(block.blockerId, input.blockerId),
          eq(block.blockedId, input.blockedId)
        )
      )

    return {
      ok: true,
      value: {
        blockedId: input.blockedId,
        blocked: false,
      },
    }
  })
}

export async function getProfileEngagement(input: {
  viewerId: string
  targetUserId: string
}): Promise<ProfileEngagementState | null> {
  const [target] = await db
    .select({
      userId: profile.userId,
      followerCount: profile.followerCount,
      followingCount: profile.followingCount,
    })
    .from(profile)
    .where(eq(profile.userId, input.targetUserId))
    .limit(1)

  if (!target) return null

  const [existingFollow] = await db
    .select({ followerId: follow.followerId })
    .from(follow)
    .where(
      and(
        eq(follow.followerId, input.viewerId),
        eq(follow.followedId, input.targetUserId)
      )
    )
    .limit(1)

  const [existingBlock] = await db
    .select({ blockerId: block.blockerId })
    .from(block)
    .where(
      and(
        eq(block.blockerId, input.viewerId),
        eq(block.blockedId, input.targetUserId)
      )
    )
    .limit(1)

  return {
    targetUserId: target.userId,
    followerCount: target.followerCount,
    followingCount: target.followingCount,
    isFollowing: existingFollow !== undefined,
    isBlocked: existingBlock !== undefined,
  }
}

export async function listVisibleNotifications(input: {
  recipientId: string
}): Promise<EngagementNotificationRow[]> {
  return db.transaction(async (tx) => {
    const blockedIds = await findBlockedPairIds(tx, input.recipientId)
    const rows = await tx
      .select({
        id: notification.id,
        recipientId: notification.recipientId,
        type: notification.type,
        actorId: notification.actorId,
        data: notification.data,
        isRead: notification.isRead,
      })
      .from(notification)
      .where(eq(notification.recipientId, input.recipientId))

    const hiddenIds = rows
      .filter((row) => row.actorId && blockedIds.includes(row.actorId))
      .map((row) => row.id)

    if (hiddenIds.length > 0) {
      await tx
        .update(notification)
        .set({ isRead: true })
        .where(inArray(notification.id, hiddenIds))
    }

    return rows
      .filter((row) => !row.actorId || !blockedIds.includes(row.actorId))
      .map((row) => ({
        recipientId: row.recipientId,
        type: row.type,
        actorId: row.actorId,
        data: row.data ?? {},
        isRead: row.isRead,
      }))
  })
}

export async function countUnreadNotifications(input: {
  recipientId: string
}): Promise<number> {
  const rows = await listVisibleNotifications(input)
  return rows.filter((row) => !row.isRead).length
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

async function hasBlockedPair(
  tx: Tx,
  leftUserId: string,
  rightUserId: string
): Promise<boolean> {
  if (leftUserId === rightUserId) return false
  const [row] = await tx
    .select({ blockerId: block.blockerId })
    .from(block)
    .where(
      or(
        and(eq(block.blockerId, leftUserId), eq(block.blockedId, rightUserId)),
        and(eq(block.blockerId, rightUserId), eq(block.blockedId, leftUserId))
      )
    )
    .limit(1)
  return row !== undefined
}

async function findBlockedPairIds(tx: Tx, userId: string): Promise<string[]> {
  const rows = await tx
    .select({
      blockerId: block.blockerId,
      blockedId: block.blockedId,
    })
    .from(block)
    .where(or(eq(block.blockerId, userId), eq(block.blockedId, userId)))

  return [
    ...new Set(
      rows.map((row) =>
        row.blockerId === userId ? row.blockedId : row.blockerId
      )
    ),
  ]
}

async function findProfileByUserId(tx: Tx, userId: string) {
  const [row] = await tx
    .select({
      userId: profile.userId,
      followerCount: profile.followerCount,
      followingCount: profile.followingCount,
    })
    .from(profile)
    .where(eq(profile.userId, userId))
    .limit(1)
  return row
}
