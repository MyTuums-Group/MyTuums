import { env } from "@workspace/config"
import {
  createLaunchReadinessService,
  type LaunchReadinessService,
} from "./index.js"
import { launchReadinessRepository } from "./launch-readiness.adapter.js"

const baseLaunchReadinessService = createLaunchReadinessService(
  launchReadinessRepository
)

export const launchReadinessService: LaunchReadinessService = {
  async getReadiness() {
    if (env.NODE_ENV === "development") {
      // Skip DB readiness and default-off launch flags so local dev works without
      // seeding owner/staff or setting MEDIA_UPLOADS_ENABLED / PUBLIC_SIGNUP_ENABLED.
      return {
        publicSignupEnabled: true,
        mediaUploadsEnabled: true,
        reasons: [],
      }
    }

    const readiness = await baseLaunchReadinessService.getReadiness()
    return {
      ...readiness,
      publicSignupEnabled:
        env.PUBLIC_SIGNUP_ENABLED && readiness.publicSignupEnabled,
      mediaUploadsEnabled:
        env.MEDIA_UPLOADS_ENABLED && readiness.mediaUploadsEnabled,
    }
  },
}
