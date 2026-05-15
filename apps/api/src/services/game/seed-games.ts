import { upsertSeedGameBySlug } from "./game.adapter.js";
import { applyGameSeed } from "./game.seed.js";
import { GAME_SEED_DATA } from "./game.seed-data.js";

const result = await applyGameSeed(
  { upsertBySlug: upsertSeedGameBySlug },
  GAME_SEED_DATA
);

console.log(
  `Seeded games: ${result.inserted} inserted, ${result.updated} updated, ${result.total} total.`
);
