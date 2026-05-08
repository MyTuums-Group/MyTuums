export type RootGuardSession = object | null;

export type RootGuardDecision =
  | { kind: "allow" }
  | { kind: "redirect"; to: "/" | "/login" | "/onboarding" };

const PUBLIC_PATHS = [
  "/terms",
  "/privacy",
  "/cookies",
  "/accessibility",
  "/support",
  "/contact",
  "/about",
];

const GUEST_ONLY_PATHS = [
  "/login",
  "/register",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
];

const PUBLIC_SET = new Set(PUBLIC_PATHS);
const GUEST_ONLY_SET = new Set(GUEST_ONLY_PATHS);
const PUBLIC_PROFILE_PATH_PATTERN = /^\/@[a-z][a-z0-9_]{2,19}$/;

export function isPublicProfilePath(pathname: string): boolean {
  return PUBLIC_PROFILE_PATH_PATTERN.test(pathname);
}

export async function decideRootNavigation(input: {
  pathname: string;
  session: RootGuardSession;
  hasProfile: null | (() => Promise<boolean>);
}): Promise<RootGuardDecision> {
  if (PUBLIC_SET.has(input.pathname)) return { kind: "allow" };

  if (!input.session && isPublicProfilePath(input.pathname)) {
    return { kind: "allow" };
  }

  if (GUEST_ONLY_SET.has(input.pathname)) {
    if (input.session) return { kind: "redirect", to: "/" };
    return { kind: "allow" };
  }

  if (!input.session) return { kind: "redirect", to: "/login" };

  if (input.pathname !== "/onboarding") {
    if (!input.hasProfile) return { kind: "redirect", to: "/onboarding" };
    const profileExists = await input.hasProfile();
    if (!profileExists) return { kind: "redirect", to: "/onboarding" };
  }

  return { kind: "allow" };
}
