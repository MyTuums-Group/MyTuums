import type { MediaPurpose, Result } from "@workspace/types"
import {
  BIO_MAX_LENGTH,
  DISPLAY_NAME_MAX_LENGTH,
  MAX_FAVORITE_GAMES,
} from "@workspace/types"

export type SettingsThemePreference = "system" | "light" | "dark"

export type SettingsProfileRow = {
  id: string
  userId: string
  username: string
  displayName: string | null
  bio: string | null
  avatarMediaId: string | null
  bannerMediaId: string | null
  followerCount: number
  followingCount: number
  createdAt: Date
}

export type SettingsGameRow = {
  id: string
  slug: string
  name: string
  isActive: boolean
}

export type SettingsFavoriteGameRow = {
  profileId: string
  gameId: string
  position: number
}

export type SettingsPreferenceRow = {
  userId: string
  theme: SettingsThemePreference
}

export type SettingsBlockRow = {
  blockerId: string
  blockedId: string
}

export type SettingsBlockedProfileRow = {
  userId: string
  username: string
  displayName: string | null
}

export type SettingsMediaAttachment = {
  mediaId: string
  userId: string
  expectedPurpose: Extract<MediaPurpose, "profile_avatar" | "profile_banner">
}

export type SettingsProfile = {
  username: string
  displayName: string | null
  bio: string | null
  avatarMediaId: string | null
  bannerMediaId: string | null
  /** Time-limited read URL when the user has avatar media; null if missing or unreadable */
  avatarUrl: string | null
  /** Time-limited read URL when the user has banner media; null if missing or unreadable */
  bannerUrl: string | null
  favoriteGames: SettingsFavoriteGame[]
}

export type SettingsFavoriteGame = {
  id: string
  slug: string
  name: string
}

export type SettingsBlockedUser = {
  userId: string
  username: string
  displayName: string | null
}

export type UserSettings = {
  profile: SettingsProfile
  account: {
    email: string
  }
  display: {
    theme: SettingsThemePreference
  }
  safety: {
    blockedUsers: SettingsBlockedUser[]
  }
  about: {
    appVersion: string
    buildInfo: string
  }
}

export type SettingsUpdateProfileInput = {
  displayName?: string | null
  bio?: string | null
  avatarMediaId?: string | null
  bannerMediaId?: string | null
  favoriteGameIds?: string[]
}

export type SettingsProfileError =
  | { kind: "profile_not_found" }
  | { kind: "invalid_profile"; message: string }
  | { kind: "invalid_favorite_games"; message: string }
  | {
      kind: "media_attachment_failed"
      slot: "avatar" | "banner"
      reason: string
    }

export type SettingsMediaPort = {
  attachMedia(
    mediaId: string,
    userId: string,
    expectedPurpose: Extract<MediaPurpose, "profile_avatar" | "profile_banner">
  ): Promise<Result<{ mediaId: string }, { kind: string }>>
}

export type SettingsPersistenceAdapter = {
  findProfileByUserId(userId: string): Promise<SettingsProfileRow | undefined>
  findFavoriteGames(profileId: string): Promise<SettingsGameRow[]>
  findActiveGamesByIds(gameIds: string[]): Promise<SettingsGameRow[]>
  findPreference(userId: string): Promise<SettingsPreferenceRow | undefined>
  listBlockedProfiles(userId: string): Promise<SettingsBlockedProfileRow[]>
  upsertPreference(input: {
    userId: string
    theme: SettingsThemePreference
  }): Promise<SettingsPreferenceRow>
  updateProfile(input: {
    userId: string
    displayName: string | null
    bio: string | null
    avatarMediaId?: string | null
    bannerMediaId?: string | null
    favoriteGameIds?: string[]
  }): Promise<SettingsProfileRow | undefined>
}

export type SettingsService = {
  getSettings(input: {
    userId: string
    email: string
    appVersion: string
    buildInfo: string
  }): Promise<UserSettings>
  updateThemePreference(
    userId: string,
    theme: SettingsThemePreference
  ): Promise<Result<{ theme: SettingsThemePreference }, never>>
  updateProfile(
    userId: string,
    input: SettingsUpdateProfileInput
  ): Promise<Result<SettingsProfile, SettingsProfileError>>
}

export function createSettingsService(deps: {
  adapter: SettingsPersistenceAdapter
  media: SettingsMediaPort
  /** When set, settings profile payloads include CDN read URLs for existing media slots */
  signMediaReadUrl?: (mediaId: string) => Promise<string | null>
}): SettingsService {
  const { adapter, media, signMediaReadUrl } = deps

  return {
    async getSettings(input) {
      const profile = await adapter.findProfileByUserId(input.userId)
      if (!profile) {
        throw new Error("Profile not found.")
      }

      const [favoriteGames, preference, blockedUsers] = await Promise.all([
        adapter.findFavoriteGames(profile.id),
        adapter.findPreference(input.userId),
        adapter.listBlockedProfiles(input.userId),
      ])

      return {
        profile: await finalizeSettingsProfile(
          profile,
          favoriteGames,
          signMediaReadUrl
        ),
        account: {
          email: input.email,
        },
        display: {
          theme: preference?.theme ?? "system",
        },
        safety: {
          blockedUsers: blockedUsers.map((user) => ({ ...user })),
        },
        about: {
          appVersion: input.appVersion,
          buildInfo: input.buildInfo,
        },
      }
    },

    async updateThemePreference(userId, theme) {
      const preference = await adapter.upsertPreference({ userId, theme })
      return { ok: true, value: { theme: preference.theme } }
    },

    async updateProfile(userId, input) {
      const current = await adapter.findProfileByUserId(userId)
      if (!current) return { ok: false, error: { kind: "profile_not_found" } }

      const normalized = normalizeProfileInput(input)
      if (!normalized.ok) return normalized

      const favoriteGameIds = input.favoriteGameIds
      let favoriteGames =
        favoriteGameIds === undefined
          ? await adapter.findFavoriteGames(current.id)
          : await resolveFavoriteGames(adapter, favoriteGameIds)

      if (!Array.isArray(favoriteGames)) return favoriteGames

      // Only attach new uploads. Already-attached media sits in DB status `attached`;
      // `attachMedia` requires `ready`, so resubmitting unchanged ids would fail (e.g. user
      // adds banner while avatar id is unchanged).
      const avatarIdToAttach =
        input.avatarMediaId != null &&
        input.avatarMediaId !== current.avatarMediaId
          ? input.avatarMediaId
          : undefined
      const bannerIdToAttach =
        input.bannerMediaId != null &&
        input.bannerMediaId !== current.bannerMediaId
          ? input.bannerMediaId
          : undefined

      const avatarResult = await attachProfileMediaIfPresent({
        media,
        mediaId: avatarIdToAttach,
        userId,
        slot: "avatar",
        expectedPurpose: "profile_avatar",
      })
      if (!avatarResult.ok) return avatarResult

      const bannerResult = await attachProfileMediaIfPresent({
        media,
        mediaId: bannerIdToAttach,
        userId,
        slot: "banner",
        expectedPurpose: "profile_banner",
      })
      if (!bannerResult.ok) return bannerResult

      const updated = await adapter.updateProfile({
        userId,
        displayName: normalized.value.displayName,
        bio: normalized.value.bio,
        avatarMediaId: input.avatarMediaId,
        bannerMediaId: input.bannerMediaId,
        favoriteGameIds,
      })
      if (!updated) return { ok: false, error: { kind: "profile_not_found" } }

      if (favoriteGameIds !== undefined) {
        favoriteGames = await adapter.findFavoriteGames(updated.id)
      }

      return {
        ok: true,
        value: await finalizeSettingsProfile(
          updated,
          favoriteGames,
          signMediaReadUrl
        ),
      }
    },
  }
}

export function createInMemorySettingsService(state: {
  profiles: SettingsProfileRow[]
  games: SettingsGameRow[]
  favoriteGames: SettingsFavoriteGameRow[]
  preferences: SettingsPreferenceRow[]
  blocks: SettingsBlockRow[]
  blockProfiles: SettingsBlockedProfileRow[]
  mediaAttachments: SettingsMediaAttachment[]
}): SettingsService & {
  snapshot(): {
    profiles: SettingsProfileRow[]
    games: SettingsGameRow[]
    favoriteGames: SettingsFavoriteGameRow[]
    preferences: SettingsPreferenceRow[]
    blocks: SettingsBlockRow[]
    blockProfiles: SettingsBlockedProfileRow[]
    mediaAttachments: SettingsMediaAttachment[]
  }
} {
  const adapter: SettingsPersistenceAdapter = {
    async findProfileByUserId(userId) {
      await Promise.resolve()
      return state.profiles.find((profile) => profile.userId === userId)
    },
    async findFavoriteGames(profileId) {
      await Promise.resolve()
      return state.favoriteGames
        .filter((favorite) => favorite.profileId === profileId)
        .sort((left, right) => left.position - right.position)
        .map((favorite) =>
          state.games.find((game) => game.id === favorite.gameId)
        )
        .filter((game): game is SettingsGameRow => Boolean(game))
    },
    async findActiveGamesByIds(gameIds) {
      await Promise.resolve()
      return state.games.filter(
        (game) => game.isActive && gameIds.includes(game.id)
      )
    },
    async findPreference(userId) {
      await Promise.resolve()
      return state.preferences.find(
        (preference) => preference.userId === userId
      )
    },
    async listBlockedProfiles(userId) {
      await Promise.resolve()
      const blockedIds = state.blocks
        .filter((block) => block.blockerId === userId)
        .map((block) => block.blockedId)
      return state.blockProfiles.filter((profile) =>
        blockedIds.includes(profile.userId)
      )
    },
    async upsertPreference(input) {
      await Promise.resolve()
      const existing = state.preferences.find(
        (preference) => preference.userId === input.userId
      )
      if (existing) {
        existing.theme = input.theme
        return existing
      }

      const preference = {
        userId: input.userId,
        theme: input.theme,
      }
      state.preferences.push(preference)
      return preference
    },
    async updateProfile(input) {
      await Promise.resolve()
      const profile = state.profiles.find((row) => row.userId === input.userId)
      if (!profile) return undefined

      profile.displayName = input.displayName
      profile.bio = input.bio
      if ("avatarMediaId" in input)
        profile.avatarMediaId = input.avatarMediaId ?? null
      if ("bannerMediaId" in input)
        profile.bannerMediaId = input.bannerMediaId ?? null

      if (input.favoriteGameIds !== undefined) {
        state.favoriteGames = state.favoriteGames.filter(
          (favorite) => favorite.profileId !== profile.id
        )
        state.favoriteGames.push(
          ...input.favoriteGameIds.map((gameId, index) => ({
            profileId: profile.id,
            gameId,
            position: index + 1,
          }))
        )
      }

      return profile
    },
  }

  const media: SettingsMediaPort = {
    async attachMedia(mediaId, userId, expectedPurpose) {
      await Promise.resolve()
      state.mediaAttachments.push({ mediaId, userId, expectedPurpose })
      return { ok: true, value: { mediaId } }
    },
  }

  return {
    ...createSettingsService({ adapter, media }),
    snapshot() {
      return {
        profiles: state.profiles.map((profile) => ({ ...profile })),
        games: state.games.map((game) => ({ ...game })),
        favoriteGames: state.favoriteGames.map((favorite) => ({ ...favorite })),
        preferences: state.preferences.map((preference) => ({ ...preference })),
        blocks: state.blocks.map((row) => ({ ...row })),
        blockProfiles: state.blockProfiles.map((profile) => ({ ...profile })),
        mediaAttachments: state.mediaAttachments.map((attachment) => ({
          ...attachment,
        })),
      }
    },
  }
}

function normalizeProfileInput(
  input: SettingsUpdateProfileInput
): Result<
  { displayName: string | null; bio: string | null },
  SettingsProfileError
> {
  const displayName = input.displayName?.trim() || null
  const bio = input.bio?.trim() || null

  if (displayName && displayName.length > DISPLAY_NAME_MAX_LENGTH) {
    return {
      ok: false,
      error: {
        kind: "invalid_profile",
        message: `Display name must be at most ${DISPLAY_NAME_MAX_LENGTH} characters.`,
      },
    }
  }

  if (bio && bio.length > BIO_MAX_LENGTH) {
    return {
      ok: false,
      error: {
        kind: "invalid_profile",
        message: `Bio must be at most ${BIO_MAX_LENGTH} characters.`,
      },
    }
  }

  return { ok: true, value: { displayName, bio } }
}

async function resolveFavoriteGames(
  adapter: SettingsPersistenceAdapter,
  favoriteGameIds: string[]
): Promise<SettingsGameRow[] | Result<never, SettingsProfileError>> {
  if (favoriteGameIds.length > MAX_FAVORITE_GAMES) {
    return {
      ok: false,
      error: {
        kind: "invalid_favorite_games",
        message: `Choose at most ${MAX_FAVORITE_GAMES} favorite games.`,
      },
    }
  }

  if (new Set(favoriteGameIds).size !== favoriteGameIds.length) {
    return {
      ok: false,
      error: {
        kind: "invalid_favorite_games",
        message: "Favorite games must be unique.",
      },
    }
  }

  const games = await adapter.findActiveGamesByIds(favoriteGameIds)
  if (games.length !== favoriteGameIds.length) {
    return {
      ok: false,
      error: {
        kind: "invalid_favorite_games",
        message: "Favorite games must be active seeded games.",
      },
    }
  }

  const byId = new Map(games.map((game) => [game.id, game]))
  return favoriteGameIds.map((gameId) => byId.get(gameId)!)
}

async function attachProfileMediaIfPresent(input: {
  media: SettingsMediaPort
  mediaId: string | null | undefined
  userId: string
  slot: "avatar" | "banner"
  expectedPurpose: Extract<MediaPurpose, "profile_avatar" | "profile_banner">
}): Promise<Result<{ mediaId?: string }, SettingsProfileError>> {
  if (!input.mediaId) return { ok: true, value: {} }

  const result = await input.media.attachMedia(
    input.mediaId,
    input.userId,
    input.expectedPurpose
  )
  if (!result.ok) {
    return {
      ok: false,
      error: {
        kind: "media_attachment_failed",
        slot: input.slot,
        reason: result.error.kind,
      },
    }
  }

  return { ok: true, value: { mediaId: result.value.mediaId } }
}

type SettingsProfileBase = Omit<SettingsProfile, "avatarUrl" | "bannerUrl">

function toSettingsProfile(
  row: SettingsProfileRow,
  favoriteGames: SettingsGameRow[]
): SettingsProfileBase {
  return {
    username: row.username,
    displayName: row.displayName,
    bio: row.bio,
    avatarMediaId: row.avatarMediaId,
    bannerMediaId: row.bannerMediaId,
    favoriteGames: favoriteGames.map((game) => ({
      id: game.id,
      slug: game.slug,
      name: game.name,
    })),
  }
}

async function finalizeSettingsProfile(
  row: SettingsProfileRow,
  favoriteGames: SettingsGameRow[],
  signMediaReadUrl?: (mediaId: string) => Promise<string | null>
): Promise<SettingsProfile> {
  const base = toSettingsProfile(row, favoriteGames)
  if (!signMediaReadUrl) {
    return { ...base, avatarUrl: null, bannerUrl: null }
  }
  const [avatarUrl, bannerUrl] = await Promise.all([
    row.avatarMediaId
      ? signMediaReadUrl(row.avatarMediaId)
      : Promise.resolve(null),
    row.bannerMediaId
      ? signMediaReadUrl(row.bannerMediaId)
      : Promise.resolve(null),
  ])
  return { ...base, avatarUrl, bannerUrl }
}
