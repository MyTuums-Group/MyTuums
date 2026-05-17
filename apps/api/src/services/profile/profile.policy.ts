/**
 * Profile policy — pure validation functions for onboarding and profile rules.
 *
 * No DB access, no side effects, no transport types.
 * Business rules for username, display name, and bio validation live here.
 */

import {
  type Result,
  type Username,
  ValidationError,
  createUsername,
  success,
  failure,
  DISPLAY_NAME_MAX_LENGTH,
  BIO_MAX_LENGTH,
  MAX_FAVORITE_GAMES,
} from "@workspace/types"

// ── Onboarding input validation ──────────────────────────────────────

export type ValidatedOnboardingInput = {
  username: Username
  displayName: string | null
  bio: string | null
}

/**
 * Validates and normalizes onboarding input.
 *
 * Delegates username format + reserved-list validation to createUsername
 * (the DB unique constraint is the authoritative race guard for taken names).
 * Then normalizes display name and bio (trim whitespace, empty → null)
 * and validates their lengths post-normalization.
 */
export function validateOnboardingInput(input: {
  username: string
  displayName?: string | null
  bio?: string | null
}): Result<ValidatedOnboardingInput, ValidationError> {
  const usernameResult = createUsername(input.username)
  if (!usernameResult.ok) {
    return failure(usernameResult.error)
  }

  const displayName = input.displayName?.trim() || null
  const bio = input.bio?.trim() || null

  if (displayName !== null && displayName.length > DISPLAY_NAME_MAX_LENGTH) {
    return failure(
      new ValidationError(
        `Display name must be at most ${DISPLAY_NAME_MAX_LENGTH} characters.`,
        "displayName"
      )
    )
  }

  if (bio !== null && bio.length > BIO_MAX_LENGTH) {
    return failure(
      new ValidationError(
        `Bio must be at most ${BIO_MAX_LENGTH} characters.`,
        "bio"
      )
    )
  }

  return success({ username: usernameResult.value, displayName, bio })
}

export function validateFavoriteGameIds(
  gameIds: string[]
): Result<string[], ValidationError> {
  if (gameIds.length > MAX_FAVORITE_GAMES) {
    return failure(
      new ValidationError(
        `Choose at most ${MAX_FAVORITE_GAMES} favorite games.`,
        "favoriteGameIds"
      )
    )
  }

  if (new Set(gameIds).size !== gameIds.length) {
    return failure(
      new ValidationError("Favorite games must be unique.", "favoriteGameIds")
    )
  }

  return success(gameIds)
}
