// ── Grapheme cluster counting — shared by PostBody and CommentBody ──
//
// Uses Intl.Segmenter when available (Node ≥16, all modern browsers) for
// accurate grapheme cluster counting. Falls back to string length.
//
// The Segmenter access uses `any` intentionally — Intl.Segmenter types may
// not be available in all TS lib targets, but the runtime check is safe.

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
function tryGraphemeCount(text: string): number | undefined {
  try {
    const IntlAny: any = (globalThis as any).Intl;
    if (!IntlAny?.Segmenter) return undefined;
    const seg: any = new IntlAny.Segmenter("en", { granularity: "grapheme" });
    let count = 0;
    const segments: any = seg.segment(text);
    for (const _s of segments) {
      void _s;
      count++;
    }
    return count;
  } catch {
    return undefined;
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

export function graphemeLength(text: string): number {
  const count = tryGraphemeCount(text);
  if (count !== undefined) return count;

  // Fallback: code unit length. Accurate for Latin, Cyrillic, CJK text.
  // Under-counts compound emoji (acceptable for v1).
  return text.length;
}
