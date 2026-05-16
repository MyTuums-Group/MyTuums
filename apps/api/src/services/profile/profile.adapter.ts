/**
 * Profile adapter — thin Drizzle-backed data access.
 *
 * Each function is a single DB query (or insert) with no business rules.
 * The service layer composes these with policy functions; routers compose
 * the service with transport mapping.
 */

import { and, eq, gt, inArray } from "drizzle-orm"
import { db } from "@workspace/db"
import {
  accountDeletionHold,
  favoriteGame,
  game,
  profile,
  user,
} from "@workspace/db/schema"
import type { AccountStatus, Username } from "@workspace/types"

export type ProfileRow = typeof profile.$inferSelect & {
  accountStatus?: AccountStatus
}

/**
 * Find a profile by user ID.
 * Returns the full row — the service decides what to expose.
 */
export async function findByUserId(
  userId: string
): Promise<ProfileRow | undefined> {
  const [row] = await db
    .select()
    .from(profile)
    .where(eq(profile.userId, userId))
    .limit(1)
  return row
}

/**
 * Find a profile by username (case-insensitive lookup).
 * Returns the full row — the service decides what to expose.
 */
export async function findByUsername(
  username: string
): Promise<ProfileRow | undefined> {
  const [row] = await db
    .select({
      id: profile.id,
      userId: profile.userId,
      username: profile.username,
      displayName: profile.displayName,
      bio: profile.bio,
      avatarMediaId: profile.avatarMediaId,
      bannerMediaId: profile.bannerMediaId,
      followerCount: profile.followerCount,
      followingCount: profile.followingCount,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      accountStatus: user.accountStatus,
    })
    .from(profile)
    .innerJoin(user, eq(profile.userId, user.id))
    .where(eq(profile.username, username.toLowerCase()))
    .limit(1)
  return row
}

/**
 * Check if a profile exists for the given user ID.
 * Lightweight — selects only the id column.
 */
export async function existsByUserId(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: profile.id })
    .from(profile)
    .where(eq(profile.userId, userId))
    .limit(1)
  return row !== undefined
}

export async function findActiveSeededGameIds(
  gameIds: string[]
): Promise<string[]> {
  if (gameIds.length === 0) return []
  const activeRows = await db
    .select({ id: game.id })
    .from(game)
    .where(and(inArray(game.id, gameIds), eq(game.isActive, true)))
  return activeRows.map((row) => row.id)
}

export async function createOnboarding(values: {
  userId: string
  username: Username
  displayName: string | null
  bio: string | null
  avatarMediaId: string | null
  favoriteGames: { gameId: string; position: number }[]
}): Promise<ProfileRow> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(profile)
      .values({
        userId: values.userId,
        username: values.username,
        displayName: values.displayName,
        bio: values.bio,
        avatarMediaId: values.avatarMediaId,
      })
      .returning()

    if (!row) throw new Error("Failed to create profile.")

    if (values.favoriteGames.length > 0) {
      await tx.insert(favoriteGame).values(
        values.favoriteGames.map((favorite) => ({
          profileId: row.id,
          gameId: favorite.gameId,
          position: favorite.position,
        }))
      )
    }

    return row
  })
}

/**
 * Insert a new profile row.
 * Caller ensures the input is validated; the username unique constraint
 * provides the authoritative race guard (caught as error code 23505).
 */
export async function insert(values: {
  userId: string
  username: Username
  displayName: string | null
  bio: string | null
}): Promise<ProfileRow> {
  const [row] = await db.insert(profile).values(values).returning()
  return row!
}

export async function isUsernameHeld(
  username: Username,
  now: Date
): Promise<boolean> {
  const [row] = await db
    .select({ id: accountDeletionHold.id })
    .from(accountDeletionHold)
    .where(
      and(
        eq(accountDeletionHold.kind, "username"),
        eq(accountDeletionHold.value, username.toLowerCase()),
        gt(accountDeletionHold.heldUntil, now)
      )
    )
    .limit(1)
  return row !== undefined
}
