import type { AccountDeletionError } from "../services/account-deletion/index.js"
import type { SettingsProfileError } from "../services/settings/index.js"
import {
  toRestError,
  toTRPCError,
  type TransportErrorDescriptor,
} from "./errors.js"

export type SettingsThemePreferenceError = {
  kind: "theme_preference_update_failed"
}

export function mapSettingsProfileErrorToTransport(
  error: SettingsProfileError
): TransportErrorDescriptor {
  switch (error.kind) {
    case "profile_not_found":
      return {
        trpcCode: "NOT_FOUND",
        httpStatus: 404,
        publicCode: "profile_not_found",
        message: "Profile not found.",
      }
    case "invalid_profile":
    case "invalid_favorite_games":
      return {
        trpcCode: "BAD_REQUEST",
        httpStatus: 400,
        publicCode: error.kind,
        message: error.message,
      }
    case "media_attachment_failed":
      return {
        trpcCode: "BAD_REQUEST",
        httpStatus: 400,
        publicCode: "media_attachment_failed",
        message: `Could not attach ${error.slot} media: ${error.reason}`,
      }
  }
}

export function mapAccountDeletionErrorToTransport(
  error: AccountDeletionError
): TransportErrorDescriptor {
  switch (error.kind) {
    case "account_not_found":
      return {
        trpcCode: "NOT_FOUND",
        httpStatus: 404,
        publicCode: "account_not_found",
        message: "Account not found.",
      }
    case "already_deleted":
      return {
        trpcCode: "CONFLICT",
        httpStatus: 409,
        publicCode: "account_already_deleted",
        message: "This account has already been deleted.",
      }
    case "invalid_password":
      return {
        trpcCode: "BAD_REQUEST",
        httpStatus: 400,
        publicCode: "invalid_password",
        message: "Password confirmation failed.",
      }
    case "owner_cannot_self_delete":
      return {
        trpcCode: "FORBIDDEN",
        httpStatus: 403,
        publicCode: "owner_cannot_self_delete",
        message: "Owner accounts cannot be self-deleted.",
      }
    case "staff_cannot_self_delete":
      return {
        trpcCode: "FORBIDDEN",
        httpStatus: 403,
        publicCode: "staff_cannot_self_delete",
        message: "Staff accounts cannot be self-deleted.",
      }
  }
}

export function mapSettingsThemePreferenceErrorToTransport(
  _error: SettingsThemePreferenceError
): TransportErrorDescriptor {
  return {
    trpcCode: "INTERNAL_SERVER_ERROR",
    httpStatus: 500,
    publicCode: "theme_preference_update_failed",
    message: "Could not update theme preference.",
  }
}

export function mapSettingsProfileErrorToTRPC(error: SettingsProfileError) {
  return toTRPCError(mapSettingsProfileErrorToTransport(error))
}

export function mapAccountDeletionErrorToTRPC(error: AccountDeletionError) {
  return toTRPCError(mapAccountDeletionErrorToTransport(error))
}

export function mapSettingsThemePreferenceErrorToTRPC(
  error: SettingsThemePreferenceError
) {
  return toTRPCError(mapSettingsThemePreferenceErrorToTransport(error))
}

export function mapSettingsProfileErrorToRest(error: SettingsProfileError) {
  return toRestError(mapSettingsProfileErrorToTransport(error))
}

export function mapAccountDeletionErrorToRest(error: AccountDeletionError) {
  return toRestError(mapAccountDeletionErrorToTransport(error))
}

export function mapSettingsThemePreferenceErrorToRest(
  error: SettingsThemePreferenceError
) {
  return toRestError(mapSettingsThemePreferenceErrorToTransport(error))
}
