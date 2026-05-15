import { describe, expect, it } from "vitest"
import {
  createInMemoryCommentService,
  type CommentRecord,
} from "../services/comment/comment.core.js"
import type { PostRecord } from "../services/post/post.core.js"

function createPost(overrides: Partial<PostRecord> = {}): PostRecord {
  const createdAt = new Date("2026-01-01T00:00:00.000Z")

  return {
    id: "post-1",
    publicId: "pub_00000001",
    authorId: "alice",
    text: "Original post",
    gameTagId: null,
    mediaAttachmentId: null,
    likeCount: 0,
    commentCount: 0,
    deletedAt: null,
    removedAt: null,
    removalPublicReason: null,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  }
}

function createService(overrides?: {
  posts?: PostRecord[]
  comments?: CommentRecord[]
}) {
  return createInMemoryCommentService({
    posts: overrides?.posts ?? [createPost()],
    comments: overrides?.comments ?? [],
    commentLikes: [],
  })
}

describe("comment service", () => {
  it("creates a trimmed comment and increments the post comment count", async () => {
    const service = createService()

    const result = await service.createComment({
      publicId: "pub_00000001",
      authorId: "bob",
      text: "  gg on that clutch round  ",
    })

    expect(result).toMatchObject({
      ok: true,
      value: {
        postId: "post-1",
        authorId: "bob",
        text: "gg on that clutch round",
        likeCount: 0,
        deletedAt: null,
        removedAt: null,
      },
    })

    const snapshot = service.snapshot()
    expect(snapshot.posts[0]?.commentCount).toBe(1)
    expect(snapshot.comments).toHaveLength(1)
  })

  it("marks the author's comment as deleted and decrements the post comment count", async () => {
    const service = createService({
      posts: [createPost({ commentCount: 1 })],
      comments: [
        {
          id: "comment-1",
          postId: "post-1",
          authorId: "bob",
          text: "Temporary reply",
          likeCount: 0,
          deletedAt: null,
          removedAt: null,
          removalPublicReason: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      ],
    })

    await expect(
      service.deleteOwnComment({
        commentId: "comment-1",
        authorId: "bob",
      })
    ).resolves.toEqual({
      ok: true,
      value: {
        commentId: "comment-1",
        postId: "post-1",
      },
    })

    const snapshot = service.snapshot()
    expect(snapshot.comments[0]?.deletedAt).toBeInstanceOf(Date)
    expect(snapshot.posts[0]?.commentCount).toBe(0)
  })

  it("toggles a viewer's comment like and updates the like count", async () => {
    const service = createService({
      comments: [
        {
          id: "comment-1",
          postId: "post-1",
          authorId: "bob",
          text: "Nice round",
          likeCount: 0,
          deletedAt: null,
          removedAt: null,
          removalPublicReason: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      ],
    })

    await expect(
      service.toggleCommentLike({
        commentId: "comment-1",
        userId: "alice",
      })
    ).resolves.toEqual({
      ok: true,
      value: {
        commentId: "comment-1",
        isLikedByViewer: true,
        likeCount: 1,
      },
    })

    await expect(
      service.toggleCommentLike({
        commentId: "comment-1",
        userId: "alice",
      })
    ).resolves.toEqual({
      ok: true,
      value: {
        commentId: "comment-1",
        isLikedByViewer: false,
        likeCount: 0,
      },
    })
  })

  it("creates one post-comment notification for the post author unless the author comments", async () => {
    const service = createInMemoryCommentService({
      posts: [createPost({ authorId: "alice" })],
      comments: [],
      commentLikes: [],
      blocks: [],
      notifications: [],
    })

    await expect(
      service.createComment({
        publicId: "pub_00000001",
        authorId: "bob",
        text: "nice play",
      })
    ).resolves.toMatchObject({
      ok: true,
      value: {
        id: "comment-1",
        postId: "post-1",
        authorId: "bob",
      },
    })

    await service.createComment({
      publicId: "pub_00000001",
      authorId: "alice",
      text: "thanks!",
    })

    expect(service.snapshot().notifications).toEqual([
      {
        recipientId: "alice",
        type: "post_comment",
        actorId: "bob",
        data: { postId: "post-1", commentId: "comment-1" },
        isRead: false,
      },
    ])
  })

  it("creates one comment-like notification for the comment author unless they like their own comment", async () => {
    const service = createInMemoryCommentService({
      posts: [createPost({ authorId: "alice" })],
      comments: [
        {
          id: "comment-1",
          postId: "post-1",
          authorId: "alice",
          text: "Nice round",
          likeCount: 0,
          deletedAt: null,
          removedAt: null,
          removalPublicReason: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      ],
      commentLikes: [],
      blocks: [],
      notifications: [],
    })

    await service.toggleCommentLike({
      commentId: "comment-1",
      userId: "bob",
    })
    await service.toggleCommentLike({
      commentId: "comment-1",
      userId: "bob",
    })
    await service.toggleCommentLike({
      commentId: "comment-1",
      userId: "bob",
    })
    await service.toggleCommentLike({
      commentId: "comment-1",
      userId: "alice",
    })

    expect(service.snapshot().notifications).toEqual([
      {
        recipientId: "alice",
        type: "comment_like",
        actorId: "bob",
        data: { postId: "post-1", commentId: "comment-1" },
        isRead: false,
      },
    ])
  })
})
