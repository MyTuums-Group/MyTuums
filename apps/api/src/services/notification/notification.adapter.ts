import { eq, inArray, or } from "drizzle-orm"
import {
  block,
  comment,
  db,
  notification,
  post,
  profile,
  user,
  type Transaction,
} from "@workspace/db"
import {
  createInMemoryNotificationService,
  type InMemoryNotificationState,
  type NotificationView,
  type MarkReadError,
  type RecordContentRemovedInput,
} from "./notification.core.js"
import type { Result } from "@workspace/types"

export async function list(input: {
  recipientId: string
}): Promise<NotificationView[]> {
  return db.transaction(async (tx) => {
    const { service, readState } = await hydrateService(tx, input.recipientId)
    const views = await service.list(input)
    await persistNewReads(tx, input.recipientId, readState, service.snapshot())
    return views
  })
}

export async function unreadCount(input: {
  recipientId: string
}): Promise<number> {
  return db.transaction(async (tx) => {
    const { service, readState } = await hydrateService(tx, input.recipientId)
    const count = await service.unreadCount(input)
    await persistNewReads(tx, input.recipientId, readState, service.snapshot())
    return count
  })
}

export async function markRead(input: {
  recipientId: string
  notificationId: string
}): Promise<Result<{ notificationId: string }, MarkReadError>> {
  return db.transaction(async (tx) => {
    const { service, readState } = await hydrateService(tx, input.recipientId)
    const result = await service.markRead(input)
    await persistNewReads(tx, input.recipientId, readState, service.snapshot())
    return result
  })
}

export async function markAllRead(input: {
  recipientId: string
}): Promise<{ markedReadCount: number }> {
  return db.transaction(async (tx) => {
    const { service, readState } = await hydrateService(tx, input.recipientId)
    const result = await service.markAllRead(input)
    const ids = service
      .snapshot()
      .notifications.filter((row) => row.recipientId === input.recipientId)
      .map((row) => row.id)

    if (ids.length > 0) {
      await tx
        .update(notification)
        .set({ isRead: true })
        .where(inArray(notification.id, ids))
    }

    await persistNewReads(tx, input.recipientId, readState, service.snapshot())
    return result
  })
}

export async function recordContentRemoved(
  input: RecordContentRemovedInput
): Promise<{ created: boolean }> {
  return db.transaction(async (tx) => {
    const target =
      input.targetType === "post"
        ? await findPostRemovalTarget(tx, input.targetId)
        : await findCommentRemovalTarget(tx, input.targetId)

    if (!target || target.deletedAt) {
      return { created: false }
    }

    const [created] = await tx
      .insert(notification)
      .values({
        recipientId: input.recipientId,
        type: "content_removed",
        actorId: null,
        data: {
          targetType: input.targetType,
          ...(input.targetType === "post"
            ? { postId: input.targetId }
            : { commentId: input.targetId }),
          moderationActionId: input.moderationActionId,
          publicReason: input.publicReason,
        },
        createdAt: input.createdAt,
      })
      .onConflictDoNothing()
      .returning({ id: notification.id })

    return { created: created !== undefined }
  })
}

async function hydrateService(tx: Transaction, recipientId: string) {
  const state = await loadNotificationState(tx, recipientId)
  return {
    service: createInMemoryNotificationService(state),
    readState: new Map(state.notifications.map((row) => [row.id, row.isRead])),
  }
}

async function persistNewReads(
  tx: Transaction,
  recipientId: string,
  readState: Map<string, boolean>,
  state: InMemoryNotificationState
) {
  const newlyReadIds = state.notifications
    .filter(
      (row) =>
        row.recipientId === recipientId && row.isRead && !readState.get(row.id)
    )
    .map((row) => row.id)

  if (newlyReadIds.length === 0) return

  await tx
    .update(notification)
    .set({ isRead: true })
    .where(inArray(notification.id, newlyReadIds))
}

async function loadNotificationState(
  tx: Transaction,
  recipientId: string
): Promise<InMemoryNotificationState> {
  const rows = await tx
    .select({
      id: notification.id,
      recipientId: notification.recipientId,
      type: notification.type,
      actorId: notification.actorId,
      data: notification.data,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
    })
    .from(notification)
    .where(eq(notification.recipientId, recipientId))

  const postIds = new Set<string>()
  const commentIds = new Set<string>()
  const actorIds = new Set<string>()

  for (const row of rows) {
    if (row.actorId) actorIds.add(row.actorId)
    const postId = dataString(row.data ?? {}, "postId")
    const commentId = dataString(row.data ?? {}, "commentId")
    if (postId) postIds.add(postId)
    if (commentId) commentIds.add(commentId)
  }

  const comments =
    commentIds.size > 0
      ? await tx
          .select({
            id: comment.id,
            postId: comment.postId,
            authorId: comment.authorId,
            text: comment.text,
            deletedAt: comment.deletedAt,
            removedAt: comment.removedAt,
            removalPublicReason: comment.removalPublicReason,
          })
          .from(comment)
          .where(inArray(comment.id, [...commentIds]))
      : []

  for (const row of comments) {
    postIds.add(row.postId)
  }

  const posts =
    postIds.size > 0
      ? await tx
          .select({
            id: post.id,
            publicId: post.publicId,
            authorId: post.authorId,
            text: post.text,
            deletedAt: post.deletedAt,
            removedAt: post.removedAt,
            removalPublicReason: post.removalPublicReason,
          })
          .from(post)
          .where(inArray(post.id, [...postIds]))
      : []

  const userIds = new Set<string>([recipientId, ...actorIds])
  for (const row of posts) userIds.add(row.authorId)
  for (const row of comments) userIds.add(row.authorId)

  const users =
    userIds.size > 0
      ? await tx
          .select({
            id: user.id,
            accountStatus: user.accountStatus,
          })
          .from(user)
          .where(inArray(user.id, [...userIds]))
      : []

  const profiles =
    userIds.size > 0
      ? await tx
          .select({
            userId: profile.userId,
            username: profile.username,
            displayName: profile.displayName,
          })
          .from(profile)
          .where(inArray(profile.userId, [...userIds]))
      : []

  const blocks = await tx
    .select({
      blockerId: block.blockerId,
      blockedId: block.blockedId,
    })
    .from(block)
    .where(
      or(eq(block.blockerId, recipientId), eq(block.blockedId, recipientId))
    )

  return {
    notifications: rows.map((row) => ({
      ...row,
      data: row.data ?? {},
    })),
    users,
    profiles,
    posts,
    comments,
    blocks,
  }
}

async function findPostRemovalTarget(tx: Transaction, postId: string) {
  const [row] = await tx
    .select({ deletedAt: post.deletedAt })
    .from(post)
    .where(eq(post.id, postId))
    .limit(1)
  return row ?? null
}

async function findCommentRemovalTarget(tx: Transaction, commentId: string) {
  const [row] = await tx
    .select({ deletedAt: comment.deletedAt })
    .from(comment)
    .where(eq(comment.id, commentId))
    .limit(1)
  return row ?? null
}

function dataString(data: Record<string, unknown>, key: string): string | null {
  const value = data[key]
  return typeof value === "string" ? value : null
}
