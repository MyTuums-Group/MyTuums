import { describe, expect, it } from "vitest";
import { POST_TEXT_MAX_LENGTH } from "@workspace/types";
import { getPostTextState, normalizePostText } from "../features/posts/post-text";

describe("post text helpers", () => {
  it("normalizes CRLF and CR line endings and trims outer whitespace", () => {
    expect(
      normalizePostText("\r\n  first line\rsecond line\r\nthird line  \r\n"),
    ).toBe("first line\nsecond line\nthird line");
  });

  it("counts grapheme clusters on normalized text", () => {
    const state = getPostTextState(` ${"👨‍👩‍👧‍👦".repeat(2)} `);

    expect(state.count).toBe(2);
    expect(state.isEmpty).toBe(false);
    expect(state.isTooLong).toBe(false);
  });

  it("treats trimmed empty text as invalid and enforces the 500-character limit", () => {
    expect(getPostTextState("   \n\t ").isEmpty).toBe(true);

    const withinLimit = getPostTextState(` ${"a".repeat(POST_TEXT_MAX_LENGTH)} `);
    const tooLong = getPostTextState("a".repeat(POST_TEXT_MAX_LENGTH + 1));

    expect(withinLimit.count).toBe(POST_TEXT_MAX_LENGTH);
    expect(withinLimit.isTooLong).toBe(false);
    expect(tooLong.isTooLong).toBe(true);
  });
});
