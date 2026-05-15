import { and, eq, isNull, or, sql } from "drizzle-orm"
import {
  block,
  comment as commentTable,
  commentLike,
  db,
  notification,
  post as postTable,
} from "@workspace/db"
import type { CommentRecord, CommentRepository } from "./comment.core.js"

export async function findCommentablePostByPublicId(
  publicId: string
): ReturnType<CommentRepository["findCommentablePostByPublicId"]> {
  const [row] = await db
    .select({
      id: postTable.id,
      publicId: postTable.publicId,
      authorId: postTable.authorId,
      commentCount: postTable.commentCount,
      deletedAt: postTable.deletedAt,
      removedAt: postTable.removedAt,
    })
    .from(postTable)
    .where(eq(postTable.publicId, publicId))
    .limit(1)

  return row ?? null
}

export async function findCommentById(
  commentId: string
): Promise<CommentRecord | null> {
  const [row] = await db
    .select()
    .from(commentTable)
    .where(eq(commentTable.id, commentId))
    .limit(1)

  return row ?? null
}

export async function createComment(values: {
  postId: string
  postAuthorId: string
  authorId: string
  text: CommentRecord["text"]
}): Promise<CommentRecord> {
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(commentTable)
      .values({
        postId: values.postId,
        authorId: values.authorId,
        text: values.text,
      })
      .returning()

    if (!created) {
      throw new Error("Failed to create comment.")
    }

    await tx
      .update(postTable)
      .set({
        commentCount: sql`${postTable.commentCount} + 1`,
        updatedAt: created.createdAt,
      })
      .where(eq(postTable.id, values.postId))

    if (
      values.authorId !== values.postAuthorId &&
      !(await hasBlockedPair(tx, values.authorId, values.postAuthorId))
    ) {
      await tx
        .insert(notification)
        .values({
          recipientId: values.postAuthorId,
          type: "post_comment",
          actorId: values.authorId,
          data: { postId: values.postId, commentId: created.id },
        })
        .onConflictDoNothing()
    }

    return created
  })
}

export async function markCommentDeleted(values: {
  commentId: string
  authorId: string
  deletedAt: Date
}): Promise<CommentRecord | null> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(commentTable)
      .where(
        and(
          eq(commentTable.id, values.commentId),
          eq(commentTable.authorId, values.authorId),
          isNull(commentTable.deletedAt)
        )
      )
      .limit(1)

    if (!existing) {
      return null
    }

    const [deleted] = await tx
      .update(commentTable)
      .set({
        deletedAt: values.deletedAt,
        updatedAt: values.deletedAt,
      })
      .where(eq(commentTable.id, existing.id))
      .returning()

    if (!deleted) {
      return null
    }

    if (existing.removedAt === null) {
      await tx
        .update(postTable)
        .set({
          commentCount: sql`greatest(${postTable.commentCount} - 1, 0)`,
          updatedAt: values.deletedAt,
        })
        .where(eq(postTable.id, existing.postId))
    }

    return deleted
  })
}

export async function toggleCommentLike(values: {
  commentId: string
  userId: string
  toggledAt: Date
}): Promise<{
  commentId: string
  isLikedByViewer: boolean
  likeCount: number
} | null> {
  return db.transaction(async (tx) => {
    const [target] = await tx
      .select({
        id: commentTable.id,
        postId: commentTable.postId,
        authorId: commentTable.authorId,
      })
      .from(commentTable)
      .where(
        and(
          eq(commentTable.id, values.commentId),
          isNull(commentTable.deletedAt),
          isNull(commentTable.removedAt)
        )
      )
      .limit(1)

    if (!target) {
      return null
    }
    if (await hasBlockedPair(tx, values.userId, target.authorId)) {
      return null
    }

    const [existingLike] = await tx
      .select({
        commentId: commentLike.commentId,
      })
      .from(commentLike)
      .where(
        and(
          eq(commentLike.commentId, values.commentId),
          eq(commentLike.userId, values.userId)
        )
      )
      .limit(1)

    if (existingLike) {
      await tx
        .delete(commentLike)
        .where(
          and(
            eq(commentLike.commentId, values.commentId),
            eq(commentLike.userId, values.userId)
          )
        )

      const [updated] = await tx
        .update(commentTable)
        .set({
          likeCount: sql`greatest(${commentTable.likeCount} - 1, 0)`,
          updatedAt: values.toggledAt,
        })
        .where(eq(commentTable.id, values.commentId))
        .returning({ likeCount: commentTable.likeCount })

      return {
        commentId: values.commentId,
        isLikedByViewer: false,
        likeCount: updated?.likeCount ?? 0,
      }
    }

    await tx.insert(commentLike).values({
      commentId: values.commentId,
      userId: values.userId,
      createdAt: values.toggledAt,
    })

    const [updated] = await tx
      .update(commentTable)
      .set({
        likeCount: sql`${commentTable.likeCount} + 1`,
        updatedAt: values.toggledAt,
      })
      .where(eq(commentTable.id, values.commentId))
      .returning({ likeCount: commentTable.likeCount })

    if (values.userId !== target.authorId) {
      await tx
        .insert(notification)
        .values({
          recipientId: target.authorId,
          type: "comment_like",
          actorId: values.userId,
          data: { commentId: values.commentId, postId: target.postId },
        })
        .onConflictDoNothing()
    }

    return {
      commentId: values.commentId,
      isLikedByViewer: true,
      likeCount: updated?.likeCount ?? 1,
    }
  })
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
