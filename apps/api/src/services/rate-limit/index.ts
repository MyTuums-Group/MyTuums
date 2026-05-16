import { createHash } from "node:crypto"

export type RateLimitConsumeInput = {
  key: string
  action: string
  limit: number
  windowMs: number
  now?: Date
}

export type RateLimitDecision =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number }

export type RateLimiter = {
  consume(input: RateLimitConsumeInput): Promise<RateLimitDecision>
}

export type RateLimitPolicy = {
  action: string
  limit: number
  windowMs: number
}

export type RateLimitWindow = {
  id: string
  count: number
  windowStart: Date
}

export type RateLimitRepository = {
  findCurrent(input: {
    key: string
    action: string
  }): Promise<RateLimitWindow | null>
  createWindow(input: { key: string; action: string; now: Date }): Promise<void>
  incrementWindow(input: { id: string; limit: number }): Promise<boolean>
}

const ONE_MINUTE_MS = 60 * 1000
const ONE_HOUR_MS = 60 * ONE_MINUTE_MS
const UNKNOWN_IP_KEY = "unknown"

export const RATE_LIMIT_POLICIES = {
  contactSubmit: {
    action: "contact_submit",
    limit: 5,
    windowMs: ONE_HOUR_MS,
  },
  uploadCreate: {
    action: "media_create_upload",
    limit: 30,
    windowMs: ONE_HOUR_MS,
  },
  postCreate: {
    action: "post_create",
    limit: 20,
    windowMs: ONE_HOUR_MS,
  },
  commentCreate: {
    action: "comment_create",
    limit: 60,
    windowMs: ONE_HOUR_MS,
  },
  reportSubmit: {
    action: "report_submit",
    limit: 20,
    windowMs: ONE_HOUR_MS,
  },
  search: {
    action: "search",
    limit: 120,
    windowMs: ONE_MINUTE_MS,
  },
} as const satisfies Record<string, RateLimitPolicy>

export function createRateLimiter(
  repository: RateLimitRepository
): RateLimiter {
  return {
    async consume(input) {
      const now = input.now ?? new Date()
      const windowStartThreshold = new Date(now.getTime() - input.windowMs)
      const current = await repository.findCurrent({
        key: input.key,
        action: input.action,
      })

      if (!current || current.windowStart <= windowStartThreshold) {
        await repository.createWindow({
          key: input.key,
          action: input.action,
          now,
        })
        return { allowed: true }
      }

      if (current.count >= input.limit) {
        return blockedDecision(current, input.windowMs, now)
      }

      const incremented = await repository.incrementWindow({
        id: current.id,
        limit: input.limit,
      })

      if (!incremented) {
        return blockedDecision(current, input.windowMs, now)
      }

      return { allowed: true }
    },
  }
}

export function createUserRateLimitKey(userId: string): string {
  return `user:${userId}`
}

export function createIpRateLimitKey(
  ipAddress: string | null | undefined
): string {
  return `ip:${hashRateLimitIdentifier(ipAddress) ?? UNKNOWN_IP_KEY}`
}

export function createUserIpRateLimitKey(input: {
  userId: string
  ipAddress: string | null | undefined
}): string {
  return [
    createUserRateLimitKey(input.userId),
    createIpRateLimitKey(input.ipAddress),
  ].join(":")
}

export function hashRateLimitIdentifier(
  value: string | null | undefined
): string | null {
  const normalized = value?.trim()
  if (!normalized) return null

  return createHash("sha256").update(normalized).digest("hex")
}

export function createInMemoryRateLimiter(): RateLimiter {
  const windows = new Map<string, RateLimitWindow & { lookupKey: string }>()
  let nextWindowId = 1

  return createRateLimiter({
    findCurrent({ key, action }) {
      const lookupKey = windowKey(key, action)
      const matches = [...windows.values()]
        .filter((window) => window.lookupKey === lookupKey)
        .sort(
          (left, right) =>
            right.windowStart.getTime() - left.windowStart.getTime()
        )
      return Promise.resolve(matches[0] ?? null)
    },
    createWindow({ key, action, now }) {
      const lookupKey = windowKey(key, action)
      const id = `${lookupKey}|${nextWindowId}`
      nextWindowId += 1
      windows.set(id, { id, lookupKey, count: 1, windowStart: now })
      return Promise.resolve()
    },
    incrementWindow({ id, limit }) {
      const current = windows.get(id)
      if (!current || current.count >= limit) {
        return Promise.resolve(false)
      }
      current.count += 1
      return Promise.resolve(true)
    },
  })
}

function blockedDecision(
  current: RateLimitWindow,
  windowMs: number,
  now: Date
): RateLimitDecision {
  const retryAt = current.windowStart.getTime() + windowMs
  return {
    allowed: false,
    retryAfterSeconds: Math.max(1, Math.ceil((retryAt - now.getTime()) / 1000)),
  }
}

function windowKey(key: string, action: string): string {
  return `${key}|${action}`
}
