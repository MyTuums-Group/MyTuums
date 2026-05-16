export function getRequestIp(req: {
  ip?: string
  headers: Record<string, unknown>
}): string | null {
  const forwarded = req.headers["x-forwarded-for"]
  if (typeof forwarded === "string" && forwarded.trim().length > 0) {
    return forwarded.split(",")[0]?.trim() ?? null
  }

  return req.ip ?? null
}

export function getUserAgent(value: unknown): string | null {
  return typeof value === "string" ? value : null
}
