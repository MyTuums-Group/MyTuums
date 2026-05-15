import { describe, expect, it } from "vitest";
import { decideRootNavigation, type RootGuardSession } from "../routes/-root-guard";

const session = {
  user: {
    id: "user-1",
    email: "a@example.com",
    name: "a@example.com",
    emailVerified: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  },
  session: {
    id: "session-1",
    userId: "user-1",
    expiresAt: new Date("2026-02-01T00:00:00.000Z"),
    token: "token",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  },
} satisfies NonNullable<RootGuardSession>;

const profilelessState = { kind: "verified_profileless" } as const;
const onboardedState = { kind: "active_onboarded_profile" } as const;
const unverifiedState = { kind: "authenticated_unverified" } as const;
const limitedState = { kind: "limited_account" } as const;

describe("decideRootNavigation", () => {
  it("allows guest-only routes for logged-out users", async () => {
    await expect(
      decideRootNavigation({ pathname: "/login", session: null, appUserState: null }),
    ).resolves.toEqual({ kind: "allow" });
  });

  it("redirects authenticated profileless users to onboarding", async () => {
    await expect(
      decideRootNavigation({ pathname: "/", session, appUserState: () => Promise.resolve(profilelessState) }),
    ).resolves.toEqual({ kind: "redirect", to: "/onboarding" });
  });

  it("allows authenticated profileless users to stay on onboarding", async () => {
    await expect(
      decideRootNavigation({ pathname: "/onboarding", session, appUserState: () => Promise.resolve(profilelessState) }),
    ).resolves.toEqual({ kind: "allow" });
  });

  it("allows authenticated users with profiles to reach the home page", async () => {
    await expect(
      decideRootNavigation({ pathname: "/", session, appUserState: () => Promise.resolve(onboardedState) }),
    ).resolves.toEqual({ kind: "allow" });
  });

  it("allows logged-out users to view public profile pages", async () => {
    await expect(
      decideRootNavigation({ pathname: "/@alice", session: null, appUserState: null }),
    ).resolves.toEqual({ kind: "allow" });
  });

  it("allows logged-out users to view public post pages", async () => {
    await expect(
      decideRootNavigation({ pathname: "/post/abc123xyZ_", session: null, appUserState: null }),
    ).resolves.toEqual({ kind: "allow" });
  });

  it("still redirects logged-out users away from protected home", async () => {
    await expect(
      decideRootNavigation({ pathname: "/", session: null, appUserState: null }),
    ).resolves.toEqual({ kind: "redirect", to: "/login" });
  });

  it("still redirects logged-out users away from malformed post paths", async () => {
    await expect(
      decideRootNavigation({ pathname: "/post/short", session: null, appUserState: null }),
    ).resolves.toEqual({ kind: "redirect", to: "/login" });
  });

  it("redirects authenticated unverified users to email verification", async () => {
    await expect(
      decideRootNavigation({ pathname: "/", session, appUserState: () => Promise.resolve(unverifiedState) }),
    ).resolves.toEqual({ kind: "redirect", to: "/verify-email" });
  });

  it("keeps suspended or deleted users on the account status/support paths only", async () => {
    await expect(
      decideRootNavigation({ pathname: "/", session, appUserState: () => Promise.resolve(limitedState) }),
    ).resolves.toEqual({ kind: "redirect", to: "/account/status" });

    await expect(
      decideRootNavigation({ pathname: "/account/status", session, appUserState: () => Promise.resolve(limitedState) }),
    ).resolves.toEqual({ kind: "allow" });

    await expect(
      decideRootNavigation({ pathname: "/support", session, appUserState: () => Promise.resolve(limitedState) }),
    ).resolves.toEqual({ kind: "allow" });
  });
});
