export type DocsAppUserState =
  | { kind: "unauthenticated" }
  | { kind: "authenticated_unverified"; user: unknown }
  | { kind: "verified_profileless"; user: unknown }
  | { kind: "active_onboarded_profile"; user: unknown; profile: unknown }
  | {
      kind: "limited_account"
      user: unknown
      accountStatus: "suspended" | "account_deleted"
    }

export type DocsAccessDeniedReason =
  | "inactive_account"
  | "forbidden_role"
  | "service_unavailable"

export type DocsAccessDecision<TBootstrap> =
  | { kind: "authorized"; bootstrap: TBootstrap }
  | { kind: "redirect"; target: "login" | "verify-email"; href: string }
  | { kind: "denied"; reason: DocsAccessDeniedReason }

export type ResolveDocsAccessInput<TBootstrap> = {
  loadAppUserState: () => Promise<DocsAppUserState>
  loadReaderBootstrap: () => Promise<TBootstrap>
  returnUrl: string
  webAppBaseUrl: string
}

export async function resolveDocsAccess<TBootstrap>({
  loadAppUserState,
  loadReaderBootstrap,
  returnUrl,
  webAppBaseUrl,
}: ResolveDocsAccessInput<TBootstrap>): Promise<DocsAccessDecision<TBootstrap>> {
  const appUserState = await loadAppUserState()

  if (appUserState.kind === "unauthenticated") {
    return {
      kind: "redirect",
      target: "login",
      href: buildMainAppReturnUrl("/login", returnUrl, webAppBaseUrl),
    }
  }

  if (appUserState.kind === "authenticated_unverified") {
    return {
      kind: "redirect",
      target: "verify-email",
      href: buildMainAppReturnUrl("/verify-email", returnUrl, webAppBaseUrl),
    }
  }

  if (appUserState.kind === "limited_account") {
    return { kind: "denied", reason: "inactive_account" }
  }

  try {
    const bootstrap = await loadReaderBootstrap()
    return { kind: "authorized", bootstrap }
  } catch (error) {
    const code = getTransportErrorCode(error)

    if (code === "UNAUTHORIZED") {
      return {
        kind: "redirect",
        target: "login",
        href: buildMainAppReturnUrl("/login", returnUrl, webAppBaseUrl),
      }
    }

    if (code === "FORBIDDEN") {
      return { kind: "denied", reason: "forbidden_role" }
    }

    return { kind: "denied", reason: "service_unavailable" }
  }
}

export function buildMainAppReturnUrl(
  pathname: "/login" | "/verify-email",
  returnUrl: string,
  webAppBaseUrl: string
): string {
  const url = new URL(pathname, webAppBaseUrl)
  url.searchParams.set("returnTo", returnUrl)
  return url.toString()
}

export function getCurrentDocsReturnUrl(): string {
  return `${window.location.origin}${window.location.pathname}${window.location.search}${window.location.hash}`
}

function getTransportErrorCode(error: unknown): string | null {
  if (!isRecord(error)) {
    return null
  }

  const directCode = error.code
  if (typeof directCode === "string") {
    return directCode
  }

  const data = error.data
  if (!isRecord(data)) {
    return null
  }

  const dataCode = data.code
  return typeof dataCode === "string" ? dataCode : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}