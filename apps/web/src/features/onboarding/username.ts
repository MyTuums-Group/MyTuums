import { USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH } from "@workspace/types"

const USERNAME_PATTERN = /^[a-z][a-z0-9_]*$/
const UNSUPPORTED_USERNAME_CHARACTER_PATTERN = /[^a-z0-9_]/g
const LEADING_NON_LETTER_PATTERN = /^[^a-z]+/

export type UsernameValidation =
  | { kind: "invalid"; message: string }
  | { kind: "valid" }

export function normalizeUsernameInput(value: string) {
  return value
    .toLowerCase()
    .replace(UNSUPPORTED_USERNAME_CHARACTER_PATTERN, "")
    .replace(LEADING_NON_LETTER_PATTERN, "")
    .slice(0, USERNAME_MAX_LENGTH)
}

export function validateUsernameCandidate(
  username: string
): UsernameValidation {
  if (username.length === 0) {
    return { kind: "invalid", message: "Username is required." }
  }

  if (username.length < USERNAME_MIN_LENGTH) {
    return {
      kind: "invalid",
      message: `Username must be at least ${USERNAME_MIN_LENGTH} characters.`,
    }
  }

  if (username.length > USERNAME_MAX_LENGTH) {
    return {
      kind: "invalid",
      message: `Username must be at most ${USERNAME_MAX_LENGTH} characters.`,
    }
  }

  if (!USERNAME_PATTERN.test(username)) {
    return {
      kind: "invalid",
      message:
        "Username must start with a letter and contain only lowercase letters, numbers, and underscores.",
    }
  }

  return { kind: "valid" }
}
