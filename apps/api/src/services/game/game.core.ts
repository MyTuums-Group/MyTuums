import { MAX_FAVORITE_GAMES, type Result } from "@workspace/types";

export type GameCatalogEntry = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  aliases: string[];
  coverImageUrl: string | null;
  isActive: boolean;
};

export type FavoriteGameView = Pick<
  GameCatalogEntry,
  "id" | "slug" | "name" | "coverImageUrl" | "isActive"
> & {
  position: number;
};

export type GamePageView = {
  game: GameCatalogEntry;
  isFavorite: boolean;
};

export type GameAccessError = { kind: "not_found" };

export type FavoriteGameError =
  | { kind: "not_found" }
  | { kind: "inactive_game" }
  | { kind: "profile_required" }
  | { kind: "too_many_favorites" };

export type SetFavoriteGameInput = {
  userId: string;
  slug: string;
  favorite: boolean;
};

export type GameCatalogAdapter = {
  findBySlug(slug: string): Promise<GameCatalogEntry | undefined>;
  listActive(): Promise<GameCatalogEntry[]>;
  isFavorite(userId: string, gameId: string): Promise<boolean>;
  listFavoritesByUserId(userId: string): Promise<FavoriteGameView[]>;
  setFavorite(input: {
    userId: string;
    game: GameCatalogEntry;
    favorite: boolean;
  }): Promise<Result<FavoriteGameView[], FavoriteGameError>>;
};

export type GameService = {
  getBySlug(
    slug: string,
    viewerUserId: string | null
  ): Promise<Result<GamePageView, GameAccessError>>;
  listActive(): Promise<GameCatalogEntry[]>;
  listFavoritesByUserId(userId: string): Promise<FavoriteGameView[]>;
  setFavorite(
    input: SetFavoriteGameInput
  ): Promise<Result<FavoriteGameView[], FavoriteGameError>>;
};

export function createGameService(adapter: GameCatalogAdapter): GameService {
  return {
    async getBySlug(slug, viewerUserId) {
      const game = await adapter.findBySlug(slug);
      if (!game) return { ok: false, error: { kind: "not_found" } };

      return {
        ok: true,
        value: {
          game,
          isFavorite: viewerUserId
            ? await adapter.isFavorite(viewerUserId, game.id)
            : false,
        },
      };
    },

    listActive() {
      return adapter.listActive();
    },

    listFavoritesByUserId(userId) {
      return adapter.listFavoritesByUserId(userId);
    },

    async setFavorite(input) {
      const game = await adapter.findBySlug(input.slug);
      if (!game) return { ok: false, error: { kind: "not_found" } };
      if (input.favorite && !game.isActive) {
        return { ok: false, error: { kind: "inactive_game" } };
      }

      return adapter.setFavorite({
        userId: input.userId,
        game,
        favorite: input.favorite,
      });
    },
  };
}

export function createInMemoryGameService(state: {
  games: GameCatalogEntry[];
  profiles: { id: string; userId: string }[];
  favorites: { profileId: string; gameId: string; position: number }[];
}): GameService & {
  snapshot(): {
    games: GameCatalogEntry[];
    favorites: { profileId: string; gameId: string; position: number }[];
  };
} {
  const adapter: GameCatalogAdapter = {
    findBySlug(slug) {
      return Promise.resolve(state.games.find((game) => game.slug === slug));
    },

    listActive() {
      return Promise.resolve(state.games.filter((game) => game.isActive));
    },

    isFavorite(userId, gameId) {
      const profile = state.profiles.find(
        (profile) => profile.userId === userId
      );
      if (!profile) return Promise.resolve(false);
      return Promise.resolve(
        state.favorites.some(
          (favorite) =>
            favorite.profileId === profile.id && favorite.gameId === gameId
        )
      );
    },

    listFavoritesByUserId(userId) {
      return Promise.resolve(listFavoriteViewsForUser(state, userId));
    },

    setFavorite({ userId, game, favorite }) {
      const profile = state.profiles.find(
        (profile) => profile.userId === userId
      );
      if (!profile) {
        return Promise.resolve({
          ok: false,
          error: { kind: "profile_required" },
        });
      }

      const existing = state.favorites.find(
        (row) => row.profileId === profile.id && row.gameId === game.id
      );

      if (favorite) {
        if (existing) {
          return Promise.resolve({
            ok: true,
            value: listFavoriteViewsForUser(state, userId),
          });
        }

        const currentFavorites = state.favorites.filter(
          (row) => row.profileId === profile.id
        );
        if (currentFavorites.length >= MAX_FAVORITE_GAMES) {
          return Promise.resolve({
            ok: false,
            error: { kind: "too_many_favorites" },
          });
        }

        state.favorites.push({
          profileId: profile.id,
          gameId: game.id,
          position: currentFavorites.length + 1,
        });
      } else if (existing) {
        state.favorites = state.favorites.filter((row) => row !== existing);
        reindexFavoritePositions(state, profile.id);
      }

      return Promise.resolve({
        ok: true,
        value: listFavoriteViewsForUser(state, userId),
      });
    },
  };

  return {
    ...createGameService(adapter),
    snapshot() {
      return {
        games: [...state.games],
        favorites: [...state.favorites],
      };
    },
  };
}

function listFavoriteViewsForUser(
  state: {
    games: GameCatalogEntry[];
    profiles: { id: string; userId: string }[];
    favorites: { profileId: string; gameId: string; position: number }[];
  },
  userId: string
): FavoriteGameView[] {
  const profile = state.profiles.find((profile) => profile.userId === userId);
  if (!profile) return [];

  return state.favorites
    .filter((favorite) => favorite.profileId === profile.id)
    .sort((left, right) => left.position - right.position)
    .flatMap((favorite) => {
      const game = state.games.find((game) => game.id === favorite.gameId);
      if (!game) return [];
      return [
        {
          id: game.id,
          slug: game.slug,
          name: game.name,
          coverImageUrl: game.coverImageUrl,
          isActive: game.isActive,
          position: favorite.position,
        },
      ];
    });
}

function reindexFavoritePositions(
  state: {
    favorites: { profileId: string; gameId: string; position: number }[];
  },
  profileId: string
) {
  state.favorites
    .filter((favorite) => favorite.profileId === profileId)
    .sort((left, right) => left.position - right.position)
    .forEach((favorite, index) => {
      favorite.position = index + 1;
    });
}
