// ── Comment policy: validation and creation rules for CommentBody ──
// Moved from @workspace/types — types package exports only branded types and constants.

import {
  type Result,
  type CommentBody,
  success,
  failure,
  ValidationError,
  COMMENT_TEXT_MAX_LENGTH,
  graphemeLength,
  normalizeBodyText,
} from "@workspace/types";

/**
 * Validates and creates a CommentBody.
 * Same rules as PostBody but max 300 grapheme clusters.
 */
export function createCommentBody(input: string): Result<CommentBody> {
  const trimmed = normalizeBodyText(input);

  if (trimmed.length === 0) {
    return failure(new ValidationError("Comment text cannot be empty.", "body"));
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
