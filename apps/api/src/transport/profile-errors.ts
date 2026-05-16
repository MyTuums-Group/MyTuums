import type { OnboardingError, ProfileAccessError } from "../services/profile/index.js";
import { toRestError, toTRPCError, type TransportErrorDescriptor } from "./errors.js";

export function mapOnboardingErrorToTransport(
  error: OnboardingError,
): TransportErrorDescriptor {
  switch (error.kind) {
    case "invalid_username":
      return {
        trpcCode: "BAD_REQUEST",
        httpStatus: 400,
        publicCode: "invalid_username",
        message: error.message,
      };
    case "invalid_favorite_games":
      return {
        trpcCode: "BAD_REQUEST",
        httpStatus: 400,
        publicCode: "invalid_favorite_games",
        message: error.message,
      };
    case "invalid_avatar_media":
      return {
        trpcCode: "BAD_REQUEST",
        httpStatus: 400,
        publicCode: "invalid_avatar_media",
        message: error.message,
      };
    case "already_has_profile":
      return {
        trpcCode: "CONFLICT",
        httpStatus: 409,
        publicCode: "already_has_profile",
        message: "You already have a profile.",
      };
    case "username_taken":
      return {
        trpcCode: "CONFLICT",
        httpStatus: 409,
        publicCode: "username_taken",
        message: "This username is already taken.",
      };
  }
}

export function mapProfileAccessErrorToTransport(
  error: ProfileAccessError,
): TransportErrorDescriptor {
  switch (error.kind) {
    case "not_found":
      return {
        trpcCode: "NOT_FOUND",
        httpStatus: 404,
        publicCode: "profile_not_found",
        message: "Profile not found.",
      };
    case "not_visible":
      return {
        trpcCode: "FORBIDDEN",
        httpStatus: 403,
        publicCode: "profile_not_visible",
        message: "This profile is not available.",
      };
  }
}

export function mapOnboardingErrorToTRPC(error: OnboardingError) {
  return toTRPCError(mapOnboardingErrorToTransport(error));
}

export function mapProfileAccessErrorToTRPC(error: ProfileAccessError) {
  return toTRPCError(mapProfileAccessErrorToTransport(error));
}

export function mapOnboardingErrorToRest(error: OnboardingError) {
  return toRestError(mapOnboardingErrorToTransport(error));
}

export function mapProfileAccessErrorToRest(error: ProfileAccessError) {
  return toRestError(mapProfileAccessErrorToTransport(error));
}
