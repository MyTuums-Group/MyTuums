export interface DocsBuildMetadata {
  environment: string
  siteUrl: string
  apiBaseUrl: string | null
  commitSha: string | null
  buildTime: string | null
  basePath: string
}

type DocsBuildEnv = {
  BASE_URL?: string
  VITE_DOCS_ENVIRONMENT?: string
  VITE_DOCS_SITE_URL?: string
  VITE_DOCS_API_BASE_URL?: string
  VITE_DOCS_BUILD_SHA?: string
  VITE_DOCS_BUILD_TIME?: string
}

export function getDocsBuildMetadata(env: DocsBuildEnv): DocsBuildMetadata {
  return {
    environment: normalizeOptionalValue(env.VITE_DOCS_ENVIRONMENT) ?? "local",
    siteUrl:
      normalizeOptionalValue(env.VITE_DOCS_SITE_URL) ?? "https://docs.mytuums.com",
    apiBaseUrl: normalizeOptionalValue(env.VITE_DOCS_API_BASE_URL),
    commitSha: normalizeOptionalValue(env.VITE_DOCS_BUILD_SHA),
    buildTime: normalizeOptionalValue(env.VITE_DOCS_BUILD_TIME),
    basePath: normalizeOptionalValue(env.BASE_URL) ?? "/",
  }
}

function normalizeOptionalValue(value: string | undefined): string | null {
  const trimmedValue = value?.trim()
  return trimmedValue ? trimmedValue : null
}
