import type {
  AccountStatus,
  Result,
  Username,
  ViewerContext,
  AuthorizationAdapter,
} from "@workspace/types"
import {
  validateOnboardingInput,
  validateFavoriteGameIds,
} from "./profile.policy.js"

export type OnboardingError =
  | { kind: "invalid_username"; message: string }
  | { kind: "invalid_favorite_games"; message: string }
  | { kind: "already_has_profile" }
  | { kind: "username_taken" }

export type ProfileAccessError = { kind: "not_found" } | { kind: "not_visible" }

export type UsernameAvailability =
  | { status: "invalid"; normalizedUsername: string; message: string }
  | { status: "taken"; normalizedUsername: string; message: string }
  | { status: "available"; normalizedUsername: string }

export type ProfileRow = {
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
  accountStatus?: AccountStatus
}

export type PublicProfile = {
  username: string
  displayName: string | null
  bio: string | null
  followerCount: number
  followingCount: number
  createdAt: Date
  /** Signed read URL when profile has avatar media; otherwise null */
  avatarUrl: string | null
  /** Signed read URL when profile has banner media; otherwise null */
  bannerUrl: string | null
}

export type ProfileServiceDeps = {
  adapter: ProfileOnboardingAdapter
  /** When set, public profile responses include time-limited blob read URLs */
  signMediaReadUrl?: (mediaId: string) => Promise<string | null>
}

export type ProfileOnboardingInput = {
  username: string
  displayName?: string | null
  bio?: string | null
  favoriteGameIds?: string[]
}

export type FavoriteGameInsert = {
  profileId: string
  gameId: string
  position: number
}

export type ProfileOnboardingAdapter = {
  existsByUserId(userId: string): Promise<boolean>
  findByUserId(userId: string): Promise<ProfileRow | undefined>
  findByUsername(username: string): Promise<ProfileRow | undefined>
  isUsernameHeld(username: Username, now: Date): Promise<boolean>
  findActiveSeededGameIds(gameIds: string[]): Promise<string[]>
  createOnboarding(values: {
    userId: string
    username: Username
    displayName: string | null
    bio: string | null
    favoriteGames: { gameId: string; position: number }[]
  }): Promise<ProfileRow>
}

export type ProfileService = {
  submitOnboarding(
    userId: string,
    input: ProfileOnboardingInput
  ): Promise<Result<PublicProfile, OnboardingError>>
  checkUsernameAvailability(username: string): Promise<UsernameAvailability>
  getMyProfile(userId: string): Promise<PublicProfile | null>
  getByUsername(
    username: string,
    viewerCtx: ViewerContext | null,
    authorization: AuthorizationAdapter
  ): Promise<Result<PublicProfile, ProfileAccessError>>
  getOwnerByUsername(
    username: string,
    viewerCtx: ViewerContext | null,
    authorization: AuthorizationAdapter
  ): Promise<Result<{ userId: string }, ProfileAccessError>>
  checkProfileExists(userId: string): Promise<{ hasProfile: boolean }>
}

export function createProfileService(
  deps: ProfileOnboardingAdapter | ProfileServiceDeps
): ProfileService {
  const adapter = "adapter" in deps ? deps.adapter : deps
  const signMediaReadUrl = "adapter" in deps ? deps.signMediaReadUrl : undefined

  return {
    async submitOnboarding(userId, input) {
      const validated = validateOnboardingInput(input)
      if (!validated.ok) {
        return {
          ok: false,
          error: { kind: "invalid_username", message: validated.error.message },
        }
      }

      const favoriteGameIds = input.favoriteGameIds ?? []
      const validatedFavorites = validateFavoriteGameIds(favoriteGameIds)
      if (!validatedFavorites.ok) {
        return {
          ok: false,
          error: {
            kind: "invalid_favorite_games",
            message: validatedFavorites.error.message,
          },
        }
      }

      const activeGameIds = await adapter.findActiveSeededGameIds(
        validatedFavorites.value
      )
      if (activeGameIds.length !== validatedFavorites.value.length) {
        return {
          ok: false,
          error: {
            kind: "invalid_favorite_games",
            message: "Favorite games must be active seeded games.",
          },
        }
      }

      const exists = await adapter.existsByUserId(userId)
      if (exists) return { ok: false, error: { kind: "already_has_profile" } }

      const usernameHeld = await adapter.isUsernameHeld(
        validated.value.username,
        new Date()
      )
      if (usernameHeld) return { ok: false, error: { kind: "username_taken" } }

      try {
        const row = await adapter.createOnboarding({
          userId,
          username: validated.value.username,
          displayName: validated.value.displayName,
          bio: validated.value.bio,
          favoriteGames: validatedFavorites.value.map((gameId, index) => ({
            gameId,
            position: index + 1,
          })),
        })
        return { ok: true, value: await toPublicProfile(row, signMediaReadUrl) }
      } catch (err) {
        if (
          typeof err === "object" &&
          err !== null &&
          "code" in err &&
          (err as { code: string }).code === "23505"
        ) {
          return { ok: false, error: { kind: "username_taken" } }
        }
        throw err
      }
    },

    async checkUsernameAvailability(username) {
      const validated = validateOnboardingInput({ username })
      const normalizedUsername = username.trim().toLowerCase()
      if (!validated.ok) {
        return {
          status: "invalid",
          normalizedUsername,
          message: validated.error.message,
        }
      }

      const [existingProfile, usernameHeld] = await Promise.all([
        adapter.findByUsername(validated.value.username),
        adapter.isUsernameHeld(validated.value.username, new Date()),
      ])

      if (existingProfile || usernameHeld) {
        return {
          status: "taken",
          normalizedUsername: validated.value.username,
          message: "This username is already taken.",
        }
      }

      return {
        status: "available",
        normalizedUsername: validated.value.username,
      }
    },

    async getMyProfile(userId) {
      const row = await adapter.findByUserId(userId)
      return row ? await toPublicProfile(row, signMediaReadUrl) : null
    },

    async getByUsername(username, viewerCtx, authorization) {
      const row = await adapter.findByUsername(username)
      if (!row) return { ok: false, error: { kind: "not_found" } }
      if (row.accountStatus && row.accountStatus !== "active") {
        return { ok: false, error: { kind: "not_found" } }
      }
      if (
        viewerCtx &&
        !authorization.canView(viewerCtx, {
          type: "profile",
          userId: row.userId,
        })
      ) {
        return { ok: false, error: { kind: "not_visible" } }
      }
      return { ok: true, value: await toPublicProfile(row, signMediaReadUrl) }
    },

    async getOwnerByUsername(username, viewerCtx, authorization) {
      const row = await adapter.findByUsername(username)
      if (!row) return { ok: false, error: { kind: "not_found" } }
      if (row.accountStatus && row.accountStatus !== "active") {
        return { ok: false, error: { kind: "not_found" } }
      }
      if (
        viewerCtx &&
        !authorization.canView(viewerCtx, {
          type: "profile",
          userId: row.userId,
        })
      ) {
        return { ok: false, error: { kind: "not_visible" } }
      }
      return { ok: true, value: { userId: row.userId } }
    },

    async checkProfileExists(userId) {
      return { hasProfile: await adapter.existsByUserId(userId) }
    },
  }
}

export function createInMemoryProfileOnboardingService(state: {
  profiles: ProfileRow[]
  games: { id: string; isActive: boolean }[]
  favoriteGames: FavoriteGameInsert[]
  usernameHolds?: { username: string; heldUntil: Date }[]
  failFavoriteGameInsert?: boolean
}): ProfileService & {
  snapshot(): { profiles: ProfileRow[]; favoriteGames: FavoriteGameInsert[] }
} {
  let nextProfile = state.profiles.length + 1
  const adapter: ProfileOnboardingAdapter = {
    existsByUserId(userId) {
      return Promise.resolve(
        state.profiles.some((profile) => profile.userId === userId)
      )
    },
    findByUserId(userId) {
      return Promise.resolve(
        state.profiles.find((profile) => profile.userId === userId)
      )
    },
    findByUsername(username) {
      return Promise.resolve(
        state.profiles.find(
          (profile) => profile.username === username.toLowerCase()
        )
      )
    },
    isUsernameHeld(username, now) {
      return Promise.resolve(
        state.usernameHolds?.some(
          (hold) =>
            hold.username.toLowerCase() === username.toLowerCase() &&
            hold.heldUntil.getTime() > now.getTime()
        ) ?? false
      )
    },
    findActiveSeededGameIds(gameIds) {
      const active = state.games
        .filter((game) => game.isActive && gameIds.includes(game.id))
        .map((game) => game.id)
      return Promise.resolve(active)
    },
    createOnboarding(values) {
      const snapshotProfiles = [...state.profiles]
      const snapshotFavorites = [...state.favoriteGames]
      const row: ProfileRow = {
        id: `profile-${nextProfile++}`,
        userId: values.userId,
        username: values.username,
        displayName: values.displayName,
        bio: values.bio,
        avatarMediaId: null,
        bannerMediaId: null,
        followerCount: 0,
        followingCount: 0,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      }
      state.profiles.push(row)
      try {
        if (state.failFavoriteGameInsert)
          throw new Error("favorite-game insert failed")
        state.favoriteGames.push(
          ...values.favoriteGames.map((favorite) => ({
            profileId: row.id,
            gameId: favorite.gameId,
            position: favorite.position,
          }))
        )
      } catch (error) {
        state.profiles = snapshotProfiles
        state.favoriteGames = snapshotFavorites
        throw error
      }
      return Promise.resolve(row)
    },
  }
  return {
    ...createProfileService({ adapter }),
    snapshot() {
      return {
        profiles: [...state.profiles],
        favoriteGames: [...state.favoriteGames],
      }
    },
  }
}

async function toPublicProfile(
  row: ProfileRow,
  signMediaReadUrl?: (mediaId: string) => Promise<string | null>
): Promise<PublicProfile> {
  const [avatarUrl, bannerUrl] = await Promise.all([
    row.avatarMediaId && signMediaReadUrl
      ? signMediaReadUrl(row.avatarMediaId)
      : Promise.resolve(null),
    row.bannerMediaId && signMediaReadUrl
      ? signMediaReadUrl(row.bannerMediaId)
      : Promise.resolve(null),
  ])

  return {
    username: row.username,
    displayName: row.displayName,
    bio: row.bio,
    followerCount: row.followerCount,
    followingCount: row.followingCount,
    createdAt: row.createdAt,
    avatarUrl,
    bannerUrl,
  }
}
