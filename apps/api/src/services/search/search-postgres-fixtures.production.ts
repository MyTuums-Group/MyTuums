import { randomUUID } from "node:crypto";
import { db, game, profile, user } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

export interface SearchPgFixtures {
  userId: string;
  profileId: string;
  gameId: string;
  username: string;
}

export async function seedSearchPgFixtures(): Promise<SearchPgFixtures> {
  const token = randomUUID().slice(0, 8);
  const userId = `search_pg_${token}`;
  const username = `cafetest_${token}`;
  const now = new Date();

  await db.insert(user).values({
    id: userId,
    name: "Search integration",
    email: `search_pg_${token}@example.invalid`,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  });

  const [p] = await db
    .insert(profile)
    .values({
      userId,
      username,
      displayName: `Café Display ${token}`,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: profile.id });

  const [g] = await db
    .insert(game)
    .values({
      slug: `search-cafe-${token}`,
      name: `Café game ${token}`,
      aliases: ["Sport Kiosk"],
      isActive: true,
    })
    .returning({ id: game.id });

  return {
    userId,
    profileId: p!.id,
    gameId: g!.id,
    username,
  };
}

export async function cleanupSearchPgFixtures(fixture: SearchPgFixtures): Promise<void> {
  await db.delete(game).where(eq(game.id, fixture.gameId));
  await db.delete(user).where(eq(user.id, fixture.userId));
}

/** Returns EXPLAIN text for a profile username probe matching the indexed expression. */
export async function explainProfileUsernameSearchProbe(pattern: string): Promise<string> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`set local enable_seqscan = off`);
    const rows = await tx.execute(sql`
      explain (format text)
      select 1 from profile
      where public.immutable_unaccent(lower(username)) like ${pattern} escape '\\'
      limit 1
    `);
    return formatExplainRows(rows);
  });
}

function formatExplainRows(rows: unknown): string {
  if (Array.isArray(rows)) {
    return rows
      .map((row) =>
        typeof row === "object" && row !== null
          ? Object.values(row as Record<string, unknown>).join(" ")
          : String(row),
      )
      .join("\n");
  }
  return JSON.stringify(rows);
}
