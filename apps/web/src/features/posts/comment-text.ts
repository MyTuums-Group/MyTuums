import {
  COMMENT_TEXT_MAX_LENGTH,
  graphemeLength,
  normalizeBodyText,
} from "@workspace/types";

/** Mirrors API comment body normalization (`normalizeBodyText`). */
export function normalizeCommentText(text: string): string {
  return normalizeBodyText(text);
}

export function getCommentTextState(text: string) {
  const normalizedText = normalizeCommentText(text);
  const count = graphemeLength(normalizedText);

  return {
    normalizedText,
    count,
    isEmpty: normalizedText.length === 0,
    isTooLong: count > COMMENT_TEXT_MAX_LENGTH,
  };
}
