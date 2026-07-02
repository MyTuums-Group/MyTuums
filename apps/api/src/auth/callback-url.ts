export type AuthCallbackUrlConfig = {
  webAppUrl: string
  mobileAppUrl: string
  mobileVerifyEmailCallbackUrl: string
  mobileResetPasswordCallbackUrl: string
}

export function withVerificationCallback(
  url: string,
  config: AuthCallbackUrlConfig
): string {
  const verificationUrl = new URL(url)
  const callbackUrl = verificationUrl.searchParams.get("callbackURL")
  if (isMobileCallback(callbackUrl, config)) {
    return toMobileDeepLink(config.mobileVerifyEmailCallbackUrl, {
      token: verificationUrl.searchParams.get("token"),
    })
  }

  verificationUrl.searchParams.set("callbackURL", config.webAppUrl)
  return verificationUrl.toString()
}

export function withResetCallback(
  url: string,
  config: AuthCallbackUrlConfig
): string {
  const resetUrl = new URL(url)
  const callbackUrl = resetUrl.searchParams.get("callbackURL")
  if (isMobileCallback(callbackUrl, config)) {
    return toMobileDeepLink(config.mobileResetPasswordCallbackUrl, {
      token: resetUrl.searchParams.get("token") ?? tokenFromPath(resetUrl),
    })
  }

  resetUrl.searchParams.set("callbackURL", `${config.webAppUrl}/reset-password`)
  return resetUrl.toString()
}

export function isMobileCallback(
  value: string | null,
  config: Pick<AuthCallbackUrlConfig, "mobileAppUrl">
): value is string {
  return value !== null && value.startsWith(config.mobileAppUrl)
}

function tokenFromPath(url: URL): string | null {
  return url.pathname.split("/").filter(Boolean).at(-1) ?? null
}

function toMobileDeepLink(
  baseUrl: string,
  params: Record<string, string | null>
): string {
  const deepLink = new URL(baseUrl)
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      deepLink.searchParams.set(key, value)
    }
  }
  return deepLink.toString()
}
