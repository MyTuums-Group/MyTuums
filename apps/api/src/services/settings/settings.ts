import type { MediaPurpose } from "@workspace/types"
import { mediaService } from "../media/media-service.production.js"
import { settingsAdapter } from "./settings.adapter.js"
import {
  createSettingsService,
  type SettingsService,
  type SettingsThemePreference,
  type SettingsUpdateProfileInput,
} from "./settings.core.js"

export const settingsService = createSettingsService({
  adapter: settingsAdapter,
  media: {
    attachMedia(mediaId, userId, expectedPurpose) {
      return mediaService.attachMedia(
        mediaId,
        userId,
        expectedPurpose satisfies Extract<
          MediaPurpose,
          "profile_avatar" | "profile_banner"
        >
      )
    },
  },
})

export function getSettings(
  input: Parameters<SettingsService["getSettings"]>[0]
) {
  return settingsService.getSettings(input)
}

export function updateProfile(
  userId: string,
  input: SettingsUpdateProfileInput
) {
  return settingsService.updateProfile(userId, input)
}

export function updateThemePreference(
  userId: string,
  theme: SettingsThemePreference
) {
  return settingsService.updateThemePreference(userId, theme)
}
