import { describe, expect, it } from "vitest"
import { createInMemoryEngagementService } from "../services/engagement/engagement.core.js"

function createService() {
  return createInMemoryEngagementService({
    posts: [
      {
        id: "post-1",
        publicId: "pub_00000001",
        authorId: "bob",
        likeCount: 0,
        deletedAt: null,
        removedAt: null,
      },
    ],
    comments: [],
    profiles: [
      {
        userId: "alice",
        followerCount: 0,
        followingCount: 0,
      },
      {
        userId: "bob",
        followerCount: 0,
        followingCount: 0,
      },
    ],
    postLikes: [],
    commentLikes: [],
    follows: [],
    blocks: [],
    notifications: [],
  })
}

describe("engagement service", () => {
  it("toggles a post like and keeps the denormalized count in sync", async () => {
    const service = createService()

    await expect(
      service.togglePostLike({
        actorId: "alice",
        publicId: "pub_00000001",
      })
    ).resolves.toEqual({
      ok: true,
      value: {
        publicId: "pub_00000001",
        liked: true,
        likeCount: 1,
      },
    })

    expect(service.snapshot().posts[0]?.likeCount).toBe(1)
    expect(service.snapshot().postLikes).toEqual([
      {
        userId: "alice",
        postId: "post-1",
      },
    ])

    await expect(
      service.togglePostLike({
        actorId: "alice",
        publicId: "pub_00000001",
      })
    ).resolves.toEqual({
      ok: true,
      value: {
        publicId: "pub_00000001",
        liked: false,
        likeCount: 0,
      },
    })

    expect(service.snapshot().posts[0]?.likeCount).toBe(0)
    expect(service.snapshot().postLikes).toEqual([])
  })

  it("toggles a comment like and keeps the denormalized count in sync", async () => {
    const service = createInMemoryEngagementService({
      ...createService().snapshot(),
      posts: [
        {
          id: "post-1",
          publicId: "pub_00000001",
          authorId: "alice",
          likeCount: 0,
          deletedAt: null,
          removedAt: null,
        },
      ],
      comments: [
        {
          id: "comment-1",
          postId: "post-1",
          authorId: "bob",
          likeCount: 0,
          deletedAt: null,
          removedAt: null,
        },
      ],
    })

    await expect(
      service.toggleCommentLike({
        actorId: "alice",
        commentId: "comment-1",
      })
    ).resolves.toEqual({
      ok: true,
      value: {
        commentId: "comment-1",
        liked: true,
        likeCount: 1,
      },
    })

    expect(service.snapshot().comments[0]?.likeCount).toBe(1)
    expect(service.snapshot().commentLikes).toEqual([
      {
        userId: "alice",
        commentId: "comment-1",
      },
    ])

    await expect(
      service.toggleCommentLike({
        actorId: "alice",
        commentId: "comment-1",
      })
    ).resolves.toEqual({
      ok: true,
      value: {
        commentId: "comment-1",
        liked: false,
        likeCount: 0,
      },
    })

    expect(service.snapshot().comments[0]?.likeCount).toBe(0)
    expect(service.snapshot().commentLikes).toEqual([])
  })

  it("toggles a follow and keeps both profile counters in sync", async () => {
    const service = createService()

    await expect(
      service.toggleFollow({
        followerId: "alice",
        followedId: "bob",
      })
    ).resolves.toEqual({
      ok: true,
      value: {
        followedId: "bob",
        following: true,
        followerCount: 1,
        followingCount: 1,
      },
    })

    expect(service.snapshot().follows).toEqual([
      {
        followerId: "alice",
        followedId: "bob",
      },
    ])
    expect(service.snapshot().profiles).toEqual([
      {
        userId: "alice",
        followerCount: 0,
        followingCount: 1,
      },
      {
        userId: "bob",
        followerCount: 1,
        followingCount: 0,
      },
    ])

    await expect(
      service.toggleFollow({
        followerId: "alice",
        followedId: "bob",
      })
    ).resolves.toEqual({
      ok: true,
      value: {
        followedId: "bob",
        following: false,
        followerCount: 0,
        followingCount: 0,
      },
    })

    expect(service.snapshot().follows).toEqual([])
    expect(service.snapshot().profiles).toEqual([
      {
        userId: "alice",
        followerCount: 0,
        followingCount: 0,
      },
      {
        userId: "bob",
        followerCount: 0,
        followingCount: 0,
      },
    ])
  })

  it("blocks a user, removes follows in both directions, and does not restore them on unblock", async () => {
    const service = createInMemoryEngagementService({
      ...createService().snapshot(),
      profiles: [
        {
          userId: "alice",
          followerCount: 1,
          followingCount: 1,
        },
        {
          userId: "bob",
          followerCount: 1,
          followingCount: 1,
        },
      ],
      follows: [
        {
          followerId: "alice",
          followedId: "bob",
        },
        {
          followerId: "bob",
          followedId: "alice",
        },
      ],
    })

    await expect(
      service.blockUser({
        blockerId: "alice",
        blockedId: "bob",
      })
    ).resolves.toEqual({
      ok: true,
      value: {
        blockedId: "bob",
        blocked: true,
        removedFollowCount: 2,
      },
    })

    expect(service.snapshot().blocks).toEqual([
      {
        blockerId: "alice",
        blockedId: "bob",
      },
    ])
    expect(service.snapshot().follows).toEqual([])
    expect(service.snapshot().profiles).toEqual([
      {
        userId: "alice",
        followerCount: 0,
        followingCount: 0,
      },
      {
        userId: "bob",
        followerCount: 0,
        followingCount: 0,
      },
    ])

    await expect(
      service.unblockUser({
        blockerId: "alice",
        blockedId: "bob",
      })
    ).resolves.toEqual({
      ok: true,
      value: {
        blockedId: "bob",
        blocked: false,
      },
    })

    expect(service.snapshot().blocks).toEqual([])
    expect(service.snapshot().follows).toEqual([])
  })

  it("prevents blocked users from following or liking content in either direction", async () => {
    const service = createInMemoryEngagementService({
      ...createService().snapshot(),
      posts: [
        {
          id: "post-1",
          publicId: "pub_00000001",
          authorId: "alice",
          likeCount: 0,
          deletedAt: null,
          removedAt: null,
        },
      ],
      comments: [
        {
          id: "comment-1",
          postId: "post-1",
          authorId: "bob",
          likeCount: 0,
          deletedAt: null,
          removedAt: null,
        },
      ],
      blocks: [
        {
          blockerId: "alice",
          blockedId: "bob",
        },
      ],
    })

    await expect(
      service.toggleFollow({
        followerId: "bob",
        followedId: "alice",
      })
    ).resolves.toEqual({
      ok: false,
      error: {
        kind: "blocked",
      },
    })

    await expect(
      service.togglePostLike({
        actorId: "bob",
        publicId: "pub_00000001",
      })
    ).resolves.toEqual({
      ok: false,
      error: {
        kind: "blocked",
      },
    })

    await expect(
      service.toggleCommentLike({
        actorId: "alice",
        commentId: "comment-1",
      })
    ).resolves.toEqual({
      ok: false,
      error: {
        kind: "blocked",
      },
    })
  })

  it("hides blocked notifications from lists and unread counts while keeping history", async () => {
    const service = createInMemoryEngagementService({
      ...createService().snapshot(),
      blocks: [
        {
          blockerId: "alice",
          blockedId: "bob",
        },
      ],
      notifications: [
        {
          recipientId: "alice",
          type: "post_like",
          actorId: "bob",
          data: { postId: "post-1" },
          isRead: false,
        },
      ],
    })

    await expect(
      service.listVisibleNotifications({
        recipientId: "alice",
      })
    ).resolves.toEqual([])

    await expect(
      service.countUnreadNotifications({
        recipientId: "alice",
      })
    ).resolves.toBe(0)

    expect(service.snapshot().notifications).toEqual([
      {
        recipientId: "alice",
        type: "post_like",
        actorId: "bob",
        data: { postId: "post-1" },
        isRead: true,
      },
    ])
  })

  it("allows self-likes without notifications and preserves historical notifications on unlike", async () => {
    const service = createInMemoryEngagementService({
      ...createService().snapshot(),
      posts: [
        {
          id: "post-1",
          publicId: "pub_00000001",
          authorId: "alice",
          likeCount: 0,
          deletedAt: null,
          removedAt: null,
        },
      ],
    })

    await expect(
      service.togglePostLike({
        actorId: "alice",
        publicId: "pub_00000001",
      })
    ).resolves.toMatchObject({
      ok: true,
      value: {
        liked: true,
        likeCount: 1,
      },
    })

    expect(service.snapshot().notifications).toEqual([])

    await expect(
      service.togglePostLike({
        actorId: "bob",
        publicId: "pub_00000001",
      })
    ).resolves.toMatchObject({
      ok: true,
      value: {
        liked: true,
        likeCount: 2,
      },
    })
    await expect(
      service.togglePostLike({
        actorId: "bob",
        publicId: "pub_00000001",
      })
    ).resolves.toMatchObject({
      ok: true,
      value: {
        liked: false,
        likeCount: 1,
      },
    })

    expect(service.snapshot().notifications).toEqual([
      {
        recipientId: "alice",
        type: "post_like",
        actorId: "bob",
        data: { postId: "post-1" },
        isRead: false,
      },
    ])
  })

  it("dedupes follow and like notifications by their natural source keys", async () => {
    const service = createInMemoryEngagementService({
      ...createService().snapshot(),
      posts: [
        {
          id: "post-1",
          publicId: "pub_00000001",
          authorId: "alice",
          likeCount: 0,
          deletedAt: null,
          removedAt: null,
        },
      ],
      comments: [
        {
          id: "comment-1",
          postId: "post-1",
          authorId: "alice",
          likeCount: 0,
          deletedAt: null,
          removedAt: null,
        },
      ],
    })

    await service.toggleFollow({ followerId: "bob", followedId: "alice" })
    await service.toggleFollow({ followerId: "bob", followedId: "alice" })
    await service.toggleFollow({ followerId: "bob", followedId: "alice" })

    await service.togglePostLike({
      actorId: "bob",
      publicId: "pub_00000001",
    })
    await service.togglePostLike({
      actorId: "bob",
      publicId: "pub_00000001",
    })
    await service.togglePostLike({
      actorId: "bob",
      publicId: "pub_00000001",
    })

    await service.toggleCommentLike({
      actorId: "bob",
      commentId: "comment-1",
    })
    await service.toggleCommentLike({
      actorId: "bob",
      commentId: "comment-1",
    })
    await service.toggleCommentLike({
      actorId: "bob",
      commentId: "comment-1",
    })

    expect(service.snapshot().notifications).toEqual([
      {
        recipientId: "alice",
        type: "follow",
        actorId: "bob",
        data: { followerId: "bob" },
        isRead: false,
      },
      {
        recipientId: "alice",
        type: "post_like",
        actorId: "bob",
        data: { postId: "post-1" },
        isRead: false,
      },
      {
        recipientId: "alice",
        type: "comment_like",
        actorId: "bob",
        data: { commentId: "comment-1", postId: "post-1" },
        isRead: false,
      },
    ])
  })
})
