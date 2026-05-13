type ReturnToOptions = {
  currentOrigin: string;
  allowedOrigins?: string[];
};

const DEFAULT_ALLOWED_RETURN_ORIGINS = [
  "https://docs.mytuums.com",
  "http://localhost:5174",
];

export function getSafeReturnTo(
  value: string | undefined,
  { currentOrigin, allowedOrigins = getAllowedReturnOrigins() }: ReturnToOptions,
): string | null {
  if (!value) return null;

  try {
    const url = new URL(value, currentOrigin);

    if (value.startsWith("/") && !value.startsWith("//")) {
      return `${url.pathname}${url.search}${url.hash}`;
    }

    if (url.origin === currentOrigin || allowedOrigins.includes(url.origin)) {
      return url.toString();
    }
  } catch {
    return null;
  }

  return null;
}

export function getBrowserSafeReturnTo(value: string | undefined): string | null {
  return getSafeReturnTo(value, { currentOrigin: window.location.origin });
}

export function getCurrentReturnToSearch(): string | undefined {
  return normalizeOptionalSearchString(
    new URLSearchParams(window.location.search).get("returnTo"),
  );
}

export function buildAuthPathWithReturnTo(
  pathname: "/login" | "/verify-email",
  returnTo: string | undefined,
): string {
  const url = new URL(pathname, window.location.origin);

  if (returnTo) {
    url.searchParams.set("returnTo", returnTo);
  }

  return `${url.pathname}${url.search}`;
}

export function normalizeOptionalSearchString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function getAllowedReturnOrigins(): string[] {
  const origins = new Set(DEFAULT_ALLOWED_RETURN_ORIGINS);
  const configuredDocsOrigin = getConfiguredDocsOrigin();

  if (configuredDocsOrigin) {
    origins.add(configuredDocsOrigin);
  }

  return [...origins];
}

function getConfiguredDocsOrigin(): string | null {
  try {
    const value = (import.meta as unknown as { env: { VITE_DOCS_APP_URL?: string } })
      .env.VITE_DOCS_APP_URL;
    return value ? new URL(value).origin : null;
  } catch {
    return null;
  }
}