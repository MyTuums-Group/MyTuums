import type { AccountStatus } from "@workspace/types";
import type { AccountLifecycleSnapshot } from "../account-status/index.js";
import type { PublicProfile } from "../profile/index.js";

export type AppUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  emailVerified?: boolean | null;
};

export type CurrentAppUserState =
  | { kind: "unauthenticated" }
  | { kind: "authenticated_unverified"; user: AppUser }
  | { kind: "verified_profileless"; user: AppUser }
  | {
      kind: "active_onboarded_profile";
      user: AppUser;
      profile: Pick<PublicProfile, "username" | "displayName">;
    }
  | {
      kind: "limited_account";
      user: AppUser;
      accountStatus: Extract<AccountStatus, "suspended" | "account_deleted">;
    };

export type CurrentAppUserStateInput = {
  session: { user: AppUser } | null;
  account: AccountLifecycleSnapshot | null;
  profile: PublicProfile | null;
};

export function buildCurrentAppUserState(
  input: CurrentAppUserStateInput,
): CurrentAppUserState {
  if (!input.session) return { kind: "unauthenticated" };

  const user = input.session.user;

  if (!input.account || input.account.status === "account_deleted") {
    return { kind: "limited_account", user, accountStatus: "account_deleted" };
  }

  if (input.account.status === "suspended") {
    return { kind: "limited_account", user, accountStatus: "suspended" };
  }

  if (user.emailVerified === false) {
    return { kind: "authenticated_unverified", user };
  }

  if (!input.profile) {
    return { kind: "verified_profileless", user };
  }

  return {
    kind: "active_onboarded_profile",
    user,
    profile: {
      username: input.profile.username,
      displayName: input.profile.displayName,
    },
  };
}
