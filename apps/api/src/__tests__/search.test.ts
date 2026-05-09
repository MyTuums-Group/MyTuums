import { describe, expect, it } from "vitest";
import type { ViewerContext } from "@workspace/types";
import {
  createInMemorySearchService,
  type SearchGameRow,
  type SearchProfileRow,
} from "../services/search/index.js";

const viewer: ViewerContext = {
  userId: "viewer",
  role: "user",
  accountStatus: "active",
  blockedUserIds: ["blocked-by-viewer"],
  blockedByUserIds: ["blocks-viewer"],
  isAuthenticated: true,
};

const guest: ViewerContext = {
  userId: null,
  role: null,
  accountStatus: null,
  blockedUserIds: [],
  blockedByUserIds: [],
  isAuthenticated: false,
};

function profile(
  username: string,
  displayName: string,
  overrides: Partial<SearchProfileRow> = {},
): SearchProfileRow {
  return {
    id: `profile-${username}`,
    userId: `user-${username}`,
    username,
    displayName,
    accountStatus: "active",
    ...overrides,
  };
}

function game(
  slug: string,
  name: string,
  overrides: Partial<SearchGameRow> = {},
): SearchGameRow {
  return {
    id: `game-${slug}`,
    slug,
    name,
    aliases: [],
    isActive: true,
    ...overrides,
  };
}

describe("Search module", () => {
  it("rejects unauthenticated v1 search", async () => {
    const search = createInMemorySearchService({ profiles: [], games: [] });

    await expect(search.appSearch(guest, { query: "alice", limit: 10 })).rejects.toThrow(
      "Search is authenticated-only in v1.",
    );
  });

  it("centralizes accent/case-insensitive exact, prefix, contains ranking with alphabetic ties", async () => {
    const search = createInMemorySearchService({
      profiles: [
        profile("zelda", "Contains Café"),
        profile("cafe", "Zed exact by username"),
        profile("carol", "Cafe Runner"),
        profile("cafédev", "Cafe Developer"),
        profile("cafealice", "Alice Prefix"),
      ],
      games: [
        game("cafe-racer", "Café Racer"),
        game("space-cafe", "Space Cafe"),
      ],
    });

    const result = await search.appSearch(viewer, { query: "CAFE", limit: 10 });

    expect(result.results.map((item) => `${item.type}:${item.label}`)).toEqual([
      "user:Zed exact by username",
      "user:Alice Prefix",
      "user:Cafe Developer",
      "game:Café Racer",
      "user:Cafe Runner",
      "user:Contains Café",
      "game:Space Cafe",
    ]);
  });

  it("filters blocked, suspended/deleted profiles and inactive games before returning shared result shapes", async () => {
    const search = createInMemorySearchService({
      profiles: [
        profile("visible", "Visible Player"),
        profile("blocked", "Blocked Player", { userId: "blocked-by-viewer" }),
        profile("blocker", "Blocker Player", { userId: "blocks-viewer" }),
        profile("suspended", "Suspended Player", { accountStatus: "suspended" }),
        profile("deleted", "Deleted Player", { accountStatus: "account_deleted" }),
      ],
      games: [
        game("visible-game", "Visible Game"),
        game("inactive-game", "Inactive Game", { isActive: false }),
      ],
    });

    const result = await search.appSearch(viewer, { query: "player game", limit: 10 });

    expect(result.results).toEqual([
      {
        type: "game",
        id: "game-visible-game",
        label: "Visible Game",
        href: "/games/visible-game",
      },
      {
        type: "user",
        id: "profile-visible",
        label: "Visible Player",
        href: "/@visible",
      },
    ]);
  });
});
