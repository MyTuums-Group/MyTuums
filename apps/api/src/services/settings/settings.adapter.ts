import { and, asc, eq, inArray } from "drizzle-orm"
import {
  block,
  db,
  favoriteGame,
  game,
  profile,
  userPreference,
} from "@workspace/db"
import type {
  SettingsPersistenceAdapter,
  SettingsPreferenceRow,
} from "./settings.core.js"

export const settingsAdapter: SettingsPersistenceAdapter = {
  async findProfileByUserId(userId) {
    const [row] = await db
      .select()
      .from(profile)
      .where(eq(profile.userId, userId))
      .limit(1)
    return row
  },

  async findFavoriteGames(profileId) {
    const rows = await db
      .select({
        id: game.id,
        slug: game.slug,
        name: game.name,
        isActive: game.isActive,
      })
      .from(favoriteGame)
      .innerJoin(game, eq(favoriteGame.gameId, game.id))
      .where(eq(favoriteGame.profileId, profileId))
      .orderBy(asc(favoriteGame.position))

    return rows
  },

  async findActiveGamesByIds(gameIds) {
    if (gameIds.length === 0) return []

    return db
      .select({
        id: game.id,
        slug: game.slug,
        name: game.name,
        isActive: game.isActive,
      })
      .from(game)
      .where(and(inArray(game.id, gameIds), eq(game.isActive, true)))
  },

  async findPreference(userId) {
    const [row] = await db
      .select({
        userId: userPreference.userId,
        theme: userPreference.theme,
      })
      .from(userPreference)
      .where(eq(userPreference.userId, userId))
      .limit(1)
    return row as SettingsPreferenceRow | undefined
  },

  async listBlockedProfiles(userId) {
    const rows = await db
      .select({
        userId: profile.userId,
        username: profile.username,
        displayName: profile.displayName,
      })
      .from(block)
      .innerJoin(profile, eq(block.blockedId, profile.userId))
      .where(eq(block.blockerId, userId))
      .orderBy(asc(profile.username))

    return rows
  },

  async upsertPreference(input) {
    const [row] = await db
      .insert(userPreference)
      .values({
        userId: input.userId,
        theme: input.theme,
      })
      .onConflictDoUpdate({
        target: userPreference.userId,
        set: {
          theme: input.theme,
          updatedAt: new Date(),
        },
      })
      .returning({
        userId: userPreference.userId,
        theme: userPreference.theme,
      })

    return row as SettingsPreferenceRow
  },

  async updateProfile(input) {
    return db.transaction(async (tx) => {
      const setValues: Partial<typeof profile.$inferInsert> = {
        displayName: input.displayName,
        bio: input.bio,
        updatedAt: new Date(),
      }

      if ("avatarMediaId" in input) {
        setValues.avatarMediaId = input.avatarMediaId ?? null
      }
      if ("bannerMediaId" in input) {
        setValues.bannerMediaId = input.bannerMediaId ?? null
      }

      const [updated] = await tx
        .update(profile)
        .set(setValues)
        .where(eq(profile.userId, input.userId))
        .returning()

      if (!updated) return undefined

      if (input.favoriteGameIds !== undefined) {
        await tx
          .delete(favoriteGame)
          .where(eq(favoriteGame.profileId, updated.id))

        if (input.favoriteGameIds.length > 0) {
          await tx.insert(favoriteGame).values(
            input.favoriteGameIds.map((gameId, index) => ({
              profileId: updated.id,
              gameId,
              position: index + 1,
            }))
          )
        }
      }

      return updated
    })
  },
}
