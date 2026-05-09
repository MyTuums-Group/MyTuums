import { describe, expect, it } from "vitest";
import { createInMemoryProfileOnboardingService } from "../services/profile/profile.core.js";

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
  });
}

describe("Profile onboarding favorite games", () => {
  it("creates profile and favorite games atomically with deterministic positions", async () => {
    const service = createService();

    const result = await service.submitOnboarding("user-1", {
      username: "alice",
      favoriteGameIds: ["game-b", "game-a", "game-c"],
    });

    expect(result.ok).toBe(true);
    expect(service.snapshot().profiles).toHaveLength(1);
    expect(service.snapshot().favoriteGames).toEqual([
      { profileId: "profile-1", gameId: "game-b", position: 1 },
      { profileId: "profile-1", gameId: "game-a", position: 2 },
      { profileId: "profile-1", gameId: "game-c", position: 3 },
    ]);
  });

  it("rejects more than five favorite games before creating a profile", async () => {
    const service = createService();

    const result = await service.submitOnboarding("user-1", {
      username: "alice",
      favoriteGameIds: ["game-a", "game-b", "game-c", "game-d", "game-e", "game-f"],
    });

    expect(result).toEqual({
      ok: false,
      error: { kind: "invalid_favorite_games", message: "Choose at most 5 favorite games." },
    });
    expect(service.snapshot().profiles).toEqual([]);
    expect(service.snapshot().favoriteGames).toEqual([]);
  });

  it("rejects duplicate favorite games before creating a profile", async () => {
    const service = createService();

    const result = await service.submitOnboarding("user-1", {
      username: "alice",
      favoriteGameIds: ["game-a", "game-a"],
    });

    expect(result).toEqual({
      ok: false,
      error: { kind: "invalid_favorite_games", message: "Favorite games must be unique." },
    });
    expect(service.snapshot().profiles).toEqual([]);
    expect(service.snapshot().favoriteGames).toEqual([]);
  });

  it("rejects inactive or unknown games before creating a profile", async () => {
    const service = createService();

    const result = await service.submitOnboarding("user-1", {
      username: "alice",
      favoriteGameIds: ["game-a", "inactive-game", "missing-game"],
    });

    expect(result).toEqual({
      ok: false,
      error: { kind: "invalid_favorite_games", message: "Favorite games must be active seeded games." },
    });
    expect(service.snapshot().profiles).toEqual([]);
    expect(service.snapshot().favoriteGames).toEqual([]);
  });

  it("rolls back the profile when favorite-game insert fails", async () => {
    const service = createInMemoryProfileOnboardingService({
      profiles: [],
      games: [{ id: "game-a", isActive: true }],
      favoriteGames: [],
      failFavoriteGameInsert: true,
    });

    await expect(
      service.submitOnboarding("user-1", {
        username: "alice",
        favoriteGameIds: ["game-a"],
      }),
    ).rejects.toThrow("favorite-game insert failed");

    expect(service.snapshot().profiles).toEqual([]);
    expect(service.snapshot().favoriteGames).toEqual([]);
  });
});
