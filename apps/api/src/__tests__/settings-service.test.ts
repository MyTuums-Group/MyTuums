import { describe, expect, it } from "vitest"
import {
  createInMemorySettingsService,
  type SettingsProfileMediaReplacement,
} from "../services/settings/settings.core.js"

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

function replacementFacts(
  replacements: SettingsProfileMediaReplacement[]
): Array<Omit<SettingsProfileMediaReplacement, "replacedAt">> {
  expect(
    replacements.every((replacement) => replacement.replacedAt instanceof Date)
  ).toBe(true)
  return replacements.map((replacement) => ({
    profileId: replacement.profileId,
    slot: replacement.slot,
    oldMediaId: replacement.oldMediaId,
    newMediaId: replacement.newMediaId,
  }))
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
        avatarUrl: null,
        bannerUrl: null,
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
        avatarUrl: null,
        bannerUrl: null,
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
        target: {
          targetType: "profile",
          targetId: "profile-1",
          slot: "profile_avatar",
        },
      },
      {
        mediaId: "banner-media",
        userId: "user-1",
        expectedPurpose: "profile_banner",
        target: {
          targetType: "profile",
          targetId: "profile-1",
          slot: "profile_banner",
        },
      },
    ])
    expect(
      replacementFacts(service.snapshot().profileMediaReplacements)
    ).toEqual([
      {
        profileId: "profile-1",
        slot: "profile_avatar",
        oldMediaId: null,
        newMediaId: "avatar-media",
      },
      {
        profileId: "profile-1",
        slot: "profile_banner",
        oldMediaId: null,
        newMediaId: "banner-media",
      },
    ])
    expect(service.snapshot().favoriteGames).toEqual([
      { profileId: "profile-1", gameId: "game-a", position: 1 },
      { profileId: "profile-1", gameId: "game-b", position: 2 },
    ])
  })

  it("does not re-attach unchanged avatar media when updating banner only", async () => {
    const initial = createInMemorySettingsService({
      profiles: [
        {
          id: "profile-1",
          userId: "user-1",
          username: "alice",
          displayName: "Alice",
          bio: null,
          avatarMediaId: "avatar-existing",
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
      favoriteGames: [
        { profileId: "profile-1", gameId: "game-b", position: 1 },
      ],
      preferences: [],
      blocks: [],
      blockProfiles: [],
      mediaAttachments: [],
    })

    await expect(
      initial.updateProfile("user-1", {
        displayName: "Alice",
        bio: null,
        avatarMediaId: "avatar-existing",
        bannerMediaId: "banner-new",
        favoriteGameIds: ["game-b"],
      })
    ).resolves.toMatchObject({
      ok: true,
      value: { bannerMediaId: "banner-new" },
    })

    expect(initial.snapshot().mediaAttachments).toEqual([
      {
        mediaId: "banner-new",
        userId: "user-1",
        expectedPurpose: "profile_banner",
        target: {
          targetType: "profile",
          targetId: "profile-1",
          slot: "profile_banner",
        },
      },
    ])
    expect(
      replacementFacts(initial.snapshot().profileMediaReplacements)
    ).toEqual([
      {
        profileId: "profile-1",
        slot: "profile_banner",
        oldMediaId: null,
        newMediaId: "banner-new",
      },
    ])
  })

  it("records profile media replacement history and retires the old media id", async () => {
    const service = createInMemorySettingsService({
      profiles: [
        {
          id: "profile-1",
          userId: "user-1",
          username: "alice",
          displayName: "Alice",
          bio: null,
          avatarMediaId: "avatar-old",
          bannerMediaId: "banner-old",
          followerCount: 0,
          followingCount: 0,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      ],
      games: [],
      favoriteGames: [],
      preferences: [],
      blocks: [],
      blockProfiles: [],
      mediaAttachments: [],
    })

    await expect(
      service.updateProfile("user-1", {
        displayName: "Alice",
        bio: null,
        avatarMediaId: "avatar-new",
        bannerMediaId: null,
      })
    ).resolves.toMatchObject({
      ok: true,
      value: {
        avatarMediaId: "avatar-new",
        bannerMediaId: null,
      },
    })

    expect(service.snapshot().mediaAttachments).toEqual([
      {
        mediaId: "avatar-new",
        userId: "user-1",
        expectedPurpose: "profile_avatar",
        target: {
          targetType: "profile",
          targetId: "profile-1",
          slot: "profile_avatar",
        },
      },
    ])
    expect(
      replacementFacts(service.snapshot().profileMediaReplacements)
    ).toEqual([
      {
        profileId: "profile-1",
        slot: "profile_avatar",
        oldMediaId: "avatar-old",
        newMediaId: "avatar-new",
      },
      {
        profileId: "profile-1",
        slot: "profile_banner",
        oldMediaId: "banner-old",
        newMediaId: null,
      },
    ])
    expect(service.snapshot().deletedMediaIds).toEqual([
      "avatar-old",
      "banner-old",
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
