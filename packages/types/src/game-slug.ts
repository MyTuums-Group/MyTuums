import { failure, success, ValidationError, type Result } from "./result.js"

declare const __brand: unique symbol
export type GameSlug = string & { [__brand]: "GameSlug" }

export const GAME_SLUG_MAX_LENGTH = 100

const GAME_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function createGameSlug(input: string): Result<GameSlug> {
  const trimmed = input.trim().toLowerCase()

  if (trimmed.length === 0) {
    return failure(new ValidationError("Game slug cannot be empty.", "slug"))
  }

  if (!GAME_SLUG_REGEX.test(trimmed)) {
    return failure(
      new ValidationError(
        "Game slug must contain only lowercase letters, numbers, and hyphens (e.g. 'elden-ring').",
        "slug"
      )
    )
  }

  if (trimmed.length > GAME_SLUG_MAX_LENGTH) {
    return failure(
      new ValidationError(
        `Game slug must be at most ${GAME_SLUG_MAX_LENGTH} characters.`,
        "slug"
      )
    )
  }

  return success(trimmed as GameSlug)
}
