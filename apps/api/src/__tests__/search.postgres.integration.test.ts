import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ViewerContext } from "@workspace/types";
import { config as loadEnv } from "dotenv";
import { createSearchService, type SearchQueryAdapter } from "../services/search/index.js";
import type { SearchPgFixtures } from "../services/search/search-postgres-fixtures.production.js";

const runPg = process.env.RUN_PG_INTEGRATION_TESTS === "true";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

describe.runIf(runPg)("Search Postgres (pg_trgm + unaccent)", () => {
  let fixtures: SearchPgFixtures | undefined;
  let cleanupSearchPgFixtures: ((f: SearchPgFixtures) => Promise<void>) | undefined;
  let explainProfileUsernameSearchProbe: ((pattern: string) => Promise<string>) | undefined;
  let searchQueries: SearchQueryAdapter;

  beforeAll(() => {
    loadEnv({ path: path.join(repoRoot, ".env") });
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required for Postgres search integration tests.");
    }
    execSync("pnpm db:migrate", { cwd: repoRoot, stdio: "inherit", env: process.env });
  });

  beforeAll(async () => {
    const fixturesMod = await import("../services/search/search-postgres-fixtures.production.js");
    const prod = await import("../services/search/production.js");
    cleanupSearchPgFixtures = fixturesMod.cleanupSearchPgFixtures;
    explainProfileUsernameSearchProbe = fixturesMod.explainProfileUsernameSearchProbe;
    searchQueries = prod.searchQueries;
    fixtures = await fixturesMod.seedSearchPgFixtures();
  }, 60_000);

  afterAll(async () => {
    if (fixtures && cleanupSearchPgFixtures) await cleanupSearchPgFixtures(fixtures);
  }, 30_000);

  it("EXPLAIN for username probe references the trigram GIN index", async () => {
    const plan = await explainProfileUsernameSearchProbe!("%cafetest%");
    expect(plan.toLowerCase()).toContain("profile_username_search_trgm_idx");
    expect(plan.toLowerCase()).toMatch(/index scan|bitmap index scan/);
  }, 30_000);

  it("searchQueries + createSearchService finds seeded Café rows", async () => {
    const viewer: ViewerContext = {
      userId: fixtures!.userId,
      role: "user",
      accountStatus: "active",
      blockedUserIds: [],
      blockedByUserIds: [],
      isAuthenticated: true,
    };

    const search = createSearchService(searchQueries);
    const { results } = await search.appSearch(viewer, { query: "cafe", limit: 20 });

    const userHrefs = results.filter((r) => r.type === "user").map((r) => r.href);
    const gameLabels = results.filter((r) => r.type === "game").map((r) => r.label);

    expect(userHrefs.some((href) => href.includes(`/@${fixtures!.username}`))).toBe(true);
    expect(
      gameLabels.some((label) => label.toLowerCase().includes("café") || label.toLowerCase().includes("cafe")),
    ).toBe(true);
  }, 30_000);
});
