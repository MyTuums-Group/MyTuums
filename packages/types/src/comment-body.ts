import { graphemeLength, normalizeBodyText } from "./grapheme.js"
import { failure, success, ValidationError, type Result } from "./result.js"

declare const __brand: unique symbol
export type CommentBody = string & { [__brand]: "CommentBody" }

export const COMMENT_TEXT_MAX_LENGTH = 300

export function createCommentBody(input: string): Result<CommentBody> {
  const trimmed = normalizeBodyText(input)

  if (trimmed.length === 0) {
    return failure(new ValidationError("Comment text cannot be empty.", "body"))
  }

  const count = graphemeLength(trimmed)
  if (count > COMMENT_TEXT_MAX_LENGTH) {
    return failure(
      new ValidationError(
        `Comment text must be at most ${COMMENT_TEXT_MAX_LENGTH} characters (${count} provided).`,
        "body"
      )
    )
  }

  return success(trimmed as CommentBody)
}

export function commentBodyLength(body: CommentBody): number {
  return graphemeLength(body)
}
