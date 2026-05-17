import { failure, success, ValidationError, type Result } from "./result.js"
import { isReservedUsername } from "./reserved-usernames.js"

declare const __brand: unique symbol
export type Username = string & { [__brand]: "Username" }

export const USERNAME_MIN_LENGTH = 3
export const USERNAME_MAX_LENGTH = 20

const USERNAME_REGEX = /^[a-z][a-z0-9_]*$/

export function createUsername(input: string): Result<Username> {
  const trimmed = input.trim().toLowerCase()

  if (trimmed.length === 0) {
    return failure(new ValidationError("Username is required.", "username"))
  }

  if (trimmed.length < USERNAME_MIN_LENGTH) {
    return failure(
      new ValidationError(
        `Username must be at least ${USERNAME_MIN_LENGTH} characters.`,
        "username"
      )
    )
  }

  if (trimmed.length > USERNAME_MAX_LENGTH) {
    return failure(
      new ValidationError(
        `Username must be at most ${USERNAME_MAX_LENGTH} characters.`,
        "username"
      )
    )
  }

  if (!USERNAME_REGEX.test(trimmed)) {
    return failure(
      new ValidationError(
        "Username must start with a letter and contain only lowercase letters, numbers, and underscores.",
        "username"
      )
    )
  }

  if (isReservedUsername(trimmed)) {
    return failure(
      new ValidationError(
        "This username is reserved and cannot be used.",
        "username"
      )
    )
  }

  return success(trimmed as Username)
}
