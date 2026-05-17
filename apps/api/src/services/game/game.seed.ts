import type { GameCatalogEntry } from "./game.core.js"
import { createGameSlug } from "@workspace/types"

export type SeedGame = Omit<GameCatalogEntry, "id">

export type GameSeedAdapter = {
  upsertBySlug(seed: SeedGame): Promise<{
    game: GameCatalogEntry
    created: boolean
  }>
}

export type GameSeedResult = {
  inserted: number
  updated: number
  total: number
}

export async function applyGameSeed(
  adapter: GameSeedAdapter,
  seeds: SeedGame[]
): Promise<GameSeedResult> {
  let inserted = 0
  let updated = 0

  for (const seed of seeds) {
    const slug = createGameSlug(seed.slug)
    if (!slug.ok) {
      throw slug.error
    }

    const result = await adapter.upsertBySlug({
      ...seed,
      slug: slug.value,
      aliases: [...seed.aliases],
    })

    if (result.created) {
      inserted += 1
    } else {
      updated += 1
    }
  }

  return {
    inserted,
    updated,
    total: seeds.length,
  }
}
