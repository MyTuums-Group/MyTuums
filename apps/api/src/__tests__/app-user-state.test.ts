import { describe, expect, it } from "vitest";
import type { AccountLifecycleSnapshot } from "../services/account-status/index.js";
import { buildCurrentAppUserState } from "../services/app-user-state/policy.js";

const activeAccount: AccountLifecycleSnapshot = {
  status: "active",
  role: "user",
  suspendedUntil: null,
  deletedAt: null,
};

describe("Current app user state policy", () => {
  it("returns unauthenticated when there is no session", () => {
    expect(buildCurrentAppUserState({ session: null, account: null, profile: null })).toEqual({
      kind: "unauthenticated",
    });
  });

  it("returns authenticated_unverified before email verification", () => {
    expect(
      buildCurrentAppUserState({
        session: { user: { id: "user-1", emailVerified: false } },
        account: activeAccount,
        profile: null,
      }),
    ).toEqual({
      kind: "authenticated_unverified",
      user: { id: "user-1", emailVerified: false },
    });
  });

  it("returns verified_profileless for verified users without a profile", () => {
    expect(
      buildCurrentAppUserState({
        session: { user: { id: "user-1", emailVerified: true } },
        account: activeAccount,
        profile: null,
      }),
    ).toEqual({
      kind: "verified_profileless",
      user: { id: "user-1", emailVerified: true },
    });
  });

  it("returns active_onboarded_profile for verified users with an active account and profile", () => {
    expect(
      buildCurrentAppUserState({
        session: { user: { id: "user-1", email: "alice@example.com", emailVerified: true } },
        account: activeAccount,
        profile: {
          username: "alice",
          displayName: "Alice",
          bio: null,
          followerCount: 0,
          followingCount: 0,
          createdAt: new Date("2026-01-01"),
        },
      }),
    ).toEqual({
      kind: "active_onboarded_profile",
      user: { id: "user-1", email: "alice@example.com", emailVerified: true },
      profile: { username: "alice", displayName: "Alice" },
    });
  });

  it("returns limited_account before profile routing for suspended and deleted accounts", () => {
    expect(
      buildCurrentAppUserState({
        session: { user: { id: "user-1", emailVerified: true } },
        account: { ...activeAccount, status: "suspended" },
        profile: null,
      }),
    ).toEqual({
      kind: "limited_account",
      user: { id: "user-1", emailVerified: true },
      accountStatus: "suspended",
    });

    expect(
      buildCurrentAppUserState({
        session: { user: { id: "user-1", emailVerified: true } },
        account: { ...activeAccount, status: "account_deleted" },
        profile: {
          username: "alice",
          displayName: null,
          bio: null,
          followerCount: 0,
          followingCount: 0,
          createdAt: new Date("2026-01-01"),
        },
      }),
    ).toEqual({
      kind: "limited_account",
      user: { id: "user-1", emailVerified: true },
      accountStatus: "account_deleted",
    });
  });
});
