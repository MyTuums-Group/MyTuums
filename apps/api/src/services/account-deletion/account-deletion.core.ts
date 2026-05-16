import { createHash } from "node:crypto"
import type {
  AccountStatus,
  MediaStatus,
  Result,
  UserRole,
} from "@workspace/types"
import {
  canSelfDeleteAccount,
  deletionHoldWindows,
} from "../account-status/policy.js"

export type AccountDeletionHoldKind = "email" | "username"

export type AccountDeletionSubject = {
  id: string
  email: string
  role: UserRole
  accountStatus: AccountStatus
  deletedAt: Date | null
  profile: {
    id: string
    username: string
  } | null
}

export type AccountDeletionHoldInput = {
  kind: AccountDeletionHoldKind
  value: string
  heldUntil: Date
}

export type AccountDeletionMutationInput = {
  userId: string
  deletedAt: Date
  emailHold: AccountDeletionHoldInput
  usernameHold: AccountDeletionHoldInput | null
  profileId: string | null
  tombstoneEmail: string
  tombstoneUsername: string | null
}

export type AccountDeletionResult = {
  userId: string
  deletedAt: Date
  emailHeldUntil: Date
  usernameHeldUntil: Date | null
}

export type AccountDeletionError =
  | { kind: "account_not_found" }
  | { kind: "already_deleted" }
  | { kind: "invalid_password" }
  | { kind: "owner_cannot_self_delete" }
  | { kind: "staff_cannot_self_delete" }

export type AccountDeletionAdapter = {
  findDeletionSubject(
    userId: string
  ): Promise<AccountDeletionSubject | undefined>
  verifyCredentialPassword(userId: string, password: string): Promise<boolean>
  deleteAccount(input: AccountDeletionMutationInput): Promise<void>
  isValueHeld(
    kind: AccountDeletionHoldKind,
    value: string,
    now: Date
  ): Promise<boolean>
}

export type AccountDeletionService = {
  deleteOwnAccount(input: {
    userId: string
    password: string
    now?: Date
  }): Promise<Result<AccountDeletionResult, AccountDeletionError>>
  isEmailHeld(email: string, now?: Date): Promise<boolean>
  isUsernameHeld(username: string, now?: Date): Promise<boolean>
}

export function createAccountDeletionService(
  adapter: AccountDeletionAdapter
): AccountDeletionService {
  return {
    async deleteOwnAccount(input) {
      const now = input.now ?? new Date()
      const subject = await adapter.findDeletionSubject(input.userId)
      if (!subject) return { ok: false, error: { kind: "account_not_found" } }
      if (subject.accountStatus === "account_deleted" || subject.deletedAt) {
        return { ok: false, error: { kind: "already_deleted" } }
      }

      const selfDeletion = canSelfDeleteAccount(subject)
      if (!selfDeletion.allowed) {
        return { ok: false, error: { kind: selfDeletion.reason } }
      }

      const passwordMatches =
        input.password.trim().length > 0 &&
        (await adapter.verifyCredentialPassword(subject.id, input.password))
      if (!passwordMatches) {
        return { ok: false, error: { kind: "invalid_password" } }
      }

      const { emailHeldUntil, usernameHeldUntil } = deletionHoldWindows(now)
      const tombstone = createAccountTombstone(subject.id)
      const usernameHold = subject.profile
        ? {
            kind: "username" as const,
            value: normalizeDeletionHoldValue(
              "username",
              subject.profile.username
            ),
            heldUntil: usernameHeldUntil,
          }
        : null

      await adapter.deleteAccount({
        userId: subject.id,
        deletedAt: now,
        emailHold: {
          kind: "email",
          value: normalizeDeletionHoldValue("email", subject.email),
          heldUntil: emailHeldUntil,
        },
        usernameHold,
        profileId: subject.profile?.id ?? null,
        tombstoneEmail: tombstone.email,
        tombstoneUsername: subject.profile ? tombstone.username : null,
      })

      return {
        ok: true,
        value: {
          userId: subject.id,
          deletedAt: now,
          emailHeldUntil,
          usernameHeldUntil: usernameHold?.heldUntil ?? null,
        },
      }
    },

    isEmailHeld(email, now = new Date()) {
      const value = normalizeDeletionHoldValue("email", email)
      if (!value) return Promise.resolve(false)
      return adapter.isValueHeld("email", value, now)
    },

    isUsernameHeld(username, now = new Date()) {
      const value = normalizeDeletionHoldValue("username", username)
      if (!value) return Promise.resolve(false)
      return adapter.isValueHeld("username", value, now)
    },
  }
}

export function normalizeDeletionHoldValue(
  _kind: AccountDeletionHoldKind,
  value: string
): string {
  return value.trim().toLowerCase()
}

export function createAccountTombstone(userId: string): {
  email: string
  username: string
} {
  const hash = createHash("sha256").update(userId).digest("hex")
  return {
    email: `deleted-${hash.slice(0, 32)}@deleted.mytuums.local`,
    username: `deleted_${hash.slice(0, 12)}`,
  }
}

export type AccountDeletionMemoryState = {
  users: Array<{
    id: string
    email: string
    name: string
    emailVerified: boolean
    image: string | null
    role: UserRole
    accountStatus: AccountStatus
    deletedAt: Date | null
    suspendedUntil?: Date | null
    suspensionPublicReason?: string | null
    updatedAt?: Date
  }>
  profiles: Array<{
    id: string
    userId: string
    username: string
    displayName: string | null
    bio: string | null
    avatarMediaId: string | null
    bannerMediaId: string | null
    followerCount: number
    followingCount: number
    updatedAt?: Date
  }>
  credentials: Array<{ userId: string; password: string | null }>
  sessions: Array<{ id: string; userId: string }>
  follows: Array<{ followerId: string; followedId: string }>
  posts: Array<{
    id: string
    authorId: string
    likeCount: number
    commentCount: number
    deletedAt: Date | null
    removedAt?: Date | null
    updatedAt?: Date
  }>
  comments: Array<{
    id: string
    postId: string
    authorId: string
    likeCount: number
    deletedAt: Date | null
    removedAt?: Date | null
    updatedAt?: Date
  }>
  postLikes: Array<{ userId: string; postId: string }>
  commentLikes: Array<{ userId: string; commentId: string }>
  notifications: Array<{
    id: string
    recipientId: string
    actorId?: string | null
  }>
  media: Array<{
    id: string
    ownerId: string
    status: MediaStatus
    expiresAt?: Date | null
    updatedAt?: Date
  }>
  favoriteGames: Array<{ profileId: string; gameId: string }>
  holds: Array<AccountDeletionHoldInput & { userId: string; createdAt: Date }>
}

export function createInMemoryAccountDeletionService(
  state: AccountDeletionMemoryState
): AccountDeletionService & { snapshot(): AccountDeletionMemoryState } {
  const adapter: AccountDeletionAdapter = {
    async findDeletionSubject(userId) {
      await Promise.resolve()
      const row = state.users.find((user) => user.id === userId)
      if (!row) return undefined
      const profile =
        state.profiles.find((item) => item.userId === userId) ?? null
      return {
        id: row.id,
        email: row.email,
        role: row.role,
        accountStatus: row.accountStatus,
        deletedAt: row.deletedAt,
        profile: profile
          ? { id: profile.id, username: profile.username }
          : null,
      }
    },
    async verifyCredentialPassword(userId, password) {
      await Promise.resolve()
      const credential = state.credentials.find(
        (item) => item.userId === userId
      )
      return credential?.password === password
    },
    async deleteAccount(input) {
      await Promise.resolve()
      applyAccountDeletionMutation(state, input)
    },
    async isValueHeld(kind, value, now) {
      await Promise.resolve()
      return state.holds.some(
        (hold) =>
          hold.kind === kind &&
          hold.value === value &&
          hold.heldUntil.getTime() > now.getTime()
      )
    },
  }

  return {
    ...createAccountDeletionService(adapter),
    snapshot() {
      return {
        users: state.users.map((row) => ({ ...row })),
        profiles: state.profiles.map((row) => ({ ...row })),
        credentials: state.credentials.map((row) => ({ ...row })),
        sessions: state.sessions.map((row) => ({ ...row })),
        follows: state.follows.map((row) => ({ ...row })),
        posts: state.posts.map((row) => ({ ...row })),
        comments: state.comments.map((row) => ({ ...row })),
        postLikes: state.postLikes.map((row) => ({ ...row })),
        commentLikes: state.commentLikes.map((row) => ({ ...row })),
        notifications: state.notifications.map((row) => ({ ...row })),
        media: state.media.map((row) => ({ ...row })),
        favoriteGames: state.favoriteGames.map((row) => ({ ...row })),
        holds: state.holds.map((row) => ({ ...row })),
      }
    },
  }
}

function applyAccountDeletionMutation(
  state: AccountDeletionMemoryState,
  input: AccountDeletionMutationInput
): void {
  const holds = [input.emailHold, input.usernameHold].filter(
    (hold): hold is AccountDeletionHoldInput => Boolean(hold)
  )
  state.holds.push(
    ...holds.map((hold) => ({
      ...hold,
      userId: input.userId,
      createdAt: input.deletedAt,
    }))
  )

  const user = state.users.find((row) => row.id === input.userId)
  if (user) {
    user.email = input.tombstoneEmail
    user.name = "Deleted user"
    user.emailVerified = false
    user.image = null
    user.accountStatus = "account_deleted"
    user.deletedAt = input.deletedAt
    user.suspendedUntil = null
    user.suspensionPublicReason = null
    user.updatedAt = input.deletedAt
  }

  for (const credential of state.credentials.filter(
    (row) => row.userId === input.userId
  )) {
    credential.password = null
  }

  const profile = state.profiles.find((row) => row.userId === input.userId)
  if (profile && input.tombstoneUsername) {
    profile.username = input.tombstoneUsername
    profile.displayName = null
    profile.bio = null
    profile.avatarMediaId = null
    profile.bannerMediaId = null
    profile.followerCount = 0
    profile.followingCount = 0
    profile.updatedAt = input.deletedAt
  }

  if (input.profileId) {
    state.favoriteGames = state.favoriteGames.filter(
      (favorite) => favorite.profileId !== input.profileId
    )
  }

  state.sessions = state.sessions.filter(
    (session) => session.userId !== input.userId
  )
  state.follows = state.follows.filter(
    (follow) =>
      follow.followerId !== input.userId && follow.followedId !== input.userId
  )
  state.postLikes = state.postLikes.filter(
    (like) => like.userId !== input.userId
  )
  state.commentLikes = state.commentLikes.filter(
    (like) => like.userId !== input.userId
  )
  state.notifications = state.notifications.filter(
    (notification) =>
      notification.recipientId !== input.userId &&
      notification.actorId !== input.userId
  )

  for (const media of state.media.filter(
    (row) => row.ownerId === input.userId
  )) {
    media.status = "deleted"
    media.expiresAt = new Date(input.deletedAt.getTime() + 24 * 60 * 60 * 1000)
    media.updatedAt = input.deletedAt
  }

  for (const comment of state.comments.filter(
    (row) => row.authorId === input.userId && !row.deletedAt
  )) {
    comment.deletedAt = input.deletedAt
    comment.updatedAt = input.deletedAt
  }

  for (const post of state.posts.filter(
    (row) => row.authorId === input.userId && !row.deletedAt
  )) {
    post.deletedAt = input.deletedAt
    post.updatedAt = input.deletedAt
  }

  for (const profile of state.profiles) {
    profile.followerCount = state.follows.filter(
      (follow) => follow.followedId === profile.userId
    ).length
    profile.followingCount = state.follows.filter(
      (follow) => follow.followerId === profile.userId
    ).length
  }

  for (const post of state.posts) {
    post.likeCount = state.postLikes.filter(
      (like) => like.postId === post.id
    ).length
    post.commentCount = state.comments.filter(
      (comment) =>
        comment.postId === post.id && !comment.deletedAt && !comment.removedAt
    ).length
  }

  for (const comment of state.comments) {
    comment.likeCount = state.commentLikes.filter(
      (like) => like.commentId === comment.id
    ).length
  }
}
