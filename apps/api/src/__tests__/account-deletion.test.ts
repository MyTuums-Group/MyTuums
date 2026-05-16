import { describe, expect, it } from "vitest"
import type { UserRole } from "@workspace/types"
import {
  createInMemoryAccountDeletionService,
  type AccountDeletionMemoryState,
} from "../services/account-deletion/account-deletion.core.js"

const deletedAt = new Date("2026-05-16T10:00:00.000Z")
const sevenDaysLater = new Date("2026-05-23T10:00:00.000Z")
const oneDayLater = new Date("2026-05-17T10:00:00.000Z")

describe("Account deletion service", () => {
  it.each([
    ["owner", "owner_cannot_self_delete"],
    ["admin", "staff_cannot_self_delete"],
    ["moderator", "staff_cannot_self_delete"],
  ] as const)("blocks %s self-deletion", async (role, reason) => {
    const service = createInMemoryAccountDeletionService(createState(role))

    const result = await service.deleteOwnAccount({
      userId: "user-1",
      password: "correct-password",
      now: deletedAt,
    })

    expect(result).toEqual({ ok: false, error: { kind: reason } })
    expect(service.snapshot().holds).toEqual([])
    expect(service.snapshot().users[0]?.accountStatus).toBe("active")
  })

  it("requires password confirmation before mutating account data", async () => {
    const service = createInMemoryAccountDeletionService(createState())

    const result = await service.deleteOwnAccount({
      userId: "user-1",
      password: "wrong-password",
      now: deletedAt,
    })

    expect(result).toEqual({ ok: false, error: { kind: "invalid_password" } })
    expect(service.snapshot().sessions).toContainEqual({
      id: "session-1",
      userId: "user-1",
    })
    expect(service.snapshot().users[0]?.email).toBe("player@example.com")
  })

  it("soft-deletes the account, hides owned activity, cleans graph rows, and enforces hold windows", async () => {
    const service = createInMemoryAccountDeletionService(createState())

    const result = await service.deleteOwnAccount({
      userId: "user-1",
      password: "correct-password",
      now: deletedAt,
    })

    expect(result).toEqual({
      ok: true,
      value: {
        userId: "user-1",
        deletedAt,
        emailHeldUntil: sevenDaysLater,
        usernameHeldUntil: sevenDaysLater,
      },
    })

    const snapshot = service.snapshot()
    expect(snapshot.users[0]).toMatchObject({
      accountStatus: "account_deleted",
      deletedAt,
      emailVerified: false,
      image: null,
      name: "Deleted user",
      suspendedUntil: null,
      suspensionPublicReason: null,
    })
    expect(snapshot.users[0]?.email).toMatch(
      /^deleted-[a-f0-9]{32}@deleted\.mytuums\.local$/
    )
    expect(snapshot.credentials).toContainEqual({
      userId: "user-1",
      password: null,
    })
    expect(snapshot.sessions).toEqual([{ id: "session-2", userId: "user-2" }])

    expect(snapshot.profiles[0]?.username).toMatch(/^deleted_[a-f0-9]{12}$/)
    expect(snapshot.profiles[0]).toMatchObject({
      displayName: null,
      bio: null,
      avatarMediaId: null,
      bannerMediaId: null,
      followerCount: 0,
      followingCount: 0,
    })
    expect(snapshot.favoriteGames).toEqual([
      { profileId: "profile-2", gameId: "game-b" },
    ])

    expect(snapshot.follows).toEqual([
      { followerId: "user-2", followedId: "user-3" },
    ])
    expect(snapshot.profiles[1]).toMatchObject({
      userId: "user-2",
      followerCount: 0,
      followingCount: 1,
    })
    expect(snapshot.profiles[2]).toMatchObject({
      userId: "user-3",
      followerCount: 1,
      followingCount: 0,
    })

    expect(snapshot.postLikes).toEqual([{ userId: "user-3", postId: "post-1" }])
    expect(snapshot.commentLikes).toEqual([
      { userId: "user-3", commentId: "comment-1" },
    ])
    expect(snapshot.posts.find((post) => post.id === "post-1")).toMatchObject({
      deletedAt,
      likeCount: 1,
      commentCount: 1,
    })
    expect(snapshot.posts.find((post) => post.id === "post-2")).toMatchObject({
      deletedAt: null,
      likeCount: 0,
      commentCount: 1,
    })
    expect(
      snapshot.comments.find((comment) => comment.id === "comment-1")
    ).toMatchObject({ deletedAt })
    expect(
      snapshot.comments.find((comment) => comment.id === "comment-3")
    ).toMatchObject({ deletedAt: null, likeCount: 0 })

    expect(snapshot.notifications).toEqual([
      { id: "notif-3", recipientId: "user-3", actorId: "user-2" },
    ])
    expect(snapshot.media.find((item) => item.id === "media-1")).toMatchObject({
      status: "deleted",
      expiresAt: oneDayLater,
    })
    expect(snapshot.media.find((item) => item.id === "media-2")).toMatchObject({
      status: "attached",
    })

    expect(snapshot.holds).toEqual([
      {
        kind: "email",
        value: "player@example.com",
        heldUntil: sevenDaysLater,
        userId: "user-1",
        createdAt: deletedAt,
      },
      {
        kind: "username",
        value: "playerone",
        heldUntil: sevenDaysLater,
        userId: "user-1",
        createdAt: deletedAt,
      },
    ])
    await expect(
      service.isEmailHeld(
        "PLAYER@example.com",
        new Date("2026-05-22T10:00:00.000Z")
      )
    ).resolves.toBe(true)
    await expect(
      service.isEmailHeld("player@example.com", sevenDaysLater)
    ).resolves.toBe(false)
    await expect(
      service.isUsernameHeld("PlayerOne", new Date("2026-05-22T10:00:00.000Z"))
    ).resolves.toBe(true)
    await expect(
      service.isUsernameHeld("playerone", sevenDaysLater)
    ).resolves.toBe(false)
  })
})

function createState(role: UserRole = "user"): AccountDeletionMemoryState {
  return {
    users: [
      {
        id: "user-1",
        email: "player@example.com",
        name: "Player One",
        emailVerified: true,
        image: "https://example.com/avatar.png",
        role,
        accountStatus: "active",
        deletedAt: null,
        suspendedUntil: new Date("2026-06-01T00:00:00.000Z"),
        suspensionPublicReason: "Temporary moderation hold",
      },
      activeUser("user-2", "follower@example.com"),
      activeUser("user-3", "followed@example.com"),
    ],
    profiles: [
      {
        id: "profile-1",
        userId: "user-1",
        username: "playerone",
        displayName: "Player One",
        bio: "I play cozy games.",
        avatarMediaId: "media-1",
        bannerMediaId: "media-1",
        followerCount: 1,
        followingCount: 1,
      },
      {
        id: "profile-2",
        userId: "user-2",
        username: "follower",
        displayName: null,
        bio: null,
        avatarMediaId: null,
        bannerMediaId: null,
        followerCount: 0,
        followingCount: 2,
      },
      {
        id: "profile-3",
        userId: "user-3",
        username: "followed",
        displayName: null,
        bio: null,
        avatarMediaId: null,
        bannerMediaId: null,
        followerCount: 2,
        followingCount: 0,
      },
    ],
    credentials: [{ userId: "user-1", password: "correct-password" }],
    sessions: [
      { id: "session-1", userId: "user-1" },
      { id: "session-2", userId: "user-2" },
    ],
    follows: [
      { followerId: "user-2", followedId: "user-1" },
      { followerId: "user-1", followedId: "user-3" },
      { followerId: "user-2", followedId: "user-3" },
    ],
    posts: [
      {
        id: "post-1",
        authorId: "user-1",
        likeCount: 1,
        commentCount: 1,
        deletedAt: null,
        removedAt: null,
      },
      {
        id: "post-2",
        authorId: "user-2",
        likeCount: 1,
        commentCount: 2,
        deletedAt: null,
        removedAt: null,
      },
    ],
    comments: [
      {
        id: "comment-1",
        postId: "post-2",
        authorId: "user-1",
        likeCount: 1,
        deletedAt: null,
        removedAt: null,
      },
      {
        id: "comment-2",
        postId: "post-1",
        authorId: "user-3",
        likeCount: 0,
        deletedAt: null,
        removedAt: null,
      },
      {
        id: "comment-3",
        postId: "post-2",
        authorId: "user-2",
        likeCount: 1,
        deletedAt: null,
        removedAt: null,
      },
    ],
    postLikes: [
      { userId: "user-1", postId: "post-2" },
      { userId: "user-3", postId: "post-1" },
    ],
    commentLikes: [
      { userId: "user-1", commentId: "comment-3" },
      { userId: "user-3", commentId: "comment-1" },
    ],
    notifications: [
      { id: "notif-1", recipientId: "user-1", actorId: "user-2" },
      { id: "notif-2", recipientId: "user-2", actorId: "user-1" },
      { id: "notif-3", recipientId: "user-3", actorId: "user-2" },
    ],
    media: [
      {
        id: "media-1",
        ownerId: "user-1",
        status: "attached",
        expiresAt: null,
      },
      {
        id: "media-2",
        ownerId: "user-2",
        status: "attached",
        expiresAt: null,
      },
    ],
    favoriteGames: [
      { profileId: "profile-1", gameId: "game-a" },
      { profileId: "profile-2", gameId: "game-b" },
    ],
    holds: [],
  }
}

function activeUser(id: string, email: string) {
  return {
    id,
    email,
    name: email,
    emailVerified: true,
    image: null,
    role: "user" as const,
    accountStatus: "active" as const,
    deletedAt: null,
  }
}
