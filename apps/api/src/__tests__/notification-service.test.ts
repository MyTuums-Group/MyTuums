import { describe, expect, it } from "vitest"
import {
  createInMemoryNotificationService,
  type InMemoryNotificationState,
} from "../services/notification/notification.core.js"

function createState(): InMemoryNotificationState {
  return {
    blocks: [],
    notifications: [
      {
        id: "notification-1",
        recipientId: "alice",
        type: "post_like",
        actorId: "bob",
        data: { postId: "post-1" },
        isRead: false,
        createdAt: new Date("2026-01-02T12:00:00.000Z"),
      },
      {
        id: "notification-2",
        recipientId: "alice",
        type: "follow",
        actorId: "blocked-user",
        data: { followerId: "blocked-user" },
        isRead: false,
        createdAt: new Date("2026-01-02T13:00:00.000Z"),
      },
      {
        id: "notification-3",
        recipientId: "alice",
        type: "content_removed",
        actorId: null,
        data: {
          targetType: "post",
          postId: "post-2",
          publicReason: "harassment",
        },
        isRead: false,
        createdAt: new Date("2026-01-02T14:00:00.000Z"),
      },
    ],
    users: [
      { id: "alice", accountStatus: "active" },
      { id: "bob", accountStatus: "active" },
      { id: "blocked-user", accountStatus: "active" },
    ],
    profiles: [
      { userId: "alice", username: "alice", displayName: "Alice" },
      { userId: "bob", username: "bob", displayName: "Bob" },
      {
        userId: "blocked-user",
        username: "blocked",
        displayName: "Blocked",
      },
    ],
    posts: [
      {
        id: "post-1",
        publicId: "pub_00000001",
        authorId: "alice",
        text: "A clean ace",
        deletedAt: null,
        removedAt: null,
        removalPublicReason: null,
      },
      {
        id: "post-2",
        publicId: "pub_00000002",
        authorId: "alice",
        text: "Removed text stays internal",
        deletedAt: null,
        removedAt: new Date("2026-01-02T13:30:00.000Z"),
        removalPublicReason: "harassment",
      },
    ],
    comments: [],
  }
}

describe("notification service", () => {
  it("lists safe visible notifications chronologically and marks hidden rows read", async () => {
    const state = createState()
    state.blocks.push({ blockerId: "alice", blockedId: "blocked-user" })
    const service = createInMemoryNotificationService(state)

    await expect(service.list({ recipientId: "alice" })).resolves.toEqual([
      {
        id: "notification-3",
        type: "content_removed",
        actor: null,
        target: {
          kind: "removed_content",
          targetType: "post",
          postPublicId: "pub_00000002",
          publicReason: "harassment",
        },
        isRead: false,
        createdAt: new Date("2026-01-02T14:00:00.000Z"),
      },
      {
        id: "notification-1",
        type: "post_like",
        actor: {
          username: "bob",
          displayName: "Bob",
          avatarUrl: null,
        },
        target: {
          kind: "post",
          publicId: "pub_00000001",
          preview: "A clean ace",
        },
        isRead: false,
        createdAt: new Date("2026-01-02T12:00:00.000Z"),
      },
    ])

    expect(
      service
        .snapshot()
        .notifications.find((row) => row.id === "notification-2")?.isRead
    ).toBe(true)
  })

  it("counts only visible unread notifications", async () => {
    const state = createState()
    state.blocks.push({ blockerId: "alice", blockedId: "blocked-user" })
    state.notifications[0]!.isRead = true
    const service = createInMemoryNotificationService(state)

    await expect(service.unreadCount({ recipientId: "alice" })).resolves.toBe(1)
  })

  it("marks one notification or all visible notifications as read", async () => {
    const service = createInMemoryNotificationService(createState())

    await expect(
      service.markRead({
        recipientId: "alice",
        notificationId: "notification-1",
      })
    ).resolves.toEqual({
      ok: true,
      value: { notificationId: "notification-1" },
    })

    expect(
      service
        .snapshot()
        .notifications.find((row) => row.id === "notification-1")?.isRead
    ).toBe(true)

    await service.markAllRead({ recipientId: "alice" })

    expect(
      service
        .snapshot()
        .notifications.filter((row) => row.recipientId === "alice")
        .every((row) => row.isRead)
    ).toBe(true)
  })

  it("records content-removal notifications without exposing moderation IDs in list output", async () => {
    const state = createState()
    state.notifications = []
    const service = createInMemoryNotificationService(state)

    await expect(
      service.recordContentRemoved({
        recipientId: "alice",
        targetType: "post",
        targetId: "post-2",
        moderationActionId: "moderation-action-1",
        publicReason: "harassment",
        createdAt: new Date("2026-01-03T00:00:00.000Z"),
      })
    ).resolves.toEqual({ created: true })
    await expect(
      service.recordContentRemoved({
        recipientId: "alice",
        targetType: "post",
        targetId: "post-2",
        moderationActionId: "moderation-action-1",
        publicReason: "harassment",
        createdAt: new Date("2026-01-03T00:00:00.000Z"),
      })
    ).resolves.toEqual({ created: false })

    expect(service.snapshot().notifications).toEqual([
      {
        id: "notification-1",
        recipientId: "alice",
        type: "content_removed",
        actorId: null,
        data: {
          targetType: "post",
          postId: "post-2",
          moderationActionId: "moderation-action-1",
          publicReason: "harassment",
        },
        isRead: false,
        createdAt: new Date("2026-01-03T00:00:00.000Z"),
      },
    ])
    await expect(service.list({ recipientId: "alice" })).resolves.toEqual([
      {
        id: "notification-1",
        type: "content_removed",
        actor: null,
        target: {
          kind: "removed_content",
          targetType: "post",
          postPublicId: "pub_00000002",
          publicReason: "harassment",
        },
        isRead: false,
        createdAt: new Date("2026-01-03T00:00:00.000Z"),
      },
    ])
  })
})
