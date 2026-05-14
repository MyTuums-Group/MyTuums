import { db, game, profile, user } from "@workspace/db";
import { eq, or, sql } from "drizzle-orm";
import type { SearchQueryAdapter } from "./index.js";

export const searchQueries: SearchQueryAdapter = {
  async searchProfiles({ viewer: _viewer, terms, limit }) {
    if (terms.length === 0) return [];

    const clauses = terms.flatMap((term) => [
      sql`(position(${term} in lower(${profile.username})) > 0)`,
      sql`(position(${term} in lower(coalesce(${profile.displayName}, ''))) > 0)`,
    ]);

    const whereClause = clauses.length === 1 ? clauses[0]! : or(...clauses);

    return db
      .select({
        id: profile.id,
        userId: profile.userId,
        username: profile.username,
        displayName: profile.displayName,
        accountStatus: user.accountStatus,
      })
      .from(profile)
      .innerJoin(user, eq(profile.userId, user.id))
      .where(whereClause)
      .limit(limit);
  },

  async searchGames({ terms, limit }) {
    if (terms.length === 0) return [];

    const clauses = terms.flatMap((term) => [
      sql`(position(${term} in lower(${game.slug})) > 0)`,
      sql`(position(${term} in lower(${game.name})) > 0)`,
      sql`(position(${term} in lower(coalesce(${game.aliases}::text, ''))) > 0)`,
    ]);

    const whereClause = clauses.length === 1 ? clauses[0]! : or(...clauses);

    const rows = await db
      .select({
        id: game.id,
        slug: game.slug,
        name: game.name,
        aliases: game.aliases,
        isActive: game.isActive,
      })
      .from(game)
      .where(whereClause)
      .limit(limit);

    return rows.map((row) => ({
      ...row,
      aliases: row.aliases ?? [],
    }));
  },
};
