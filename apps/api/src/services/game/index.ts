export { createGameSlug } from "./game.policy.js";
export {
  getBySlug,
  listActive,
  listFavoritesByUserId,
  setFavorite,
} from "./game.js";
export {
  createGameService,
  createInMemoryGameService,
  type FavoriteGameError,
  type FavoriteGameView,
  type GameAccessError,
  type GameCatalogAdapter,
  type GameCatalogEntry,
  type GamePageView,
  type GameService,
  type SetFavoriteGameInput,
} from "./game.core.js";
export {
  applyGameSeed,
  type GameSeedAdapter,
  type GameSeedResult,
  type SeedGame,
} from "./game.seed.js";
