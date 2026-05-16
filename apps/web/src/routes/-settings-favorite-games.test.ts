import { describe, expect, it } from "vitest"
import {
  getFavoriteGameSearchOptions,
  getFavoriteGameSearchStatus,
} from "./-settings-favorite-games"

type SearchResponse = NonNullable<
  Parameters<typeof getFavoriteGameSearchOptions>[0]
>

describe("settings favorite game search", () => {
  it("keeps only unselected game results for the settings picker", () => {
    const search = {
      users: [
        {
          type: "user",
          id: "profile-1",
          label: "Aster",
          href: "/@aster",
          username: "aster",
        },
      ],
      games: [
        {
          type: "game",
          id: "game-hades",
          label: "Hades",
          href: "/game/hades",
          slug: "hades",
        },
        {
          type: "game",
          id: "game-celeste",
          label: "Celeste",
          href: "/game/celeste",
          slug: "celeste",
        },
      ],
      results: [
        {
          type: "user",
          id: "profile-1",
          label: "Aster",
          href: "/@aster",
          username: "aster",
        },
        {
          type: "game",
          id: "game-hades",
          label: "Hades",
          href: "/game/hades",
          slug: "hades",
        },
        {
          type: "game",
          id: "game-celeste",
          label: "Celeste",
          href: "/game/celeste",
          slug: "celeste",
        },
      ],
    } satisfies SearchResponse

    expect(
      getFavoriteGameSearchOptions(search, [
        { id: "game-hades", slug: "hades", name: "Hades" },
      ])
    ).toEqual([{ id: "game-celeste", slug: "celeste", name: "Celeste" }])
  })

  it("reports the field state used by the dropdown", () => {
    expect(
      getFavoriteGameSearchStatus({
        isDisabled: true,
        isLoading: false,
        query: "ha",
        resultCount: 0,
      })
    ).toBe("disabled")
    expect(
      getFavoriteGameSearchStatus({
        isDisabled: false,
        isLoading: false,
        query: "",
        resultCount: 0,
      })
    ).toBe("empty")
    expect(
      getFavoriteGameSearchStatus({
        isDisabled: false,
        isLoading: false,
        query: "h",
        resultCount: 0,
      })
    ).toBe("too_short")
    expect(
      getFavoriteGameSearchStatus({
        isDisabled: false,
        isLoading: true,
        query: "ha",
        resultCount: 0,
      })
    ).toBe("loading")
    expect(
      getFavoriteGameSearchStatus({
        isDisabled: false,
        isLoading: true,
        query: "ha",
        resultCount: 1,
      })
    ).toBe("results")
    expect(
      getFavoriteGameSearchStatus({
        isDisabled: false,
        isLoading: false,
        query: "ha",
        resultCount: 0,
      })
    ).toBe("no_results")
  })
})
