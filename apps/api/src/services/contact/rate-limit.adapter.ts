import { and, desc, eq } from "drizzle-orm";
import { db, rateLimit } from "@workspace/db";
import type { ContactRateLimiter } from "./contact.js";

export const contactRateLimiter: ContactRateLimiter = {
  async consume(input) {
    const windowStartThreshold = new Date(input.now.getTime() - input.windowMs);
    const [current] = await db
      .select()
      .from(rateLimit)
      .where(and(eq(rateLimit.key, input.key), eq(rateLimit.action, input.action)))
      .orderBy(desc(rateLimit.windowStart))
      .limit(1);

    if (!current || current.windowStart <= windowStartThreshold) {
      await db.insert(rateLimit).values({
        key: input.key,
        action: input.action,
        count: 1,
        windowStart: input.now,
      });
      return { allowed: true };
    }

    if (current.count >= input.limit) {
      const retryAt = current.windowStart.getTime() + input.windowMs;
      return {
        allowed: false,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((retryAt - input.now.getTime()) / 1000),
        ),
      };
    }

    await db
      .update(rateLimit)
      .set({ count: current.count + 1 })
      .where(eq(rateLimit.id, current.id));

    return { allowed: true };
  },
};
