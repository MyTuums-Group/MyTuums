import { describe, expect, it } from "vitest"
import { createInMemoryProfileOnboardingService } from "../services/profile/profile.core.js"

function createService() {
  return createInMemoryProfileOnboardingService({
    profiles: [],
    games: [
      { id: "game-a", isActive: true },
      { id: "game-b", isActive: true },
      { id: "game-c", isActive: true },
      { id: "game-d", isActive: true },
      { id: "game-e", isActive: true },
      { id: "game-f", isActive: true },
      { id: "inactive-game", isActive: false },
    ],
    favoriteGames: [],
  })
}

describe("Profile onboarding favorite games", () => {
  it("reports username availability before onboarding submit", async () => {
    const service = createService()

    await expect(
      service.checkUsernameAvailability("Alice_Player")
    ).resolves.toEqual({
      status: "available",
      normalizedUsername: "alice_player",
    })
  })

  it("reports invalid and taken usernames before onboarding submit", async () => {
    const service = createInMemoryProfileOnboardingService({
      profiles: [
        {
          id: "profile-1",
          userId: "user-1",
          username: "alice",
          displayName: null,
          bio: null,
          avatarMediaId: null,
          bannerMediaId: null,
          followerCount: 0,
          followingCount: 0,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      ],
      games: [],
      favoriteGames: [],
      usernameHolds: [
        {
          username: "recently_deleted",
          heldUntil: new Date("2099-01-01T00:00:00.000Z"),
        },
      ],
    })

    await expect(service.checkUsernameAvailability("1-alice")).resolves.toEqual(
      {
        status: "invalid",
        normalizedUsername: "1-alice",
        message:
          "Username must start with a letter and contain only lowercase letters, numbers, and underscores.",
      }
    )

    await expect(service.checkUsernameAvailability("Alice")).resolves.toEqual({
      status: "taken",
      normalizedUsername: "alice",
      message: "This username is already taken.",
    })

    await expect(
      service.checkUsernameAvailability("recently_deleted")
    ).resolves.toEqual({
      status: "taken",
      normalizedUsername: "recently_deleted",
      message: "This username is already taken.",
    })
  })

  it("creates a profile when optional onboarding fields are skipped", async () => {
    const service = createService()

    const result = await service.submitOnboarding("user-1", {
      username: "alice",
    })

    expect(result).toEqual({
      ok: true,
      value: {
        username: "alice",
        displayName: null,
        bio: null,
        followerCount: 0,
        followingCount: 0,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        avatarUrl: null,
        bannerUrl: null,
      },
    })
    expect(service.snapshot().profiles[0]?.avatarMediaId).toBeNull()
    expect(service.snapshot().favoriteGames).toEqual([])
  })

  it("creates profile and favorite games atomically with deterministic positions", async () => {
    const service = createService()

    const result = await service.submitOnboarding("user-1", {
      username: "alice",
      favoriteGameIds: ["game-b", "game-a", "game-c"],
    })

    expect(result.ok).toBe(true)
    expect(service.snapshot().profiles).toHaveLength(1)
    expect(service.snapshot().favoriteGames).toEqual([
      { profileId: "profile-1", gameId: "game-b", position: 1 },
      { profileId: "profile-1", gameId: "game-a", position: 2 },
      { profileId: "profile-1", gameId: "game-c", position: 3 },
    ])
  })

  it("attaches an uploaded profile avatar during onboarding", async () => {
    const service = createInMemoryProfileOnboardingService({
      profiles: [],
      games: [{ id: "game-a", isActive: true }],
      favoriteGames: [],
      mediaAttachments: [],
      signedMediaUrls: {
        "avatar-media": "https://cdn.example/avatar.png",
      },
    })

    const result = await service.submitOnboarding("user-1", {
      username: "alice",
      avatarMediaId: "avatar-media",
      favoriteGameIds: ["game-a"],
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.avatarUrl).toBe("https://cdn.example/avatar.png")
    }
    expect(service.snapshot().profiles[0]?.avatarMediaId).toBe("avatar-media")
    expect(service.snapshot().mediaAttachments).toEqual([
      {
        mediaId: "avatar-media",
        userId: "user-1",
        expectedPurpose: "profile_avatar",
      },
    ])
  })

  it("rejects avatar media that is not ready before creating a profile", async () => {
    const service = createInMemoryProfileOnboardingService({
      profiles: [],
      games: [{ id: "game-a", isActive: true }],
      favoriteGames: [],
      failAvatarAttach: "media_not_ready",
    })

    const result = await service.submitOnboarding("user-1", {
      username: "alice",
      avatarMediaId: "avatar-media",
    })

    expect(result).toEqual({
      ok: false,
      error: {
        kind: "invalid_avatar_media",
        message: "Avatar upload must finish before creating your profile.",
      },
    })
    expect(service.snapshot().profiles).toEqual([])
    expect(service.snapshot().favoriteGames).toEqual([])
    expect(service.snapshot().mediaAttachments).toEqual([])
  })

  it("rejects more than five favorite games before creating a profile", async () => {
    const service = createService()

    const result = await service.submitOnboarding("user-1", {
      username: "alice",
      favoriteGameIds: [
        "game-a",
        "game-b",
        "game-c",
        "game-d",
        "game-e",
        "game-f",
      ],
    })

    expect(result).toEqual({
      ok: false,
      error: {
        kind: "invalid_favorite_games",
        message: "Choose at most 5 favorite games.",
      },
    })
    expect(service.snapshot().profiles).toEqual([])
    expect(service.snapshot().favoriteGames).toEqual([])
  })

  it("rejects duplicate favorite games before creating a profile", async () => {
    const service = createService()

    const result = await service.submitOnboarding("user-1", {
      username: "alice",
      favoriteGameIds: ["game-a", "game-a"],
    })

    expect(result).toEqual({
      ok: false,
      error: {
        kind: "invalid_favorite_games",
        message: "Favorite games must be unique.",
      },
    })
    expect(service.snapshot().profiles).toEqual([])
    expect(service.snapshot().favoriteGames).toEqual([])
  })

  it("rejects inactive or unknown games before creating a profile", async () => {
    const service = createService()

    const result = await service.submitOnboarding("user-1", {
      username: "alice",
      favoriteGameIds: ["game-a", "inactive-game", "missing-game"],
    })

    expect(result).toEqual({
      ok: false,
      error: {
        kind: "invalid_favorite_games",
        message: "Favorite games must be active seeded games.",
      },
    })
    expect(service.snapshot().profiles).toEqual([])
    expect(service.snapshot().favoriteGames).toEqual([])
  })

  it("rejects usernames that are still inside the deletion hold window", async () => {
    const service = createInMemoryProfileOnboardingService({
      profiles: [],
      games: [{ id: "game-a", isActive: true }],
      favoriteGames: [],
      usernameHolds: [
        {
          username: "alice",
          heldUntil: new Date("2099-01-01T00:00:00.000Z"),
        },
      ],
    })

    const result = await service.submitOnboarding("user-1", {
      username: "Alice",
      favoriteGameIds: ["game-a"],
    })

    expect(result).toEqual({
      ok: false,
      error: { kind: "username_taken" },
    })
    expect(service.snapshot().profiles).toEqual([])
    expect(service.snapshot().favoriteGames).toEqual([])
  })

  it("rolls back the profile when favorite-game insert fails", async () => {
    const service = createInMemoryProfileOnboardingService({
      profiles: [],
      games: [{ id: "game-a", isActive: true }],
      favoriteGames: [],
      failFavoriteGameInsert: true,
    })

    await expect(
      service.submitOnboarding("user-1", {
        username: "alice",
        favoriteGameIds: ["game-a"],
      })
    ).rejects.toThrow("favorite-game insert failed")

    expect(service.snapshot().profiles).toEqual([])
    expect(service.snapshot().favoriteGames).toEqual([])
  })
})
