// ── Game policy: validation and creation rules for GameSlug ──
// Moved from @workspace/types — types package exports only branded types and constants.

import {
  type Result,
  type GameSlug,
  success,
  failure,
  ValidationError,
} from "@workspace/types";

const GAME_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Validates and creates a GameSlug.
 * Lowercase, alphanumeric with hyphens, non-empty.
 * Slugs are immutable once shipped — this validation runs at seed/import time.
 */
export function createGameSlug(input: string): Result<GameSlug> {
  const trimmed = input.trim().toLowerCase();

  if (trimmed.length === 0) {
    return failure(new ValidationError("Game slug cannot be empty.", "slug"));
  }

  if (!GAME_SLUG_REGEX.test(trimmed)) {
    return failure(
      new ValidationError(
        "Game slug must contain only lowercase letters, numbers, and hyphens (e.g. 'elden-ring').",
        "slug",
      ),
    );
  }

  if (trimmed.length > 100) {
    return failure(new ValidationError("Game slug must be at most 100 characters.", "slug"));
  }

  return success(trimmed as GameSlug);
}