import { STATIC_PAGE_PATHS } from "./-static-pages";

export type RootGuardSession = object | null;

export type RootGuardAppUserState =
  | { kind: "unauthenticated" }
  | { kind: "authenticated_unverified" }
  | { kind: "verified_profileless" }
  | { kind: "active_onboarded_profile" }
  | { kind: "limited_account" };

export type RootGuardDecision =
  | { kind: "allow" }
  | { kind: "redirect"; to: "/" | "/account/status" | "/login" | "/onboarding" | "/verify-email" };

const PUBLIC_PATHS = STATIC_PAGE_PATHS;

const GUEST_ONLY_PATHS = [
  "/login",
  "/register",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
];

const PUBLIC_SET = new Set(PUBLIC_PATHS);
const GUEST_ONLY_SET = new Set(GUEST_ONLY_PATHS);
const LIMITED_ACCOUNT_SET = new Set(["/account/status", "/support", "/contact"]);
const PUBLIC_PROFILE_PATH_PATTERN = /^\/@[a-z][a-z0-9_]{2,19}$/;
const PUBLIC_POST_PATH_PATTERN = /^\/post\/[A-Za-z0-9_-]{8,64}$/;
const PUBLIC_GAME_PATH_PATTERN = /^\/game\/[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isStaticPagePath(pathname: string): boolean {
  return PUBLIC_SET.has(pathname);
}

export function isPublicProfilePath(pathname: string): boolean {
  return PUBLIC_PROFILE_PATH_PATTERN.test(pathname);
}

export function isPublicPostPath(pathname: string): boolean {
  return PUBLIC_POST_PATH_PATTERN.test(pathname);
}

export function isPublicGamePath(pathname: string): boolean {
  return PUBLIC_GAME_PATH_PATTERN.test(pathname);
}

export async function decideRootNavigation(input: {
  pathname: string;
  session: RootGuardSession;
  appUserState: null | (() => Promise<RootGuardAppUserState>);
}): Promise<RootGuardDecision> {
  if (isStaticPagePath(input.pathname)) return { kind: "allow" };

  if (
    !input.session &&
    (isPublicProfilePath(input.pathname) ||
      isPublicPostPath(input.pathname) ||
      isPublicGamePath(input.pathname))
  ) {
    return { kind: "allow" };
  }

  if (GUEST_ONLY_SET.has(input.pathname)) {
    if (!input.session) return { kind: "allow" };
    if (input.pathname !== "/verify-email") return { kind: "redirect", to: "/" };
  }

  if (!input.session) return { kind: "redirect", to: "/login" };

  if (!input.appUserState) return { kind: "redirect", to: "/login" };
  const appUserState = await input.appUserState();

  if (appUserState.kind === "unauthenticated") {
    return { kind: "redirect", to: "/login" };
  }

  if (appUserState.kind === "authenticated_unverified") {
    return input.pathname === "/verify-email"
      ? { kind: "allow" }
      : { kind: "redirect", to: "/verify-email" };
  }

  if (input.pathname === "/verify-email") {
    return { kind: "redirect", to: "/" };
  }

  if (appUserState.kind === "limited_account") {
    return LIMITED_ACCOUNT_SET.has(input.pathname)
      ? { kind: "allow" }
      : { kind: "redirect", to: "/account/status" };
  }

  if (appUserState.kind === "verified_profileless" && input.pathname !== "/onboarding") {
    return { kind: "redirect", to: "/onboarding" };
  }

  return { kind: "allow" };
}
