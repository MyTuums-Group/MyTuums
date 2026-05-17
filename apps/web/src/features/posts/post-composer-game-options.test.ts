import { describe, expect, it } from "vitest"
import { getPostComposerGameOptions } from "./post-composer-game-options"

const activeGames = [
  { id: "game-celeste", slug: "celeste", name: "Celeste" },
  { id: "game-hades", slug: "hades", name: "Hades" },
  { id: "game-halo", slug: "halo-infinite", name: "Halo Infinite" },
  { id: "game-zelda", slug: "tears-of-the-kingdom", name: "Zelda" },
]

describe("post composer game options", () => {
  it("puts favorite games first in favorite display order", () => {
    expect(
      getPostComposerGameOptions({
        activeGames,
        favoriteGames: [
          { id: "game-hades", position: 2 },
          { id: "game-zelda", position: 1 },
        ],
      }).map((game) => game.id)
    ).toEqual(["game-zelda", "game-hades", "game-celeste", "game-halo"])
  })

  it("keeps the active game order when the viewer has no favorites", () => {
    expect(
      getPostComposerGameOptions({
        activeGames,
        favoriteGames: [],
      }).map((game) => game.id)
    ).toEqual(activeGames.map((game) => game.id))
  })

  it("filters across favorite and non-favorite game options", () => {
    expect(
      getPostComposerGameOptions({
        activeGames,
        favoriteGames: [{ id: "game-hades", position: 1 }],
        query: "ha",
      }).map((game) => game.id)
    ).toEqual(["game-hades", "game-halo"])
  })
})
