import { db, game, profile, user } from "@workspace/db"
import { and, eq, notInArray, or, sql, type SQL } from "drizzle-orm"
import type { SearchQueryAdapter } from "./index.js"

function escapeLikeWildcards(term: string): string {
  return term
    .replaceAll("\\", "\\\\")
    .replaceAll("%", "\\%")
    .replaceAll("_", "\\_")
}

/** Substring match on an expression; pattern must use `escape '\\'`. */
function exprLikeContains(expression: SQL, term: string): SQL {
  const pattern = `%${escapeLikeWildcards(term)}%`
  return sql`(${expression} like ${pattern} escape '\\')`
}

export const searchQueries: SearchQueryAdapter = {
  async searchProfiles({ viewer, terms, limit }) {
    if (terms.length === 0) return []

    const clauses = terms.flatMap((term) => [
      exprLikeContains(
        sql`public.immutable_unaccent(lower(${profile.username}))`,
        term
      ),
      exprLikeContains(
        sql`public.immutable_unaccent(lower(coalesce(${profile.displayName}, '')))`,
        term
      ),
    ])

    const whereClause = clauses.length === 1 ? clauses[0]! : or(...clauses)
    const blockedPairIds = [
      ...new Set([...viewer.blockedUserIds, ...viewer.blockedByUserIds]),
    ]

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
      .where(
        and(
          whereClause,
          eq(user.accountStatus, "active"),
          blockedPairIds.length > 0
            ? notInArray(profile.userId, blockedPairIds)
            : undefined
        )
      )
      .limit(limit)
  },

  async searchGames({ terms, limit }) {
    if (terms.length === 0) return []

    const clauses = terms.flatMap((term) => [
      exprLikeContains(
        sql`public.immutable_unaccent(lower(${game.slug}))`,
        term
      ),
      exprLikeContains(
        sql`public.immutable_unaccent(lower(${game.name}))`,
        term
      ),
      exprLikeContains(
        sql`public.immutable_unaccent(lower(coalesce(${game.aliases}::text, '')))`,
        term
      ),
    ])

    const whereClause = clauses.length === 1 ? clauses[0]! : or(...clauses)

    const rows = await db
      .select({
        id: game.id,
        slug: game.slug,
        name: game.name,
        aliases: game.aliases,
        isActive: game.isActive,
      })
      .from(game)
      .where(and(whereClause, eq(game.isActive, true)))
      .limit(limit)

    return rows.map((row) => ({
      ...row,
      aliases: row.aliases ?? [],
    }))
  },
}
