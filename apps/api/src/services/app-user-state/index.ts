import type { Context } from "../../context.js";
import { getMyProfile } from "../profile/index.js";
import {
  buildCurrentAppUserState,
  type CurrentAppUserState,
} from "./policy.js";

export type { AppUser, CurrentAppUserState } from "./policy.js";
export { buildCurrentAppUserState } from "./policy.js";

export async function getCurrentAppUserState(
  ctx: Pick<Context, "session" | "accountLifecycle">,
): Promise<CurrentAppUserState> {
  if (!ctx.session) {
    return buildCurrentAppUserState({ session: null, account: null, profile: null });
  }

  const account = ctx.accountLifecycle;
  const shouldLoadProfile = account?.status === "active" && ctx.session.user.emailVerified !== false;
  const profile = shouldLoadProfile ? await getMyProfile(ctx.session.user.id) : null;

  return buildCurrentAppUserState({
    session: ctx.session,
    account,
    profile,
  });
}
