import { and, asc, eq } from "drizzle-orm";
import { db, favoriteGame, game, profile } from "@workspace/db";
import { MAX_FAVORITE_GAMES } from "@workspace/types";
import type {
  FavoriteGameError,
  FavoriteGameView,
  GameCatalogAdapter,
  GameCatalogEntry,
} from "./game.core.js";
import type { SeedGame } from "./game.seed.js";

export async function findBySlug(
  slug: string
): Promise<GameCatalogEntry | undefined> {
  const [row] = await db
    .select()
    .from(game)
    .where(eq(game.slug, slug))
    .limit(1);
  return row ? toGameCatalogEntry(row) : undefined;
}

export async function listActive(): Promise<GameCatalogEntry[]> {
  const rows = await db
    .select()
    .from(game)
    .where(eq(game.isActive, true))
    .orderBy(asc(game.name), asc(game.slug));
  return rows.map(toGameCatalogEntry);
}

export async function isFavorite(
  userId: string,
  gameId: string
): Promise<boolean> {
  const [row] = await db
    .select({ gameId: favoriteGame.gameId })
    .from(favoriteGame)
    .innerJoin(profile, eq(favoriteGame.profileId, profile.id))
    .where(and(eq(profile.userId, userId), eq(favoriteGame.gameId, gameId)))
    .limit(1);
  return row !== undefined;
}

export async function listFavoritesByUserId(
  userId: string
): Promise<FavoriteGameView[]> {
  const rows = await db
    .select({
      id: game.id,
      slug: game.slug,
      name: game.name,
      coverImageUrl: game.coverImageUrl,
      isActive: game.isActive,
      position: favoriteGame.position,
    })
    .from(favoriteGame)
    .innerJoin(profile, eq(favoriteGame.profileId, profile.id))
    .innerJoin(game, eq(favoriteGame.gameId, game.id))
    .where(eq(profile.userId, userId))
    .orderBy(asc(favoriteGame.position), asc(game.name));

  return rows;
}

export async function setFavorite(input: {
  userId: string;
  game: GameCatalogEntry;
  favorite: boolean;
}): ReturnType<GameCatalogAdapter["setFavorite"]> {
  return db.transaction(async (tx) => {
    const [profileRow] = await tx
      .select({ id: profile.id })
      .from(profile)
      .where(eq(profile.userId, input.userId))
      .limit(1);

    if (!profileRow) {
      return failure({ kind: "profile_required" });
    }

    const rows = await tx
      .select({
        gameId: favoriteGame.gameId,
        position: favoriteGame.position,
      })
      .from(favoriteGame)
      .where(eq(favoriteGame.profileId, profileRow.id))
      .orderBy(asc(favoriteGame.position));
    const existing = rows.find((row) => row.gameId === input.game.id);

    if (input.favorite) {
      if (!existing) {
        if (rows.length >= MAX_FAVORITE_GAMES) {
          return failure({ kind: "too_many_favorites" });
        }

        await tx.insert(favoriteGame).values({
          profileId: profileRow.id,
          gameId: input.game.id,
          position: rows.length + 1,
        });
      }
    } else if (existing) {
      await tx
        .delete(favoriteGame)
        .where(
          and(
            eq(favoriteGame.profileId, profileRow.id),
            eq(favoriteGame.gameId, input.game.id)
          )
        );

      const remaining = rows
        .filter((row) => row.gameId !== input.game.id)
        .sort((left, right) => left.position - right.position);
      for (const [index, row] of remaining.entries()) {
        await tx
          .update(favoriteGame)
          .set({ position: index + 1 })
          .where(
            and(
              eq(favoriteGame.profileId, profileRow.id),
              eq(favoriteGame.gameId, row.gameId)
            )
          );
      }
    }

    const favoriteRows = await tx
      .select({
        id: game.id,
        slug: game.slug,
        name: game.name,
        coverImageUrl: game.coverImageUrl,
        isActive: game.isActive,
        position: favoriteGame.position,
      })
      .from(favoriteGame)
      .innerJoin(game, eq(favoriteGame.gameId, game.id))
      .where(eq(favoriteGame.profileId, profileRow.id))
      .orderBy(asc(favoriteGame.position), asc(game.name));

    return { ok: true, value: favoriteRows };
  });
}

export async function upsertSeedGameBySlug(seed: SeedGame): Promise<{
  game: GameCatalogEntry;
  created: boolean;
}> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: game.id })
      .from(game)
      .where(eq(game.slug, seed.slug))
      .limit(1);

    if (existing) {
      const [updated] = await tx
        .update(game)
        .set({
          name: seed.name,
          description: seed.description,
          aliases: seed.aliases,
          coverImageUrl: seed.coverImageUrl,
          isActive: seed.isActive,
        })
        .where(eq(game.slug, seed.slug))
        .returning();

      if (!updated) {
        throw new Error(`Failed to update seeded game ${seed.slug}.`);
      }

      return { game: toGameCatalogEntry(updated), created: false };
    }

    const [inserted] = await tx.insert(game).values(seed).returning();

    if (!inserted) {
      throw new Error(`Failed to insert seeded game ${seed.slug}.`);
    }

    return { game: toGameCatalogEntry(inserted), created: true };
  });
}

function toGameCatalogEntry(row: typeof game.$inferSelect): GameCatalogEntry {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    aliases: row.aliases ?? [],
    coverImageUrl: row.coverImageUrl,
    isActive: row.isActive,
  };
}

function failure(error: FavoriteGameError) {
  return { ok: false as const, error };
}
