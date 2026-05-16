import { describe, expect, it } from "vitest"
import {
  createInMemoryRateLimiter,
  createIpRateLimitKey,
  createUserIpRateLimitKey,
  createUserRateLimitKey,
} from "../services/rate-limit/index.js"

const NOW = new Date("2026-05-15T12:00:00.000Z")

describe("rate limit module", () => {
  it("allows requests inside a window, blocks over limit, and returns retry-after seconds", async () => {
    const limiter = createInMemoryRateLimiter()
    const input = {
      key: createUserRateLimitKey("user-1"),
      action: "post_create",
      limit: 2,
      windowMs: 60_000,
      now: NOW,
    }

    await expect(limiter.consume(input)).resolves.toEqual({ allowed: true })
    await expect(limiter.consume(input)).resolves.toEqual({ allowed: true })
    await expect(limiter.consume(input)).resolves.toEqual({
      allowed: false,
      retryAfterSeconds: 60,
    })

    await expect(
      limiter.consume({
        ...input,
        now: new Date(NOW.getTime() + 30_000),
      })
    ).resolves.toEqual({
      allowed: false,
      retryAfterSeconds: 30,
    })
  })

  it("opens a new window after the retry period", async () => {
    const limiter = createInMemoryRateLimiter()
    const input = {
      key: createUserRateLimitKey("user-1"),
      action: "comment_create",
      limit: 1,
      windowMs: 60_000,
      now: NOW,
    }

    await expect(limiter.consume(input)).resolves.toEqual({ allowed: true })
    await expect(limiter.consume(input)).resolves.toMatchObject({
      allowed: false,
    })
    await expect(
      limiter.consume({
        ...input,
        now: new Date(NOW.getTime() + 60_001),
      })
    ).resolves.toEqual({ allowed: true })
  })

  it("supports user-keyed flows", async () => {
    const limiter = createInMemoryRateLimiter()
    const userKey = createUserRateLimitKey("user-42")

    expect(userKey).toBe("user:user-42")
    await expect(
      limiter.consume({
        key: userKey,
        action: "media_create_upload",
        limit: 1,
        windowMs: 3_600_000,
        now: NOW,
      })
    ).resolves.toEqual({ allowed: true })
  })

  it("hashes IP-keyed and combined user/IP keys without storing raw addresses", () => {
    const ipKey = createIpRateLimitKey("203.0.113.20")
    const combinedKey = createUserIpRateLimitKey({
      userId: "user-42",
      ipAddress: "203.0.113.20",
    })

    expect(ipKey).toMatch(/^ip:[a-f0-9]{64}$/)
    expect(ipKey).not.toContain("203.0.113.20")
    expect(combinedKey).toMatch(/^user:user-42:ip:[a-f0-9]{64}$/)
    expect(combinedKey).not.toContain("203.0.113.20")
  })
})
