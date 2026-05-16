import { describe, expect, it } from "vitest"
import { MAX_FAVORITE_GAMES } from "@workspace/types"
import {
  addFavoriteGameSelection,
  buildOnboardingPayload,
  getAvatarSubmitBlocker,
  isOnboardingSubmitDisabled,
  removeFavoriteGameSelection,
  type OnboardingFavoriteGame,
} from "../features/onboarding/onboarding-form"

const games: OnboardingFavoriteGame[] = Array.from(
  { length: MAX_FAVORITE_GAMES + 1 },
  (_, index) => ({
    id: `game-${index + 1}`,
    slug: `game-${index + 1}`,
    name: `Game ${index + 1}`,
  })
)

describe("onboarding form helpers", () => {
  it("builds a profile payload when optional fields are skipped", () => {
    expect(
      buildOnboardingPayload({
        username: " alice ",
        displayName: " ",
        bio: "",
        favoriteGames: [],
        avatarMediaId: null,
      })
    ).toEqual({
      username: "alice",
      favoriteGameIds: [],
    })
  })

  it("keeps selected favorite games in display order", () => {
    const selected = games.slice(0, 3)

    expect(
      buildOnboardingPayload({
        username: "alice",
        displayName: "Alice",
        bio: "Tank main",
        favoriteGames: selected,
        avatarMediaId: "avatar-media",
      })
    ).toEqual({
      username: "alice",
      displayName: "Alice",
      bio: "Tank main",
      favoriteGameIds: ["game-1", "game-2", "game-3"],
      avatarMediaId: "avatar-media",
    })
  })

  it("caps favorite game selection at five and ignores duplicates", () => {
    const selected = games
      .slice(0, MAX_FAVORITE_GAMES)
      .reduce<
        OnboardingFavoriteGame[]
      >((current, game) => addFavoriteGameSelection(current, game), [])

    expect(addFavoriteGameSelection(selected, games[MAX_FAVORITE_GAMES]!)).toBe(
      selected
    )
    expect(addFavoriteGameSelection(selected, games[0]!)).toBe(selected)
    expect(removeFavoriteGameSelection(selected, "game-3")).toEqual([
      games[0],
      games[1],
      games[3],
      games[4],
    ])
  })

  it("blocks submit while avatar media is uploading or failed", () => {
    expect(getAvatarSubmitBlocker("uploading")).toMatch(/finish/)
    expect(getAvatarSubmitBlocker("failed")).toMatch(/failed/)
    expect(getAvatarSubmitBlocker("ready")).toBeNull()
    expect(
      isOnboardingSubmitDisabled({
        isSubmitting: false,
        avatarStatus: "uploading",
      })
    ).toBe(true)
    expect(
      isOnboardingSubmitDisabled({
        isSubmitting: false,
        avatarStatus: "failed",
      })
    ).toBe(true)
    expect(
      isOnboardingSubmitDisabled({
        isSubmitting: false,
        avatarStatus: "idle",
      })
    ).toBe(false)
  })
})
