import {
  createIpRateLimitKey,
  hashRateLimitIdentifier,
  type RateLimiter,
  type RateLimitPolicy,
} from "../services/rate-limit/index.js"

type AuthRateLimitFlow =
  | "registration"
  | "login"
  | "passwordResetRequest"
  | "passwordResetCompletion"
  | "emailVerificationResend"

export type AuthRateLimitPolicyOverrides = Partial<
  Record<AuthRateLimitFlow, RateLimitPolicy>
>

type AuthRateLimitGuardInput = {
  method: string
  pathname: string
  body: unknown
  ipAddress?: string | null
}

type AuthRateLimitDecision =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number }

type AuthRateLimitAttempt = {
  flow: AuthRateLimitFlow
  identifierKind: "email" | "token" | null
  identifier: string | null
}

const ONE_MINUTE_MS = 60 * 1000
const TEN_MINUTES_MS = 10 * ONE_MINUTE_MS
const ONE_HOUR_MS = 60 * ONE_MINUTE_MS

export const AUTH_RATE_LIMITED_ERROR = {
  code: "AUTH_RATE_LIMITED",
  message: "Too many authentication attempts. Please wait before trying again.",
  status: 429,
} as const

export const AUTH_RATE_LIMIT_POLICIES = {
  registration: {
    action: "auth_registration",
    limit: 5,
    windowMs: ONE_HOUR_MS,
  },
  login: {
    action: "auth_login",
    limit: 10,
    windowMs: TEN_MINUTES_MS,
  },
  passwordResetRequest: {
    action: "auth_password_reset_request",
    limit: 5,
    windowMs: ONE_HOUR_MS,
  },
  passwordResetCompletion: {
    action: "auth_password_reset_completion",
    limit: 5,
    windowMs: ONE_HOUR_MS,
  },
  emailVerificationResend: {
    action: "auth_email_verification_resend",
    limit: 5,
    windowMs: ONE_HOUR_MS,
  },
} as const satisfies Record<AuthRateLimitFlow, RateLimitPolicy>

export function createAuthRateLimitGuard(deps: {
  rateLimiter: RateLimiter
  policies?: AuthRateLimitPolicyOverrides
  now?: () => Date
}): {
  consume: (input: AuthRateLimitGuardInput) => Promise<AuthRateLimitDecision>
} {
  return {
    async consume(input) {
      const attempt = getAuthRateLimitAttempt(input)
      if (!attempt) return { allowed: true }

      const policy =
        deps.policies?.[attempt.flow] ?? AUTH_RATE_LIMIT_POLICIES[attempt.flow]
      const keys = getAuthRateLimitKeys({
        ipAddress: input.ipAddress,
        identifierKind: attempt.identifierKind,
        identifier: attempt.identifier,
      })

      for (const key of keys) {
        const decision = await deps.rateLimiter.consume({
          key,
          action: policy.action,
          limit: policy.limit,
          windowMs: policy.windowMs,
          now: deps.now?.(),
        })

        if (!decision.allowed) {
          return decision
        }
      }

      return { allowed: true }
    },
  }
}

function getAuthRateLimitAttempt(
  input: AuthRateLimitGuardInput
): AuthRateLimitAttempt | null {
  if (input.method.toUpperCase() !== "POST") return null

  switch (normalizePathname(input.pathname)) {
    case "/api/auth/sign-up/email":
      return {
        flow: "registration",
        identifierKind: "email",
        identifier: getEmailFromBody(input.body),
      }
    case "/api/auth/sign-in/email":
      return {
        flow: "login",
        identifierKind: "email",
        identifier: getEmailFromBody(input.body),
      }
    case "/api/auth/forget-password":
      return {
        flow: "passwordResetRequest",
        identifierKind: "email",
        identifier: getEmailFromBody(input.body),
      }
    case "/api/auth/reset-password":
      return {
        flow: "passwordResetCompletion",
        identifierKind: "token",
        identifier: getStringFromBody(input.body, "token"),
      }
    case "/api/auth/send-verification-email":
      return {
        flow: "emailVerificationResend",
        identifierKind: "email",
        identifier: getEmailFromBody(input.body),
      }
    default:
      return null
  }
}

function getAuthRateLimitKeys(input: {
  ipAddress?: string | null
  identifierKind: "email" | "token" | null
  identifier: string | null
}): string[] {
  const keys = [createIpRateLimitKey(input.ipAddress)]
  const identifierKey =
    input.identifierKind && input.identifier
      ? createIdentifierRateLimitKey(input.identifierKind, input.identifier)
      : null

  if (identifierKey) {
    keys.push(identifierKey)
  }

  return [...new Set(keys)]
}

function createIdentifierRateLimitKey(
  kind: "email" | "token",
  identifier: string
): string | null {
  const hashed = hashRateLimitIdentifier(
    kind === "email" ? identifier.toLowerCase() : identifier
  )
  return hashed ? `${kind}:${hashed}` : null
}

function getEmailFromBody(body: unknown): string | null {
  const email = getStringFromBody(body, "email")
  return email ? email.toLowerCase() : null
}

function getStringFromBody(body: unknown, field: string): string | null {
  if (typeof body !== "object" || body === null || !(field in body)) {
    return null
  }

  const value = (body as Record<string, unknown>)[field]
  if (typeof value !== "string") return null

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizePathname(pathname: string): string {
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname
}
