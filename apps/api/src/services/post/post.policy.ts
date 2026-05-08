// ── Post policy: validation and creation rules for PostBody ──
// Moved from @workspace/types — types package exports only branded types and constants.

import {
  type Result,
  type PostBody,
  success,
  failure,
  ValidationError,
  POST_TEXT_MAX_LENGTH,
} from "@workspace/types";
import { graphemeLength } from "./grapheme.js";

/**
 * Validates and creates a PostBody.
 * Trims whitespace, normalizes line endings (\r\n → \n), counts grapheme clusters.
 */
export function createPostBody(input: string): Result<PostBody> {
  const normalized = input.replace(/\r\n/g, "\n");
  const trimmed = normalized.trim();

  if (trimmed.length === 0) {
    return failure(new ValidationError("Post text cannot be empty.", "body"));
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