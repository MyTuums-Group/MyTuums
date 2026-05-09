/**
 * Profile service — public API surface.
 *
 * Routers and REST endpoints import from here.
 * Policy and adapter are internal implementation details.
 */

export {
  submitOnboarding,
  getByUsername,
  checkProfileExists,
  getMyProfile,
} from "./profile.js";
export {
  createProfileService,
  createInMemoryProfileOnboardingService,
  type OnboardingError,
  type ProfileAccessError,
  type PublicProfile,
  type ProfileOnboardingInput,
  type ProfileOnboardingAdapter,
} from "./profile.core.js";