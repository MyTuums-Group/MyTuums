import { POST_TEXT_MAX_LENGTH } from "@workspace/types";

export function normalizePostText(text: string): string {
  return text.replace(/\r\n?/g, "\n").trim();
}

export function graphemeLength(text: string): number {
  try {
    if (typeof Intl === "undefined" || !Intl.Segmenter) {
      return text.length;
    }

    const segmenter = new Intl.Segmenter("en", {
      granularity: "grapheme",
    });

    let count = 0;
    for (const _segment of segmenter.segment(text)) {
      void _segment;
      count += 1;
    }

    return count;
  } catch {
    return text.length;
  }
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
