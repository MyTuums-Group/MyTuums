type CorsOriginInput = {
  nodeEnv: "development" | "test" | "production"
  webAppUrl?: string
  docsAppUrl?: string
}

const PRODUCTION_ORIGINS = [
  "https://mytuums.com",
  "https://www.mytuums.com",
  "https://docs.mytuums.com",
]

export function getAllowedCorsOrigins({
  docsAppUrl,
  nodeEnv,
  webAppUrl,
}: CorsOriginInput): string[] {
  const origins = new Set(
    nodeEnv === "production"
      ? PRODUCTION_ORIGINS
      : ["http://localhost:5173", "http://localhost:5174"],
  )

  addOrigin(origins, webAppUrl)
  addOrigin(origins, docsAppUrl)

  return [...origins]
}

function addOrigin(origins: Set<string>, value: string | undefined): void {
  if (!value) return

  try {
    origins.add(new URL(value).origin)
  } catch {
    return
  }
}