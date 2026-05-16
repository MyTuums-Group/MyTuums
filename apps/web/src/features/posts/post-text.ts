import {
  POST_TEXT_MAX_LENGTH,
  graphemeLength,
  normalizeBodyText,
} from "@workspace/types";

/** Mirrors API post body normalization (`normalizeBodyText`). */
export function normalizePostText(text: string): string {
  return normalizeBodyText(text);
}

export function getPostTextState(text: string) {
  const normalizedText = normalizePostText(text);
  const count = graphemeLength(normalizedText);

  return {
    normalizedText,
    count,
    isEmpty: normalizedText.length === 0,
    isTooLong: count > POST_TEXT_MAX_LENGTH,
  };
}
