/**
 * Profile service — production wiring around the pure profile core.
 */

import type { ViewerContext, AuthorizationAdapter } from "@workspace/types";
import { createProfileService, type ProfileOnboardingInput } from "./profile.core.js";
import * as adapter from "./profile.adapter.js";

const service = createProfileService(adapter);

export type {
  OnboardingError,
  ProfileAccessError,
  PublicProfile,
} from "./profile.core.js";

export function submitOnboarding(userId: string, input: ProfileOnboardingInput) {
  return service.submitOnboarding(userId, input);
}

export function getMyProfile(userId: string) {
  return service.getMyProfile(userId);
}

export function getByUsername(
  username: string,
  viewerCtx: ViewerContext | null,
  authorization: AuthorizationAdapter,
) {
  return service.getByUsername(username, viewerCtx, authorization);
}

export function getOwnerByUsername(
  username: string,
  viewerCtx: ViewerContext | null,
  authorization: AuthorizationAdapter,
) {
  return service.getOwnerByUsername(username, viewerCtx, authorization);
}

export function checkProfileExists(userId: string) {
  return service.checkProfileExists(userId);
}
