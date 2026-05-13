import type { Result, Username, ViewerContext, AuthorizationAdapter } from "@workspace/types";
import { validateOnboardingInput, validateFavoriteGameIds } from "./profile.policy.js";

export type OnboardingError =
  | { kind: "invalid_username"; message: string }
  | { kind: "invalid_favorite_games"; message: string }
  | { kind: "already_has_profile" }
  | { kind: "username_taken" };

export type ProfileAccessError =
  | { kind: "not_found" }
  | { kind: "not_visible" };

export type ProfileRow = {
  id: string;
  userId: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  createdAt: Date;
};

export type PublicProfile = {
  username: string;
  displayName: string | null;
  bio: string | null;
  createdAt: Date;
};

export type ProfileOnboardingInput = {
  username: string;
  displayName?: string | null;
  bio?: string | null;
  favoriteGameIds?: string[];
};

export type FavoriteGameInsert = {
  profileId: string;
  gameId: string;
  position: number;
};

export type ProfileOnboardingAdapter = {
  existsByUserId(userId: string): Promise<boolean>;
  findByUserId(userId: string): Promise<ProfileRow | undefined>;
  findByUsername(username: string): Promise<ProfileRow | undefined>;
  findActiveSeededGameIds(gameIds: string[]): Promise<string[]>;
  createOnboarding(values: {
    userId: string;
    username: Username;
    displayName: string | null;
    bio: string | null;
    favoriteGames: { gameId: string; position: number }[];
  }): Promise<ProfileRow>;
};

export type ProfileService = {
  submitOnboarding(userId: string, input: ProfileOnboardingInput): Promise<Result<PublicProfile, OnboardingError>>;
  getMyProfile(userId: string): Promise<PublicProfile | null>;
  getByUsername(username: string, viewerCtx: ViewerContext | null, authorization: AuthorizationAdapter): Promise<Result<PublicProfile, ProfileAccessError>>;
  getOwnerByUsername(
    username: string,
    viewerCtx: ViewerContext | null,
    authorization: AuthorizationAdapter,
  ): Promise<Result<{ userId: string }, ProfileAccessError>>;
  checkProfileExists(userId: string): Promise<{ hasProfile: boolean }>;
};

export function createProfileService(adapter: ProfileOnboardingAdapter): ProfileService {
  return {
    async submitOnboarding(userId, input) {
      const validated = validateOnboardingInput(input);
      if (!validated.ok) {
        return { ok: false, error: { kind: "invalid_username", message: validated.error.message } };
      }

      const favoriteGameIds = input.favoriteGameIds ?? [];
      const validatedFavorites = validateFavoriteGameIds(favoriteGameIds);
      if (!validatedFavorites.ok) {
        return { ok: false, error: { kind: "invalid_favorite_games", message: validatedFavorites.error.message } };
      }

      const activeGameIds = await adapter.findActiveSeededGameIds(validatedFavorites.value);
      if (activeGameIds.length !== validatedFavorites.value.length) {
        return { ok: false, error: { kind: "invalid_favorite_games", message: "Favorite games must be active seeded games." } };
      }

      const exists = await adapter.existsByUserId(userId);
      if (exists) return { ok: false, error: { kind: "already_has_profile" } };

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
        });
        return { ok: true, value: toPublicProfile(row) };
      } catch (err) {
        if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "23505") {
          return { ok: false, error: { kind: "username_taken" } };
        }
        throw err;
      }
    },

    async getMyProfile(userId) {
      const row = await adapter.findByUserId(userId);
      return row ? toPublicProfile(row) : null;
    },

    async getByUsername(username, viewerCtx, authorization) {
      const row = await adapter.findByUsername(username);
      if (!row) return { ok: false, error: { kind: "not_found" } };
      if (viewerCtx && !authorization.canView(viewerCtx, { type: "profile", userId: row.userId })) {
        return { ok: false, error: { kind: "not_visible" } };
      }
      return { ok: true, value: toPublicProfile(row) };
    },

    async getOwnerByUsername(username, viewerCtx, authorization) {
      const row = await adapter.findByUsername(username);
      if (!row) return { ok: false, error: { kind: "not_found" } };
      if (viewerCtx && !authorization.canView(viewerCtx, { type: "profile", userId: row.userId })) {
        return { ok: false, error: { kind: "not_visible" } };
      }
      return { ok: true, value: { userId: row.userId } };
    },

    async checkProfileExists(userId) {
      return { hasProfile: await adapter.existsByUserId(userId) };
    },
  };
}

export function createInMemoryProfileOnboardingService(state: {
  profiles: ProfileRow[];
  games: { id: string; isActive: boolean }[];
  favoriteGames: FavoriteGameInsert[];
  failFavoriteGameInsert?: boolean;
}): ProfileService & { snapshot(): { profiles: ProfileRow[]; favoriteGames: FavoriteGameInsert[] } } {
  let nextProfile = state.profiles.length + 1;
  const adapter: ProfileOnboardingAdapter = {
    existsByUserId(userId) {
      return Promise.resolve(state.profiles.some((profile) => profile.userId === userId));
    },
    findByUserId(userId) {
      return Promise.resolve(state.profiles.find((profile) => profile.userId === userId));
    },
    findByUsername(username) {
      return Promise.resolve(state.profiles.find((profile) => profile.username === username.toLowerCase()));
    },
    findActiveSeededGameIds(gameIds) {
      const active = state.games.filter((game) => game.isActive && gameIds.includes(game.id)).map((game) => game.id);
      return Promise.resolve(active);
    },
    createOnboarding(values) {
      const snapshotProfiles = [...state.profiles];
      const snapshotFavorites = [...state.favoriteGames];
      const row: ProfileRow = {
        id: `profile-${nextProfile++}`,
        userId: values.userId,
        username: values.username,
        displayName: values.displayName,
        bio: values.bio,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      };
      state.profiles.push(row);
      try {
        if (state.failFavoriteGameInsert) throw new Error("favorite-game insert failed");
        state.favoriteGames.push(
          ...values.favoriteGames.map((favorite) => ({
            profileId: row.id,
            gameId: favorite.gameId,
            position: favorite.position,
          })),
        );
      } catch (error) {
        state.profiles = snapshotProfiles;
        state.favoriteGames = snapshotFavorites;
        throw error;
      }
      return Promise.resolve(row);
    },
  };
  return {
    ...createProfileService(adapter),
    snapshot() {
      return { profiles: [...state.profiles], favoriteGames: [...state.favoriteGames] };
    },
  };
}

function toPublicProfile(row: ProfileRow): PublicProfile {
  return {
    username: row.username,
    displayName: row.displayName,
    bio: row.bio,
    createdAt: row.createdAt,
  };
}
