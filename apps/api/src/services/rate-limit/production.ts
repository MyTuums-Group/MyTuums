import { and, desc, eq, lt, sql } from "drizzle-orm"
import { db, rateLimit } from "@workspace/db"
import { createRateLimiter, type RateLimitRepository } from "./index.js"

const repository: RateLimitRepository = {
  async findCurrent(input) {
    const [current] = await db
      .select()
      .from(rateLimit)
      .where(
        and(eq(rateLimit.key, input.key), eq(rateLimit.action, input.action))
      )
      .orderBy(desc(rateLimit.windowStart))
      .limit(1)

    return current ?? null
  },

  async createWindow(input) {
    await db.insert(rateLimit).values({
      key: input.key,
      action: input.action,
      count: 1,
      windowStart: input.now,
    })
  },

  async incrementWindow(input) {
    const [updated] = await db
      .update(rateLimit)
      .set({ count: sql<number>`${rateLimit.count} + 1` })
      .where(and(eq(rateLimit.id, input.id), lt(rateLimit.count, input.limit)))
      .returning({ id: rateLimit.id })

    return updated !== undefined
  },
}

export const postgresRateLimiter = createRateLimiter(repository)
