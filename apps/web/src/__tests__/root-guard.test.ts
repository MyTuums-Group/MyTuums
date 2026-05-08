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

describe("decideRootNavigation", () => {
  it("allows guest-only routes for logged-out users", async () => {
    await expect(
      decideRootNavigation({ pathname: "/login", session: null, hasProfile: null }),
    ).resolves.toEqual({ kind: "allow" });
  });

  it("redirects authenticated profileless users to onboarding", async () => {
    await expect(
      decideRootNavigation({ pathname: "/", session, hasProfile: () => Promise.resolve(false) }),
    ).resolves.toEqual({ kind: "redirect", to: "/onboarding" });
  });

  it("allows authenticated profileless users to stay on onboarding", async () => {
    await expect(
      decideRootNavigation({ pathname: "/onboarding", session, hasProfile: () => Promise.resolve(false) }),
    ).resolves.toEqual({ kind: "allow" });
  });

  it("allows authenticated users with profiles to reach the home page", async () => {
    await expect(
      decideRootNavigation({ pathname: "/", session, hasProfile: () => Promise.resolve(true) }),
    ).resolves.toEqual({ kind: "allow" });
  });

  it("allows logged-out users to view public profile pages", async () => {
    await expect(
      decideRootNavigation({ pathname: "/@alice", session: null, hasProfile: null }),
    ).resolves.toEqual({ kind: "allow" });
  });

  it("still redirects logged-out users away from protected home", async () => {
    await expect(
      decideRootNavigation({ pathname: "/", session: null, hasProfile: null }),
    ).resolves.toEqual({ kind: "redirect", to: "/login" });
  });
});
