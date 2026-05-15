import { describe, expect, it } from "vitest"
import { createInMemorySettingsService } from "../services/settings/settings.core.js"

function createService() {
  return createInMemorySettingsService({
    profiles: [
      {
        id: "profile-1",
        userId: "user-1",
        username: "alice",
        displayName: "Alice",
        bio: null,
        avatarMediaId: null,
        bannerMediaId: null,
        followerCount: 0,
        followingCount: 0,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ],
    games: [
      { id: "game-a", slug: "valorant", name: "Valorant", isActive: true },
      { id: "game-b", slug: "hades", name: "Hades", isActive: true },
    ],
    favoriteGames: [{ profileId: "profile-1", gameId: "game-b", position: 1 }],
    preferences: [],
    blocks: [
      {
        blockerId: "user-1",
        blockedId: "user-2",
      },
    ],
    blockProfiles: [
      {
        userId: "user-2",
        username: "bob",
        displayName: "Bob",
      },
    ],
    mediaAttachments: [],
  })
}

describe("settings service", () => {
  it("loads profile, theme preference, and blocked users for settings", async () => {
    const service = createService()

    await expect(
      service.getSettings({
        userId: "user-1",
        email: "alice@example.com",
        appVersion: "0.0.1",
        buildInfo: "local",
      })
    ).resolves.toEqual({
      profile: {
        username: "alice",
        displayName: "Alice",
        bio: null,
        avatarMediaId: null,
        bannerMediaId: null,
        favoriteGames: [{ id: "game-b", slug: "hades", name: "Hades" }],
      },
      account: {
        email: "alice@example.com",
      },
      display: {
        theme: "system",
      },
      safety: {
        blockedUsers: [
          {
            userId: "user-2",
            username: "bob",
            displayName: "Bob",
          },
        ],
      },
      about: {
        appVersion: "0.0.1",
        buildInfo: "local",
      },
    })
  })

  it("updates profile settings and attaches avatar/banner media with profile purposes", async () => {
    const service = createService()

    await expect(
      service.updateProfile("user-1", {
        displayName: "  Captain Alice  ",
        bio: "  Main support and roguelike enjoyer.  ",
        avatarMediaId: "avatar-media",
        bannerMediaId: "banner-media",
        favoriteGameIds: ["game-a", "game-b"],
      })
    ).resolves.toEqual({
      ok: true,
      value: {
        username: "alice",
        displayName: "Captain Alice",
        bio: "Main support and roguelike enjoyer.",
        avatarMediaId: "avatar-media",
        bannerMediaId: "banner-media",
        favoriteGames: [
          { id: "game-a", slug: "valorant", name: "Valorant" },
          { id: "game-b", slug: "hades", name: "Hades" },
        ],
      },
    })

    expect(service.snapshot().mediaAttachments).toEqual([
      {
        mediaId: "avatar-media",
        userId: "user-1",
        expectedPurpose: "profile_avatar",
      },
      {
        mediaId: "banner-media",
        userId: "user-1",
        expectedPurpose: "profile_banner",
      },
    ])
    expect(service.snapshot().favoriteGames).toEqual([
      { profileId: "profile-1", gameId: "game-a", position: 1 },
      { profileId: "profile-1", gameId: "game-b", position: 2 },
    ])
  })

  it("persists display theme preference on the server", async () => {
    const service = createService()

    await expect(
      service.updateThemePreference("user-1", "dark")
    ).resolves.toEqual({
      ok: true,
      value: { theme: "dark" },
    })

    expect(service.snapshot().preferences).toEqual([
      { userId: "user-1", theme: "dark" },
    ])
  })
})
