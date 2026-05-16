import { verifyPassword } from "better-auth/crypto"
import { and, eq, gt, isNull, or, sql } from "drizzle-orm"
import {
  account,
  accountDeletionHold,
  block,
  comment,
  commentLike,
  db,
  favoriteGame,
  follow,
  media,
  notification,
  post,
  postLike,
  profile,
  session,
  user,
  userPreference,
  verification,
} from "@workspace/db"
import type {
  AccountDeletionAdapter,
  AccountDeletionHoldKind,
  AccountDeletionMutationInput,
  AccountDeletionSubject,
} from "./account-deletion.core.js"

export const accountDeletionAdapter: AccountDeletionAdapter = {
  async findDeletionSubject(userId) {
    return findDeletionSubject(userId)
  },
  async verifyCredentialPassword(userId, password) {
    return verifyCredentialPassword(userId, password)
  },
  async deleteAccount(input) {
    await deleteAccount(input)
  },
  async isValueHeld(kind, value, now) {
    return isValueHeld(kind, value, now)
  },
}

async function findDeletionSubject(
  userId: string
): Promise<AccountDeletionSubject | undefined> {
  const [userRow] = await db
    .select({
      id: user.id,
      email: user.email,
      role: user.role,
      accountStatus: user.accountStatus,
      deletedAt: user.deletedAt,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)

  if (!userRow) return undefined

  const [profileRow] = await db
    .select({
      id: profile.id,
      username: profile.username,
    })
    .from(profile)
    .where(eq(profile.userId, userId))
    .limit(1)

  return {
    ...userRow,
    profile: profileRow ?? null,
  }
}

async function verifyCredentialPassword(
  userId: string,
  password: string
): Promise<boolean> {
  const [credential] = await db
    .select({ password: account.password })
    .from(account)
    .where(
      and(eq(account.userId, userId), eq(account.providerId, "credential"))
    )
    .limit(1)

  if (!credential?.password) return false
  return verifyPassword({ hash: credential.password, password })
}

async function isValueHeld(
  kind: AccountDeletionHoldKind,
  value: string,
  now: Date
): Promise<boolean> {
  const [row] = await db
    .select({ id: accountDeletionHold.id })
    .from(accountDeletionHold)
    .where(
      and(
        eq(accountDeletionHold.kind, kind),
        eq(accountDeletionHold.value, value),
        gt(accountDeletionHold.heldUntil, now)
      )
    )
    .limit(1)

  return row !== undefined
}

async function deleteAccount(
  input: AccountDeletionMutationInput
): Promise<void> {
  await db.transaction(async (tx) => {
    const mediaDeletionDeadline = new Date(
      input.deletedAt.getTime() + 24 * 60 * 60 * 1000
    )
    const holds = [input.emailHold, input.usernameHold].filter(
      (hold): hold is AccountDeletionMutationInput["emailHold"] => Boolean(hold)
    )

    if (holds.length > 0) {
      await tx.insert(accountDeletionHold).values(
        holds.map((hold) => ({
          userId: input.userId,
          kind: hold.kind,
          value: hold.value,
          heldUntil: hold.heldUntil,
          createdAt: input.deletedAt,
        }))
      )
    }

    await tx
      .delete(verification)
      .where(eq(verification.identifier, input.emailHold.value))

    await tx
      .update(user)
      .set({
        name: "Deleted user",
        email: input.tombstoneEmail,
        emailVerified: false,
        image: null,
        accountStatus: "account_deleted",
        deletedAt: input.deletedAt,
        suspendedUntil: null,
        suspensionPublicReason: null,
        updatedAt: input.deletedAt,
      })
      .where(eq(user.id, input.userId))

    await tx
      .update(account)
      .set({
        accountId: input.tombstoneEmail,
        accessToken: null,
        refreshToken: null,
        idToken: null,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        scope: null,
        password: null,
        updatedAt: input.deletedAt,
      })
      .where(eq(account.userId, input.userId))

    if (input.tombstoneUsername) {
      await tx
        .update(profile)
        .set({
          username: input.tombstoneUsername,
          displayName: null,
          bio: null,
          avatarMediaId: null,
          bannerMediaId: null,
          followerCount: 0,
          followingCount: 0,
          updatedAt: input.deletedAt,
        })
        .where(eq(profile.userId, input.userId))
    }

    if (input.profileId) {
      await tx
        .delete(favoriteGame)
        .where(eq(favoriteGame.profileId, input.profileId))
    }

    await tx
      .delete(userPreference)
      .where(eq(userPreference.userId, input.userId))
    await tx
      .delete(block)
      .where(
        or(eq(block.blockerId, input.userId), eq(block.blockedId, input.userId))
      )

    const removedFollows = await tx
      .delete(follow)
      .where(
        or(
          eq(follow.followerId, input.userId),
          eq(follow.followedId, input.userId)
        )
      )
      .returning({
        followerId: follow.followerId,
        followedId: follow.followedId,
      })
    const affectedProfileUserIds = unique(
      removedFollows.flatMap((row) => [row.followerId, row.followedId])
    ).filter((userId) => userId !== input.userId)

    const removedPostLikes = await tx
      .delete(postLike)
      .where(eq(postLike.userId, input.userId))
      .returning({ postId: postLike.postId })
    const removedCommentLikes = await tx
      .delete(commentLike)
      .where(eq(commentLike.userId, input.userId))
      .returning({ commentId: commentLike.commentId })

    const deletedComments = await tx
      .update(comment)
      .set({
        deletedAt: input.deletedAt,
        updatedAt: input.deletedAt,
      })
      .where(and(eq(comment.authorId, input.userId), isNull(comment.deletedAt)))
      .returning({ postId: comment.postId })

    await tx
      .update(post)
      .set({
        deletedAt: input.deletedAt,
        updatedAt: input.deletedAt,
      })
      .where(and(eq(post.authorId, input.userId), isNull(post.deletedAt)))

    await tx
      .delete(notification)
      .where(
        or(
          eq(notification.recipientId, input.userId),
          eq(notification.actorId, input.userId)
        )
      )

    await tx
      .update(media)
      .set({
        status: "deleted",
        expiresAt: mediaDeletionDeadline,
        updatedAt: input.deletedAt,
      })
      .where(eq(media.ownerId, input.userId))

    await tx.delete(session).where(eq(session.userId, input.userId))

    for (const userId of affectedProfileUserIds) {
      await recountProfileEngagement(tx, userId, input.deletedAt)
    }

    const affectedPostIds = unique([
      ...removedPostLikes.map((row) => row.postId),
      ...deletedComments.map((row) => row.postId),
    ])
    for (const postId of affectedPostIds) {
      await recountPost(tx, postId, input.deletedAt)
    }

    for (const commentId of unique(
      removedCommentLikes.map((row) => row.commentId)
    )) {
      await recountComment(tx, commentId, input.deletedAt)
    }
  })
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

async function recountProfileEngagement(
  tx: Tx,
  userId: string,
  updatedAt: Date
): Promise<void> {
  const [counts] = await tx
    .select({
      followers: sql<number>`count(*) filter (where ${follow.followedId} = ${userId})::int`,
      following: sql<number>`count(*) filter (where ${follow.followerId} = ${userId})::int`,
    })
    .from(follow)
    .where(or(eq(follow.followerId, userId), eq(follow.followedId, userId)))

  await tx
    .update(profile)
    .set({
      followerCount: counts?.followers ?? 0,
      followingCount: counts?.following ?? 0,
      updatedAt,
    })
    .where(eq(profile.userId, userId))
}

async function recountPost(
  tx: Tx,
  postId: string,
  updatedAt: Date
): Promise<void> {
  const [likes] = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(postLike)
    .where(eq(postLike.postId, postId))
  const [comments] = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(comment)
    .where(
      and(
        eq(comment.postId, postId),
        isNull(comment.deletedAt),
        isNull(comment.removedAt)
      )
    )

  await tx
    .update(post)
    .set({
      likeCount: likes?.count ?? 0,
      commentCount: comments?.count ?? 0,
      updatedAt,
    })
    .where(eq(post.id, postId))
}

async function recountComment(
  tx: Tx,
  commentId: string,
  updatedAt: Date
): Promise<void> {
  const [likes] = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(commentLike)
    .where(eq(commentLike.commentId, commentId))

  await tx
    .update(comment)
    .set({
      likeCount: likes?.count ?? 0,
      updatedAt,
    })
    .where(eq(comment.id, commentId))
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)]
}
