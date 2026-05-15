import { describe, expect, it } from "vitest";
import { COMMENT_TEXT_MAX_LENGTH } from "@workspace/types";
import {
  getCommentTextState,
  normalizeCommentText,
} from "../features/posts/comment-text";

describe("comment text helpers", () => {
  it("normalizes line endings, trims text, and enforces the 300-grapheme limit", () => {
    expect(
      normalizeCommentText("\r\n  first line\rsecond line\r\n  "),
    ).toBe("first line\nsecond line");

    const graphemeState = getCommentTextState(` ${"👨‍👩‍👧‍👦".repeat(2)} `);
    expect(graphemeState.count).toBe(2);
    expect(graphemeState.isEmpty).toBe(false);

    expect(getCommentTextState(" \n\t ").isEmpty).toBe(true);
    expect(
      getCommentTextState("a".repeat(COMMENT_TEXT_MAX_LENGTH + 1)).isTooLong,
    ).toBe(true);
  });
});
