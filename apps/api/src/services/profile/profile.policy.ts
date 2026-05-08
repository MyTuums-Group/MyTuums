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
  success,
  failure,
  USERNAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_REGEX,
  DISPLAY_NAME_MAX_LENGTH,
  BIO_MAX_LENGTH,
} from "@workspace/types";
import { isReservedUsername } from "./reserved-usernames.js";

// ── Username creation (moved from @workspace/types) ──────────────────
// Behavioral logic does not belong in a types package (CONTEXT.md).
// DB unique constraint is the authoritative race guard for taken names.

/** Validates and creates a Username. Case-insensitive input is lowercased. */
export function createUsername(input: string): Result<Username> {
  const trimmed = input.trim().toLowerCase();

  if (trimmed.length === 0) {
    return failure(
      new ValidationError("Username is required.", "username"),
    );
  }

  if (trimmed.length < USERNAME_MIN_LENGTH) {
    return failure(
      new ValidationError(
        `Username must be at least ${USERNAME_MIN_LENGTH} characters.`,
        "username",
      ),
    );
  }

  if (trimmed.length > USERNAME_MAX_LENGTH) {
    return failure(
      new ValidationError(
        `Username must be at most ${USERNAME_MAX_LENGTH} characters.`,
        "username",
      ),
    );
  }

  if (!USERNAME_REGEX.test(trimmed)) {
    return failure(
      new ValidationError(
        "Username must start with a letter and contain only lowercase letters, numbers, and underscores.",
        "username",
      ),
    );
  }

  if (isReservedUsername(trimmed)) {
    return failure(
      new ValidationError("This username is reserved and cannot be used.", "username"),
    );
  }

  return success(trimmed as Username);
}

// ── Onboarding input validation ──────────────────────────────────────

export type ValidatedOnboardingInput = {
  username: Username;
  displayName: string | null;
  bio: string | null;
};

/**
 * Validates and normalizes onboarding input.
 *
 * Delegates username format + reserved-list validation to createUsername
 * (the DB unique constraint is the authoritative race guard for taken names).
 * Then normalizes display name and bio (trim whitespace, empty → null)
 * and validates their lengths post-normalization.
 */
export function validateOnboardingInput(input: {
  username: string;
  displayName?: string | null;
  bio?: string | null;
}): Result<ValidatedOnboardingInput, ValidationError> {
  const usernameResult = createUsername(input.username);
  if (!usernameResult.ok) {
    return failure(usernameResult.error);
  }

  const displayName = input.displayName?.trim() || null;
  const bio = input.bio?.trim() || null;

  if (displayName !== null && displayName.length > DISPLAY_NAME_MAX_LENGTH) {
    return failure(
      new ValidationError(
        `Display name must be at most ${DISPLAY_NAME_MAX_LENGTH} characters.`,
        "displayName",
      ),
    );
  }

  if (bio !== null && bio.length > BIO_MAX_LENGTH) {
    return failure(
      new ValidationError(
        `Bio must be at most ${BIO_MAX_LENGTH} characters.`,
        "bio",
      ),
    );
  }

  return success({ username: usernameResult.value, displayName, bio });
}