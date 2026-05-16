// ── Body text invariants (Post, Comment, Contact message bodies) ──
// Pure helpers shared by API policies and web UX; API validation stays canonical.

type GraphemeSegmenter = {
  segment(input: string): Iterable<unknown>;
};

type IntlWithSegmenter = typeof Intl & {
  Segmenter?: new (
    locales: string | string[],
    options: { granularity: "grapheme" },
  ) => GraphemeSegmenter;
};

/**
 * Normalizes free-form body text the same way domain policies do:
 * CRLF/CR → LF, then trims outer whitespace.
 */
export function normalizeBodyText(input: string): string {
  return input.replace(/\r\n?/g, "\n").trim();
}

/**
 * Counts Unicode extended grapheme clusters when `Intl.Segmenter` is available;
 * otherwise falls back to UTF-16 code unit length (same contract as API v1).
 */
export function graphemeLength(text: string): number {
  try {
    const Segmenter = (Intl as IntlWithSegmenter).Segmenter;
    if (typeof Segmenter !== "function") {
      return text.length;
    }

    const segmenter = new Segmenter("en", { granularity: "grapheme" });
    let count = 0;
    for (const _ of segmenter.segment(text)) {
      void _;
      count++;
    }
    return count;
  } catch {
    return text.length;
  }
}
