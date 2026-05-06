// ── CommentBody — required text, grapheme-counted, max 300, trimmed ──

import { type Result, success, failure, ValidationError } from "./result.js";
import { graphemeLength } from "./grapheme.js";
import { COMMENT_TEXT_MAX_LENGTH } from "./index.js";

declare const __brand: unique symbol;
export type CommentBody = string & { [__brand]: "CommentBody" };

/**
 * Validates and creates a CommentBody.
 * Same rules as PostBody but max 300 grapheme clusters.
 */
export function createCommentBody(input: string): Result<CommentBody> {
  // Normalize line endings before trimming
  const normalized = input.replace(/\r\n/g, "\n");
  const trimmed = normalized.trim();

  if (trimmed.length === 0) {
    return failure(
      new ValidationError("Comment text cannot be empty.", "body"),
    );
  }

  const count = graphemeLength(trimmed);
  if (count > COMMENT_TEXT_MAX_LENGTH) {
    return failure(
      new ValidationError(
        `Comment text must be at most ${COMMENT_TEXT_MAX_LENGTH} characters (${count} provided).`,
        "body",
      ),
    );
  }

  return success(trimmed as CommentBody);
}
