import { USERNAME_MAX_LENGTH, createUsername } from "@workspace/types"

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
  const result = createUsername(username)
  return result.ok
    ? { kind: "valid" }
    : { kind: "invalid", message: result.error.message }
}
