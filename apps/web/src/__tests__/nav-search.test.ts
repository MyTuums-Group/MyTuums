import { describe, expect, it } from "vitest"
import {
  getDiscoverSearchHref,
  groupNavSearchResults,
  shouldStartNavSearch,
} from "../components/app-shell-search"

describe("nav search helpers", () => {
  it("starts typeahead only after two trimmed characters", () => {
    expect(shouldStartNavSearch("a")).toBe(false)
    expect(shouldStartNavSearch("  ab  ")).toBe(true)
  })

  it("builds Discover links from submitted search text", () => {
    expect(getDiscoverSearchHref("")).toBe("/discover")
    expect(getDiscoverSearchHref(" café racer ")).toBe(
      "/discover?q=caf%C3%A9+racer"
    )
  })

  it("keeps nav typeahead groups capped independently", () => {
    const grouped = groupNavSearchResults({
      users: [user("1"), user("2"), user("3"), user("4")],
      games: [game("1"), game("2"), game("3"), game("4")],
      results: [],
    })

    expect(grouped.users.map((item) => item.username)).toEqual([
      "user-1",
      "user-2",
      "user-3",
    ])
    expect(grouped.games.map((item) => item.slug)).toEqual([
      "game-1",
      "game-2",
      "game-3",
    ])
  })
})

function user(id: string) {
  return {
    type: "user" as const,
    id: `user-id-${id}`,
    label: `User ${id}`,
    href: `/@user-${id}`,
    username: `user-${id}`,
  }
}

function game(id: string) {
  return {
    type: "game" as const,
    id: `game-id-${id}`,
    label: `Game ${id}`,
    href: `/game/game-${id}`,
    slug: `game-${id}`,
  }
}
