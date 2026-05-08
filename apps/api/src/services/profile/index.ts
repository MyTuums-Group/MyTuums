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
  type OnboardingError,
  type ProfileAccessError,
  type PublicProfile,
} from "./profile.js";