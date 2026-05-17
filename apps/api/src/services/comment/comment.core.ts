import {
  createCommentBody,
  type CommentBody,
  type Result,
} from "@workspace/types"
import type { PostRecord } from "../post/post.core.js"

export type CommentRecord = {
  id: string
  postId: string
  authorId: string
  text: string
  likeCount: number
  deletedAt: Date | null
  removedAt: Date | null
  removalPublicReason: string | null
  createdAt: Date
  updatedAt: Date
}

export type CommentLikeRecord = {
  userId: string
  commentId: string
  createdAt: Date
}

export type CommentCreateInput = {
  publicId: string
  authorId: string
  text: string
}

export type CreateCommentError =
  | { kind: "invalid_comment_body"; message: string }
  | { kind: "post_not_found" }

export type DeleteOwnCommentError =
  | { kind: "not_found" }
  | { kind: "forbidden" }
  | { kind: "already_deleted" }

export type ToggleCommentLikeError = { kind: "not_found" }

export type CommentablePostRecord = Pick<
  PostRecord,
  "id" | "publicId" | "authorId" | "commentCount" | "deletedAt" | "removedAt"
>

export type CommentNotificationRow = {
  recipientId: string
  type: "post_comment" | "comment_like"
  actorId: string
  data: { postId: string; commentId: string }
  isRead: boolean
}

export type CommentBlockRow = {
  blockerId: string
  blockedId: string
}

export type CommentRepository = {
  findCommentablePostByPublicId(
    publicId: string
  ): Promise<CommentablePostRecord | null>
  findCommentById(commentId: string): Promise<CommentRecord | null>
  createComment(values: {
    postId: string
    postAuthorId: string
    authorId: string
    text: CommentBody
  }): Promise<CommentRecord>
  markCommentDeleted(values: {
    commentId: string
    authorId: string
    deletedAt: Date
  }): Promise<CommentRecord | null>
  toggleCommentLike(values: {
    commentId: string
    userId: string
    toggledAt: Date
  }): Promise<{
    commentId: string
    isLikedByViewer: boolean
    likeCount: number
  } | null>
}

export type CommentService = {
  createComment(
    input: CommentCreateInput
  ): Promise<Result<CommentRecord, CreateCommentError>>
  deleteOwnComment(input: {
    commentId: string
    authorId: string
  }): Promise<
    Result<{ commentId: string; postId: string }, DeleteOwnCommentError>
  >
  toggleCommentLike(input: {
    commentId: string
    userId: string
  }): Promise<
    Result<
      { commentId: string; isLikedByViewer: boolean; likeCount: number },
      ToggleCommentLikeError
    >
  >
}

export function createCommentService(
  repository: CommentRepository
): CommentService {
  return {
    async createComment(input) {
      const validatedBody = createCommentBody(input.text)
      if (!validatedBody.ok) {
        return {
          ok: false,
          error: {
            kind: "invalid_comment_body",
            message: validatedBody.error.message,
          },
        }
      }

      const post = await repository.findCommentablePostByPublicId(
        input.publicId
      )
      if (!post || post.deletedAt || post.removedAt) {
        return { ok: false, error: { kind: "post_not_found" } }
      }

      const created = await repository.createComment({
        postId: post.id,
        postAuthorId: post.authorId,
        authorId: input.authorId,
        text: validatedBody.value,
      })

      return { ok: true, value: created }
    },

    async deleteOwnComment(input) {
      const existing = await repository.findCommentById(input.commentId)
      if (!existing) {
        return { ok: false, error: { kind: "not_found" } }
      }

      if (existing.authorId !== input.authorId) {
        return { ok: false, error: { kind: "forbidden" } }
      }

      if (existing.deletedAt) {
        return { ok: false, error: { kind: "already_deleted" } }
      }

      const deleted = await repository.markCommentDeleted({
        commentId: input.commentId,
        authorId: input.authorId,
        deletedAt: new Date(),
      })

      if (!deleted) {
        return { ok: false, error: { kind: "already_deleted" } }
      }

      return {
        ok: true,
        value: {
          commentId: deleted.id,
          postId: deleted.postId,
        },
      }
    },

    async toggleCommentLike(input) {
      const existing = await repository.findCommentById(input.commentId)
      if (!existing || existing.deletedAt || existing.removedAt) {
        return { ok: false, error: { kind: "not_found" } }
      }

      const toggled = await repository.toggleCommentLike({
        commentId: input.commentId,
        userId: input.userId,
        toggledAt: new Date(),
      })

      if (!toggled) {
        return { ok: false, error: { kind: "not_found" } }
      }

      return { ok: true, value: toggled }
    },
  }
}

export function createInMemoryCommentService(state: {
  posts: PostRecord[]
  comments: CommentRecord[]
  commentLikes: CommentLikeRecord[]
  blocks?: CommentBlockRow[]
  notifications?: CommentNotificationRow[]
}): CommentService & {
  snapshot(): {
    posts: PostRecord[]
    comments: CommentRecord[]
    commentLikes: CommentLikeRecord[]
    blocks: CommentBlockRow[]
    notifications: CommentNotificationRow[]
  }
} {
  let nextCommentNumber = state.comments.length + 1

  const repository: CommentRepository = {
    findCommentablePostByPublicId(publicId) {
      const found = state.posts.find((post) => post.publicId === publicId)
      return Promise.resolve(found ?? null)
    },

    findCommentById(commentId) {
      return Promise.resolve(
        state.comments.find((comment) => comment.id === commentId) ?? null
      )
    },

    createComment(values) {
      const now = new Date("2026-01-01T00:00:00.000Z")
      const comment: CommentRecord = {
        id: `comment-${nextCommentNumber}`,
        postId: values.postId,
        authorId: values.authorId,
        text: values.text,
        likeCount: 0,
        deletedAt: null,
        removedAt: null,
        removalPublicReason: null,
        createdAt: now,
        updatedAt: now,
      }
      nextCommentNumber += 1
      state.comments.push(comment)

      const postIndex = state.posts.findIndex(
        (post) => post.id === values.postId
      )
      if (postIndex !== -1) {
        const post = state.posts[postIndex]!
        state.posts[postIndex] = {
          ...post,
          commentCount: post.commentCount + 1,
          updatedAt: now,
        }
      }

      if (
        values.authorId !== values.postAuthorId &&
        !isBlockedPair(state.blocks ?? [], values.authorId, values.postAuthorId)
      ) {
        addCommentNotificationOnce(state.notifications ?? [], {
          recipientId: values.postAuthorId,
          type: "post_comment",
          actorId: values.authorId,
          data: { postId: values.postId, commentId: comment.id },
          isRead: false,
        })
      }

      return Promise.resolve(comment)
    },

    markCommentDeleted(values) {
      const index = state.comments.findIndex(
        (comment) =>
          comment.id === values.commentId &&
          comment.authorId === values.authorId &&
          comment.deletedAt === null
      )

      if (index === -1) {
        return Promise.resolve(null)
      }

      const existing = state.comments[index]!
      const updated: CommentRecord = {
        ...existing,
        deletedAt: values.deletedAt,
        updatedAt: values.deletedAt,
      }
      state.comments[index] = updated

      if (existing.removedAt === null) {
        const postIndex = state.posts.findIndex(
          (post) => post.id === existing.postId
        )
        if (postIndex !== -1) {
          const post = state.posts[postIndex]!
          state.posts[postIndex] = {
            ...post,
            commentCount: Math.max(0, post.commentCount - 1),
            updatedAt: values.deletedAt,
          }
        }
      }

      return Promise.resolve(updated)
    },

    toggleCommentLike(values) {
      const commentIndex = state.comments.findIndex(
        (comment) =>
          comment.id === values.commentId &&
          comment.deletedAt === null &&
          comment.removedAt === null
      )

      if (commentIndex === -1) {
        return Promise.resolve(null)
      }

      const likeIndex = state.commentLikes.findIndex(
        (like) =>
          like.commentId === values.commentId && like.userId === values.userId
      )
      const existing = state.comments[commentIndex]!

      if (likeIndex === -1) {
        state.commentLikes.push({
          commentId: values.commentId,
          userId: values.userId,
          createdAt: values.toggledAt,
        })

        const updated = {
          ...existing,
          likeCount: existing.likeCount + 1,
          updatedAt: values.toggledAt,
        }
        state.comments[commentIndex] = updated

        if (
          values.userId !== existing.authorId &&
          !isBlockedPair(state.blocks ?? [], values.userId, existing.authorId)
        ) {
          addCommentNotificationOnce(state.notifications ?? [], {
            recipientId: existing.authorId,
            type: "comment_like",
            actorId: values.userId,
            data: { postId: existing.postId, commentId: existing.id },
            isRead: false,
          })
        }

        return Promise.resolve({
          commentId: values.commentId,
          isLikedByViewer: true,
          likeCount: updated.likeCount,
        })
      }

      state.commentLikes.splice(likeIndex, 1)
      const updated = {
        ...existing,
        likeCount: Math.max(0, existing.likeCount - 1),
        updatedAt: values.toggledAt,
      }
      state.comments[commentIndex] = updated

      return Promise.resolve({
        commentId: values.commentId,
        isLikedByViewer: false,
        likeCount: updated.likeCount,
      })
    },
  }

  return {
    ...createCommentService(repository),
    snapshot() {
      return {
        posts: [...state.posts],
        comments: [...state.comments],
        commentLikes: [...state.commentLikes],
        blocks: [...(state.blocks ?? [])],
        notifications: (state.notifications ?? []).map((row) => ({
          ...row,
          data: { ...row.data },
        })),
      }
    },
  }
}

function addCommentNotificationOnce(
  notifications: CommentNotificationRow[],
  notification: CommentNotificationRow
): void {
  const exists = notifications.some(
    (row) =>
      row.recipientId === notification.recipientId &&
      row.type === notification.type &&
      row.actorId === notification.actorId &&
      row.data.commentId === notification.data.commentId
  )
  if (!exists) notifications.push(notification)
}

function isBlockedPair(
  blocks: CommentBlockRow[],
  leftUserId: string,
  rightUserId: string
): boolean {
  return blocks.some(
    (block) =>
      (block.blockerId === leftUserId && block.blockedId === rightUserId) ||
      (block.blockerId === rightUserId && block.blockedId === leftUserId)
  )
}
