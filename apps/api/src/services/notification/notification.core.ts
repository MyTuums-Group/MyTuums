import type {
  AccountStatus,
  NotificationType,
  ReportTargetType,
  Result,
} from "@workspace/types"

type NotificationData = Record<string, unknown>

export type NotificationRow = {
  id: string
  recipientId: string
  type: NotificationType
  actorId: string | null
  data: NotificationData
  isRead: boolean
  createdAt: Date
}

export type NotificationUserRow = {
  id: string
  accountStatus: AccountStatus
}

export type NotificationProfileRow = {
  userId: string
  username: string
  displayName: string | null
}

export type NotificationPostRow = {
  id: string
  publicId: string
  authorId: string
  text: string
  deletedAt: Date | null
  removedAt: Date | null
  removalPublicReason: string | null
}

export type NotificationCommentRow = {
  id: string
  postId: string
  authorId: string
  text: string
  deletedAt: Date | null
  removedAt: Date | null
  removalPublicReason: string | null
}

export type NotificationBlockRow = {
  blockerId: string
  blockedId: string
}

export type NotificationActorView = {
  username: string
  displayName: string | null
  avatarUrl: null
}

export type NotificationTargetView =
  | {
      kind: "profile"
      username: string
      preview: string
    }
  | {
      kind: "post"
      publicId: string
      preview: string
    }
  | {
      kind: "comment"
      postPublicId: string
      commentId: string
      preview: string
    }
  | {
      kind: "removed_content"
      targetType: Extract<ReportTargetType, "post" | "comment">
      postPublicId: string | null
      commentId?: string
      publicReason: string | null
    }

export type NotificationView = {
  id: string
  type: NotificationType
  actor: NotificationActorView | null
  target: NotificationTargetView
  isRead: boolean
  createdAt: Date
}

export type MarkReadError = { kind: "not_found" }

export type RecordContentRemovedInput = {
  recipientId: string
  targetType: Extract<ReportTargetType, "post" | "comment">
  targetId: string
  moderationActionId: string
  publicReason: string | null
  createdAt?: Date
}

export type NotificationService = {
  list(input: { recipientId: string }): Promise<NotificationView[]>
  unreadCount(input: { recipientId: string }): Promise<number>
  markRead(input: {
    recipientId: string
    notificationId: string
  }): Promise<Result<{ notificationId: string }, MarkReadError>>
  markAllRead(input: {
    recipientId: string
  }): Promise<{ markedReadCount: number }>
  recordContentRemoved(input: RecordContentRemovedInput): Promise<{
    created: boolean
  }>
}

export type InMemoryNotificationState = {
  notifications: NotificationRow[]
  users: NotificationUserRow[]
  profiles: NotificationProfileRow[]
  posts: NotificationPostRow[]
  comments: NotificationCommentRow[]
  blocks: NotificationBlockRow[]
}

type VisibilityResult =
  | { visible: true; view: NotificationView }
  | { visible: false; notificationId: string }

export function createInMemoryNotificationService(
  state: InMemoryNotificationState
): NotificationService & { snapshot(): InMemoryNotificationState } {
  return {
    async list(input) {
      await Promise.resolve()
      return visibleViewsForRecipient(state, input.recipientId)
    },

    async unreadCount(input) {
      await Promise.resolve()
      return visibleViewsForRecipient(state, input.recipientId).filter(
        (row) => !row.isRead
      ).length
    },

    async markRead(input) {
      await Promise.resolve()
      const row = state.notifications.find(
        (notification) =>
          notification.id === input.notificationId &&
          notification.recipientId === input.recipientId
      )
      if (!row) return { ok: false, error: { kind: "not_found" } }

      const visibility = toVisibilityResult(state, row)
      if (!visibility.visible) {
        row.isRead = true
        return { ok: false, error: { kind: "not_found" } }
      }

      row.isRead = true
      return {
        ok: true,
        value: { notificationId: input.notificationId },
      }
    },

    async markAllRead(input) {
      await Promise.resolve()
      const rows = state.notifications.filter(
        (row) => row.recipientId === input.recipientId
      )
      let markedReadCount = 0

      for (const row of rows) {
        const visibility = toVisibilityResult(state, row)
        if (visibility.visible && !row.isRead) {
          markedReadCount += 1
        }
        row.isRead = true
      }

      return { markedReadCount }
    },

    async recordContentRemoved(input) {
      await Promise.resolve()
      const target =
        input.targetType === "post"
          ? state.posts.find((post) => post.id === input.targetId)
          : state.comments.find((comment) => comment.id === input.targetId)
      if (!target || target.deletedAt) return { created: false }

      const exists = state.notifications.some(
        (row) =>
          row.recipientId === input.recipientId &&
          row.type === "content_removed" &&
          row.data.moderationActionId === input.moderationActionId &&
          row.data.targetType === input.targetType
      )
      if (exists) return { created: false }

      state.notifications.push({
        id: `notification-${state.notifications.length + 1}`,
        recipientId: input.recipientId,
        type: "content_removed",
        actorId: null,
        data: contentRemovedData(input),
        isRead: false,
        createdAt: input.createdAt ?? new Date(),
      })

      return { created: true }
    },

    snapshot() {
      return {
        notifications: state.notifications.map((row) => ({
          ...row,
          data: { ...row.data },
        })),
        users: state.users.map((row) => ({ ...row })),
        profiles: state.profiles.map((row) => ({ ...row })),
        posts: state.posts.map((row) => ({ ...row })),
        comments: state.comments.map((row) => ({ ...row })),
        blocks: state.blocks.map((row) => ({ ...row })),
      }
    },
  }
}

function contentRemovedData(
  input: RecordContentRemovedInput
): Record<string, unknown> {
  return {
    targetType: input.targetType,
    ...(input.targetType === "post"
      ? { postId: input.targetId }
      : { commentId: input.targetId }),
    moderationActionId: input.moderationActionId,
    publicReason: input.publicReason,
  }
}

function visibleViewsForRecipient(
  state: InMemoryNotificationState,
  recipientId: string
): NotificationView[] {
  const results = state.notifications
    .filter((row) => row.recipientId === recipientId)
    .map((row) => toVisibilityResult(state, row))

  for (const result of results) {
    if (!result.visible) {
      const row = state.notifications.find(
        (notification) => notification.id === result.notificationId
      )
      if (row) row.isRead = true
    }
  }

  return results
    .filter(
      (result): result is Extract<VisibilityResult, { visible: true }> =>
        result.visible
    )
    .map((result) => result.view)
    .sort(compareNotificationViews)
}

function toVisibilityResult(
  state: InMemoryNotificationState,
  row: NotificationRow
): VisibilityResult {
  const actor = actorForRow(state, row)
  if (actor.kind === "hidden") {
    return { visible: false, notificationId: row.id }
  }

  const target = targetForRow(state, row)
  if (!target) {
    return { visible: false, notificationId: row.id }
  }

  return {
    visible: true,
    view: {
      id: row.id,
      type: row.type,
      actor: actor.value,
      target,
      isRead: row.isRead,
      createdAt: row.createdAt,
    },
  }
}

function actorForRow(
  state: InMemoryNotificationState,
  row: NotificationRow
):
  | { kind: "visible"; value: NotificationActorView | null }
  | { kind: "hidden" } {
  if (row.type === "content_removed") {
    return { kind: "visible", value: null }
  }

  if (!row.actorId) return { kind: "hidden" }
  if (isBlockedPair(state.blocks, row.recipientId, row.actorId)) {
    return { kind: "hidden" }
  }

  const user = state.users.find((candidate) => candidate.id === row.actorId)
  const profile = state.profiles.find(
    (candidate) => candidate.userId === row.actorId
  )
  if (!user || user.accountStatus !== "active" || !profile) {
    return { kind: "hidden" }
  }

  return {
    kind: "visible",
    value: {
      username: profile.username,
      displayName: profile.displayName,
      avatarUrl: null,
    },
  }
}

function targetForRow(
  state: InMemoryNotificationState,
  row: NotificationRow
): NotificationTargetView | null {
  switch (row.type) {
    case "follow": {
      const actorId = row.actorId
      if (!actorId) return null
      const profile = state.profiles.find(
        (candidate) => candidate.userId === actorId
      )
      if (!profile) return null
      return {
        kind: "profile",
        username: profile.username,
        preview: profile.displayName ?? `@${profile.username}`,
      }
    }
    case "post_like": {
      const post = findAvailablePost(state, dataString(row.data, "postId"))
      if (!post) return null
      return {
        kind: "post",
        publicId: post.publicId,
        preview: post.text,
      }
    }
    case "post_comment": {
      const comment = findAvailableComment(
        state,
        dataString(row.data, "commentId")
      )
      if (!comment) return null
      const post = findAvailablePost(state, comment.postId)
      if (!post) return null
      return {
        kind: "comment",
        postPublicId: post.publicId,
        commentId: comment.id,
        preview: comment.text,
      }
    }
    case "comment_like": {
      const comment = findAvailableComment(
        state,
        dataString(row.data, "commentId")
      )
      if (!comment) return null
      const post = findAvailablePost(state, comment.postId)
      if (!post) return null
      return {
        kind: "comment",
        postPublicId: post.publicId,
        commentId: comment.id,
        preview: comment.text,
      }
    }
    case "content_removed":
      return removedContentTargetForRow(state, row)
  }
}

function removedContentTargetForRow(
  state: InMemoryNotificationState,
  row: NotificationRow
): NotificationTargetView | null {
  const targetType = dataString(row.data, "targetType")
  if (targetType === "post") {
    const post = state.posts.find(
      (candidate) => candidate.id === dataString(row.data, "postId")
    )
    if (!post || post.deletedAt) return null
    return {
      kind: "removed_content",
      targetType,
      postPublicId: post.publicId,
      publicReason:
        dataString(row.data, "publicReason") ?? post.removalPublicReason,
    }
  }

  if (targetType === "comment") {
    const comment = state.comments.find(
      (candidate) => candidate.id === dataString(row.data, "commentId")
    )
    if (!comment || comment.deletedAt) return null
    const post = state.posts.find(
      (candidate) => candidate.id === comment.postId
    )
    return {
      kind: "removed_content",
      targetType,
      postPublicId: post?.publicId ?? null,
      commentId: comment.id,
      publicReason:
        dataString(row.data, "publicReason") ?? comment.removalPublicReason,
    }
  }

  return null
}

function findAvailablePost(
  state: InMemoryNotificationState,
  postId: string | null
): NotificationPostRow | null {
  if (!postId) return null
  const post = state.posts.find((candidate) => candidate.id === postId)
  if (!post || post.deletedAt || post.removedAt) return null
  const author = state.users.find((candidate) => candidate.id === post.authorId)
  if (!author || author.accountStatus !== "active") return null
  return post
}

function findAvailableComment(
  state: InMemoryNotificationState,
  commentId: string | null
): NotificationCommentRow | null {
  if (!commentId) return null
  const comment = state.comments.find((candidate) => candidate.id === commentId)
  if (!comment || comment.deletedAt || comment.removedAt) return null
  const author = state.users.find(
    (candidate) => candidate.id === comment.authorId
  )
  if (!author || author.accountStatus !== "active") return null
  return comment
}

function dataString(data: NotificationData, key: string): string | null {
  const value = data[key]
  return typeof value === "string" ? value : null
}

function isBlockedPair(
  blocks: NotificationBlockRow[],
  leftUserId: string,
  rightUserId: string
): boolean {
  return blocks.some(
    (block) =>
      (block.blockerId === leftUserId && block.blockedId === rightUserId) ||
      (block.blockerId === rightUserId && block.blockedId === leftUserId)
  )
}

function compareNotificationViews(
  left: NotificationView,
  right: NotificationView
): number {
  const time = right.createdAt.getTime() - left.createdAt.getTime()
  if (time !== 0) return time
  return right.id.localeCompare(left.id)
}
