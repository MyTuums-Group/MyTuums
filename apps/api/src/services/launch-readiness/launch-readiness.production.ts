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
