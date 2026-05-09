import { db, game, profile, user } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { SearchQueryAdapter } from "./index.js";

export const searchQueries: SearchQueryAdapter = {
  async profiles() {
    return db
      .select({
        id: profile.id,
        userId: profile.userId,
        username: profile.username,
        displayName: profile.displayName,
        accountStatus: user.accountStatus,
      })
      .from(profile)
      .innerJoin(user, eq(profile.userId, user.id));
  },

  async games() {
    const rows = await db
      .select({
        id: game.id,
        slug: game.slug,
        name: game.name,
        aliases: game.aliases,
        isActive: game.isActive,
      })
      .from(game);

    return rows.map((row) => ({
      ...row,
      aliases: row.aliases ?? [],
    }));
  },
};
