// ── PostBody — required text, grapheme-counted, max 500, trimmed ──

import { type Result, success, failure, ValidationError } from "./result.js";
import { graphemeLength } from "./grapheme.js";
import { POST_TEXT_MAX_LENGTH } from "./index.js";

declare const __brand: unique symbol;
export type PostBody = string & { [__brand]: "PostBody" };

/**
 * Validates and creates a PostBody.
 * Trims whitespace, normalizes line endings (\r\n → \n), counts grapheme clusters.
 */
export function createPostBody(input: string): Result<PostBody> {
  // Normalize line endings before trimming so \r\n at the end doesn't
  // leave an invisible \r after trim
  const normalized = input.replace(/\r\n/g, "\n");
  const trimmed = normalized.trim();

  if (trimmed.length === 0) {
    return failure(
      new ValidationError("Post text cannot be empty.", "body"),
    );
  }

  const count = graphemeLength(trimmed);
  if (count > POST_TEXT_MAX_LENGTH) {
    return failure(
      new ValidationError(
        `Post text must be at most ${POST_TEXT_MAX_LENGTH} characters (${count} provided).`,
        "body",
      ),
    );
  }

  return success(trimmed as PostBody);
}

/** Returns the grapheme count of a PostBody without re-validating. */
export function postBodyLength(body: PostBody): number {
  return graphemeLength(body);
}
