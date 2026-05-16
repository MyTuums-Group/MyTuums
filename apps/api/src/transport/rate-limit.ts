import { TRPCError } from "@trpc/server"
import { postgresRateLimiter } from "../services/rate-limit/production.js"
import type { RateLimitPolicy } from "../services/rate-limit/index.js"

type HeaderWriter = {
  header(name: string, value: string): unknown
}

export async function enforceRateLimit(input: {
  key: string
  policy: RateLimitPolicy
  reply: HeaderWriter
  message: string
}): Promise<void> {
  const decision = await postgresRateLimiter.consume({
    key: input.key,
    action: input.policy.action,
    limit: input.policy.limit,
    windowMs: input.policy.windowMs,
  })

  if (decision.allowed) return

  setRetryAfterHeader(input.reply, decision.retryAfterSeconds)
  throw new TRPCError({
    code: "TOO_MANY_REQUESTS",
    message: `${input.message} Try again in ${decision.retryAfterSeconds} seconds.`,
  })
}

export function setRetryAfterHeader(
  reply: HeaderWriter,
  retryAfterSeconds: number
): void {
  reply.header("Retry-After", String(retryAfterSeconds))
}
