import { describe, expect, it } from "vitest"
import { createGameSlug } from "@workspace/types"
import {
  createInMemoryGameService,
  type GameCatalogEntry,
} from "../services/game/game.core.js"
import { applyGameSeed } from "../services/game/game.seed.js"

describe("Game catalog service", () => {
  it("keeps inactive games viewable by slug while excluding them from active selection lists", async () => {
    const games = createInMemoryGameService({
      games: [
        {
          id: "game-active",
          slug: "stardew-valley",
          name: "Stardew Valley",
          description: "A cozy farming RPG.",
          aliases: ["sdv"],
          coverImageUrl: "/game-covers/default.svg",
          isActive: true,
        },
        {
          id: "game-inactive",
          slug: "retired-game",
          name: "Retired Game",
          description: null,
          aliases: [],
          coverImageUrl: null,
          isActive: false,
        },
      ],
      profiles: [],
      favorites: [],
    })

    await expect(
      games.getBySlug(gameSlug("retired-game"), null)
    ).resolves.toMatchObject({
      ok: true,
      value: {
        game: {
          slug: "retired-game",
          isActive: false,
        },
        isFavorite: false,
      },
    })

    await expect(games.listActive()).resolves.toEqual([
      expect.objectContaining({ slug: "stardew-valley" }),
    ])
  })

  it("lets onboarded users add and remove active favorite games up to the v1 limit", async () => {
    const games = createInMemoryGameService({
      games: [
        game("game-a", "game-a", true),
        game("game-b", "game-b", true),
        game("game-c", "game-c", true),
        game("game-d", "game-d", true),
        game("game-e", "game-e", true),
        game("game-f", "game-f", true),
        game("inactive", "inactive", false),
      ],
      profiles: [{ id: "profile-1", userId: "user-1" }],
      favorites: [],
    })

    await expect(
      games.setFavorite({
        userId: "user-1",
        slug: gameSlug("inactive"),
        favorite: true,
      })
    ).resolves.toEqual({
      ok: false,
      error: { kind: "inactive_game" },
    })

    for (const value of ["game-a", "game-b", "game-c", "game-d", "game-e"]) {
      await expect(
        games.setFavorite({
          userId: "user-1",
          slug: gameSlug(value),
          favorite: true,
        })
      ).resolves.toMatchObject({ ok: true })
    }

    await expect(
      games.setFavorite({
        userId: "user-1",
        slug: gameSlug("game-f"),
        favorite: true,
      })
    ).resolves.toEqual({
      ok: false,
      error: { kind: "too_many_favorites" },
    })

    await expect(
      games.setFavorite({
        userId: "user-1",
        slug: gameSlug("game-b"),
        favorite: false,
      })
    ).resolves.toMatchObject({
      ok: true,
      value: [
        { slug: "game-a", position: 1 },
        { slug: "game-c", position: 2 },
        { slug: "game-d", position: 3 },
        { slug: "game-e", position: 4 },
      ],
    })
  })

  it("applies seeded games idempotently by immutable slug without deleting existing rows", async () => {
    const rows: GameCatalogEntry[] = [
      {
        id: "existing-id",
        slug: "stardew-valley",
        name: "Old Stardew",
        description: null,
        aliases: [],
        coverImageUrl: null,
        isActive: true,
      },
      game("preserved-id", "preserved-game", false),
    ]

    const result = await applyGameSeed(
      {
        upsertBySlug(seed) {
          const existing = rows.find((row) => row.slug === seed.slug)
          if (existing) {
            Object.assign(existing, seed)
            return Promise.resolve({ game: { ...existing }, created: false })
          }

          const inserted = { id: `new-${seed.slug}`, ...seed }
          rows.push(inserted)
          return Promise.resolve({ game: inserted, created: true })
        },
      },
      [
        {
          slug: "stardew-valley",
          name: "Stardew Valley",
          description: "A cozy farming RPG.",
          aliases: ["sdv"],
          coverImageUrl: "/game-covers/default.svg",
          isActive: true,
        },
        {
          slug: "rocket-league",
          name: "Rocket League",
          description: "Car soccer with friends.",
          aliases: ["rl"],
          coverImageUrl: "/game-covers/default.svg",
          isActive: true,
        },
      ]
    )

    expect(result).toEqual({
      inserted: 1,
      updated: 1,
      total: 2,
    })
    expect(rows).toEqual([
      expect.objectContaining({
        id: "existing-id",
        slug: "stardew-valley",
        name: "Stardew Valley",
        aliases: ["sdv"],
      }),
      expect.objectContaining({
        id: "preserved-id",
        slug: "preserved-game",
      }),
      expect.objectContaining({
        id: "new-rocket-league",
        slug: "rocket-league",
      }),
    ])
  })
})

function game(id: string, slug: string, isActive: boolean) {
  return {
    id,
    slug,
    name: slug,
    description: null,
    aliases: [],
    coverImageUrl: null,
    isActive,
  }
}

function gameSlug(value: string) {
  const result = createGameSlug(value)
  if (!result.ok) throw result.error
  return result.value
}
