// ── Username — immutable v1 handle, 3-20 chars, lowercase [a-z][a-z0-9_] ──

import { type Result, success, failure, ValidationError } from "./result.js";
import { isReservedUsername } from "./reserved-usernames.js";
import {
  USERNAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_REGEX,
} from "./index.js";

declare const __brand: unique symbol;
export type Username = string & { [__brand]: "Username" };

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

/** Type guard. Does not re-validate — use createUsername for that. */
export function isUsername(value: unknown): value is Username {
  return (
    typeof value === "string" &&
    value.length >= USERNAME_MIN_LENGTH &&
    value.length <= USERNAME_MAX_LENGTH &&
    USERNAME_REGEX.test(value) &&
    !isReservedUsername(value)
  );
}
