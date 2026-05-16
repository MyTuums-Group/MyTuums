/**
 * Profile service — production wiring around the pure profile core.
 */

import type { ViewerContext, AuthorizationAdapter } from "@workspace/types"
import {
  createProfileService,
  type ProfileOnboardingInput,
} from "./profile.core.js"
import * as adapter from "./profile.adapter.js"

async function signMediaReadUrl(mediaId: string): Promise<string | null> {
  const { mediaService } = await import("../media/media-service.production.js")
  const result = await mediaService.signReadUrl(mediaId)
  return result.ok ? result.value.readUrl : null
}

const service = createProfileService({
  adapter,
  media: {
    async attachMedia(mediaId: string, userId: string) {
      const { mediaService } = await import(
        "../media/media-service.production.js"
      )
      return mediaService.attachMedia(mediaId, userId, "profile_avatar")
    },
  },
  signMediaReadUrl,
})

export type {
  OnboardingError,
  ProfileAccessError,
  PublicProfile,
} from "./profile.core.js"

export function submitOnboarding(
  userId: string,
  input: ProfileOnboardingInput
) {
  return service.submitOnboarding(userId, input)
}

export function checkUsernameAvailability(username: string) {
  return service.checkUsernameAvailability(username)
}

export function getMyProfile(userId: string) {
  return service.getMyProfile(userId)
}

export function getByUsername(
  username: string,
  viewerCtx: ViewerContext | null,
  authorization: AuthorizationAdapter
) {
  return service.getByUsername(username, viewerCtx, authorization)
}

export function getOwnerByUsername(
  username: string,
  viewerCtx: ViewerContext | null,
  authorization: AuthorizationAdapter
) {
  return service.getOwnerByUsername(username, viewerCtx, authorization)
}

export function checkProfileExists(userId: string) {
  return service.checkProfileExists(userId)
}
