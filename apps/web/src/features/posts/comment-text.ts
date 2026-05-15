import { COMMENT_TEXT_MAX_LENGTH } from "@workspace/types";
import { graphemeLength } from "./post-text";

export function normalizeCommentText(text: string): string {
  return text.replace(/\r\n?/g, "\n").trim();
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
