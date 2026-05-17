import { graphemeLength, normalizeBodyText } from "./grapheme.js"
import { failure, success, ValidationError, type Result } from "./result.js"

declare const __brand: unique symbol
export type PostBody = string & { [__brand]: "PostBody" }

export const POST_TEXT_MAX_LENGTH = 500

export function createPostBody(input: string): Result<PostBody> {
  const trimmed = normalizeBodyText(input)

  if (trimmed.length === 0) {
    return failure(new ValidationError("Post text cannot be empty.", "body"))
  }

  const count = graphemeLength(trimmed)
  if (count > POST_TEXT_MAX_LENGTH) {
    return failure(
      new ValidationError(
        `Post text must be at most ${POST_TEXT_MAX_LENGTH} characters (${count} provided).`,
        "body"
      )
    )
  }

  return success(trimmed as PostBody)
}

export function postBodyLength(body: PostBody): number {
  return graphemeLength(body)
}
