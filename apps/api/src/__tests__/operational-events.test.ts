import { Buffer } from "node:buffer"
import { describe, expect, it } from "vitest"
import type { UserRole } from "@workspace/types"
import {
  createInMemoryAccountDeletionService,
  type AccountDeletionMemoryState,
} from "../services/account-deletion/account-deletion.core.js"
import { createInMemoryCommentService } from "../services/comment/comment.core.js"
import { createInMemoryEngagementService } from "../services/engagement/engagement.core.js"
import { cleanupMedia } from "../services/media/cleanup.js"
import { FakeBlobStorageAdapter } from "../services/media/blob-storage.adapter.js"
import {
  createMediaService,
  type MediaPersistenceAdapter,
} from "../services/media/media.js"
import type { MediaRow } from "../services/media/media.adapter.js"
import { createInMemoryModerationService } from "../services/moderation/moderation.core.js"
import {
  createMemoryOperationalEventLogger,
  toOperationalLogRecord,
} from "../services/operational-events.js"
import { createInMemoryPostService } from "../services/post/post.core.js"

const baseDate = new Date("2026-05-16T10:00:00.000Z")

describe("operational event logging", () => {
  it("serializes signup completion as a versioned JSON-shaped event", () => {
    const record = toOperationalLogRecord(
      {
        event: "signup_completed",
        userId: "user-1",
        status: "completed",
        authProvider: "email",
      },
      baseDate
    )

    expect(record).toEqual({
      schemaVersion: 1,
      emittedAt: "2026-05-16T10:00:00.000Z",
      event: "signup_completed",
      userId: "user-1",
      status: "completed",
      authProvider: "email",
    })
    expectNoForbiddenPayloadKeys(record)
  })

  it("emits safe account, content, follow, report, and moderation payloads", async () => {
    const logger = createMemoryOperationalEventLogger()

    const accountService = createInMemoryAccountDeletionService(
      createAccountDeletionState(),
      logger
    )
    await expect(
      accountService.deleteOwnAccount({
        userId: "deleting-user",
        password: "correct-password",
        now: baseDate,
      })
    ).resolves.toMatchObject({ ok: true })

    const postService = createInMemoryPostService(
      {
        posts: [],
        games: [
          { id: "game-1", slug: "portal-2", name: "Portal 2", isActive: true },
        ],
      },
      logger
    )
    const postResult = await postService.createPost({
      authorId: "author-1",
      text: "post text stays out of operational logs",
      gameTagId: "game-1",
      mediaAttachmentId: "media-1",
    })
    expect(postResult).toMatchObject({ ok: true })
    if (!postResult.ok) throw new Error("Expected post creation to succeed.")

    const commentService = createInMemoryCommentService(
      {
        posts: postService.snapshot().posts,
        comments: [],
        commentLikes: [],
      },
      logger
    )
    const commentResult = await commentService.createComment({
      publicId: postResult.value.publicId,
      authorId: "commenter-1",
      text: "comment text stays out too",
    })
    expect(commentResult).toMatchObject({ ok: true })
    if (!commentResult.ok)
      throw new Error("Expected comment creation to succeed.")

    await commentService.deleteOwnComment({
      commentId: commentResult.value.id,
      authorId: "commenter-1",
    })
    await postService.deleteOwnPost({
      publicId: postResult.value.publicId,
      authorId: "author-1",
    })

    const engagementService = createInMemoryEngagementService(
      {
        posts: [],
        comments: [],
        profiles: [
          { userId: "follower-1", followerCount: 0, followingCount: 0 },
          { userId: "followed-1", followerCount: 0, followingCount: 0 },
        ],
        postLikes: [],
        commentLikes: [],
        follows: [],
        blocks: [],
        notifications: [],
      },
      logger
    )
    await engagementService.toggleFollow({
      followerId: "follower-1",
      followedId: "followed-1",
    })

    const moderationService = createInMemoryModerationService(
      {
        users: [
          { id: "reporter-1", role: "user", accountStatus: "active" },
          { id: "moderator-1", role: "moderator", accountStatus: "active" },
          { id: "reported-author", role: "user", accountStatus: "active" },
        ],
        profiles: [],
        posts: [
          {
            id: "reported-post",
            publicId: "pub_00000001",
            authorId: "reported-author",
            text: "reported content is not logged",
            commentCount: 0,
            deletedAt: null,
            removedAt: null,
            removalPublicReason: null,
            updatedAt: baseDate,
          },
        ],
        comments: [],
        blocks: [],
        reports: [],
        cases: [],
        actions: [],
        notifications: [],
        now: () => baseDate,
      },
      logger
    )
    const reportResult = await moderationService.submitReport({
      reporterId: "reporter-1",
      target: { type: "post", publicId: "pub_00000001" },
      reason: "spam",
      notes: "report notes stay private",
    })
    expect(reportResult).toMatchObject({ ok: true })
    if (!reportResult.ok)
      throw new Error("Expected report submission to succeed.")

    await moderationService.actionCase({
      actorId: "moderator-1",
      caseId: reportResult.value.moderationCaseId,
      action: "remove_post",
      reason: "spam",
      publicReason: "spam",
      internalNotes: "internal notes stay private",
      expectedTargetUpdatedAt: baseDate,
    })

    expect(logger.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ event: "account_deletion_requested" }),
        expect.objectContaining({ event: "account_deletion_completed" }),
        expect.objectContaining({ event: "post_created" }),
        expect.objectContaining({ event: "comment_created" }),
        expect.objectContaining({ event: "comment_deleted" }),
        expect.objectContaining({ event: "post_deleted" }),
        expect.objectContaining({ event: "follow_created" }),
        expect.objectContaining({ event: "report_submitted", reason: "spam" }),
        expect.objectContaining({
          event: "moderation_action_taken",
          action: "remove_post",
          reason: "spam",
        }),
      ])
    )

    for (const event of logger.events) {
      expectNoForbiddenPayloadKeys(event)
    }
  })

  it("emits media completion, failure, and cleanup events without blob details", async () => {
    const logger = createMemoryOperationalEventLogger()
    const storage = new FakeBlobStorageAdapter()
    const readyRow = mediaRow({
      id: "media-ready",
      blobKey: "blob-ready",
      expiresAt: new Date("2099-05-16T11:00:00.000Z"),
    })
    const adapter = createMediaAdapter(readyRow)
    storage.storeBlob("user-uploads", "blob-ready", {
      data: Buffer.from("image"),
      mimeType: "image/png",
      size: 1024,
    })

    const service = createMediaService({ adapter, storage, logger })
    await expect(
      service.confirmUpload("media-ready", "uploader-1")
    ).resolves.toMatchObject({ ok: true })

    const failedRow = mediaRow({
      id: "media-failed",
      blobKey: "missing-blob",
      expiresAt: new Date("2099-05-16T11:00:00.000Z"),
    })
    const failedService = createMediaService({
      adapter: createMediaAdapter(failedRow),
      storage,
      logger,
    })
    await expect(
      failedService.confirmUpload("media-failed", "uploader-1")
    ).resolves.toEqual({ ok: false, error: { kind: "blob_not_found" } })

    await cleanupMedia({
      adapter: {
        ...createMediaAdapter(
          mediaRow({ id: "media-cleanup", status: "deleted" })
        ),
        findDeletedMedia: () =>
          Promise.resolve([
            mediaRow({
              id: "media-cleanup",
              status: "deleted",
              blobKey: null,
              storageContainer: null,
            }),
          ]),
        removeByIds: () => Promise.resolve(undefined),
      },
      storage,
      logger,
    })

    expect(logger.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: "media_upload_completed",
          mediaId: "media-ready",
          status: "ready",
        }),
        expect.objectContaining({
          event: "media_upload_failed",
          mediaId: "media-failed",
          reason: "blob_not_found",
        }),
        expect.objectContaining({
          event: "media_cleanup_completed",
          status: "completed",
          failedCount: 0,
        }),
      ])
    )

    for (const event of logger.events) {
      expectNoForbiddenPayloadKeys(event)
    }
  })
})

function createAccountDeletionState(
  role: UserRole = "user"
): AccountDeletionMemoryState {
  return {
    users: [
      {
        id: "deleting-user",
        email: "player@example.com",
        name: "Player",
        emailVerified: true,
        image: null,
        role,
        accountStatus: "active",
        deletedAt: null,
      },
    ],
    profiles: [
      {
        id: "profile-1",
        userId: "deleting-user",
        username: "player",
        displayName: "Player",
        bio: "profile bio",
        avatarMediaId: null,
        bannerMediaId: null,
        followerCount: 0,
        followingCount: 0,
      },
    ],
    credentials: [{ userId: "deleting-user", password: "correct-password" }],
    sessions: [{ id: "session-1", userId: "deleting-user" }],
    follows: [],
    posts: [],
    comments: [],
    postLikes: [],
    commentLikes: [],
    notifications: [],
    media: [],
    favoriteGames: [],
    holds: [],
  }
}

function mediaRow(overrides: Partial<MediaRow> = {}): MediaRow {
  return {
    id: "media-1",
    ownerId: "uploader-1",
    purpose: "post_attachment",
    status: "pending",
    mimeType: "image/png",
    byteSize: 1024,
    blobKey: "blob-1",
    storageContainer: "user-uploads",
    confirmedAt: null,
    attachedTargetType: null,
    attachedTargetId: null,
    attachedSlot: null,
    attachedAt: null,
    expiresAt: null,
    createdAt: baseDate,
    updatedAt: baseDate,
    ...overrides,
  }
}

function createMediaAdapter(row: MediaRow): MediaPersistenceAdapter {
  let current = { ...row }
  return {
    findById(id) {
      return Promise.resolve(current.id === id ? current : undefined)
    },
    insert(values) {
      current = {
        ...mediaRow(),
        ...values,
        confirmedAt: null,
        expiresAt: values.expiresAt ?? null,
        createdAt: values.createdAt ?? baseDate,
        updatedAt: values.updatedAt ?? baseDate,
      }
      return Promise.resolve(current)
    },
    markReady(id, confirmedAt, cleanupDeadline) {
      if (current.id !== id) return Promise.resolve(undefined)
      current = {
        ...current,
        status: "ready",
        confirmedAt,
        expiresAt: cleanupDeadline,
      }
      return Promise.resolve(current)
    },
    markAttached(id) {
      if (current.id !== id) return Promise.resolve(undefined)
      current = { ...current, status: "attached", expiresAt: null }
      return Promise.resolve(current)
    },
    markDeleted(id) {
      if (current.id !== id) return Promise.resolve(undefined)
      current = { ...current, status: "deleted" }
      return Promise.resolve(current)
    },
    findPendingExpired() {
      return Promise.resolve([])
    },
    findUnattachedReadyExpired() {
      return Promise.resolve([])
    },
    findDeletedMedia() {
      return Promise.resolve(current.status === "deleted" ? [current] : [])
    },
    findFailedMedia() {
      return Promise.resolve(current.status === "failed" ? [current] : [])
    },
  }
}

function expectNoForbiddenPayloadKeys(value: unknown): void {
  const forbiddenKeys = new Set([
    "blobKey",
    "email",
    "internalNotes",
    "message",
    "notes",
    "password",
    "storageContainer",
    "text",
  ])

  if (Array.isArray(value)) {
    for (const item of value) expectNoForbiddenPayloadKeys(item)
    return
  }

  if (typeof value !== "object" || value === null) return

  for (const [key, child] of Object.entries(value)) {
    expect(forbiddenKeys.has(key)).toBe(false)
    expectNoForbiddenPayloadKeys(child)
  }
}
