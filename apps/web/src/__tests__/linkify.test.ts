import { describe, expect, it } from "vitest";
import { linkifyText, USER_GENERATED_LINK_REL } from "../features/posts/linkify";

describe("linkifyText", () => {
  it("linkifies only explicit http and https URLs", () => {
    expect(
      linkifyText("Visit https://mytuums.com and http://example.com/test."),
    ).toEqual([
      { type: "text", text: "Visit " },
      {
        type: "link",
        text: "https://mytuums.com",
        href: "https://mytuums.com",
        rel: USER_GENERATED_LINK_REL,
      },
      { type: "text", text: " and " },
      {
        type: "link",
        text: "http://example.com/test",
        href: "http://example.com/test",
        rel: USER_GENERATED_LINK_REL,
      },
      { type: "text", text: "." },
    ]);
  });

  it("marks generated user links with ugc and external-link safety rel tokens", () => {
    const parts = linkifyText("Read https://example.com/post");
    const link = parts.find((part) => part.type === "link");

    expect(link).toMatchObject({
      type: "link",
      href: "https://example.com/post",
      rel: USER_GENERATED_LINK_REL,
    });
    expect(link?.rel.split(" ")).toEqual([
      "nofollow",
      "noopener",
      "noreferrer",
      "ugc",
    ]);
  });

  it("leaves bare domains, emails, and unsafe schemes as plain text", () => {
    expect(linkifyText("example.com test@example.com javascript:alert(1)")).toEqual([
      {
        type: "text",
        text: "example.com test@example.com javascript:alert(1)",
      },
    ]);
  });

  it("drops unmatched closing punctuation from links while preserving surrounding text", () => {
    expect(linkifyText("(https://example.com/path).")).toEqual([
      { type: "text", text: "(" },
      {
        type: "link",
        text: "https://example.com/path",
        href: "https://example.com/path",
        rel: USER_GENERATED_LINK_REL,
      },
      { type: "text", text: ")." },
    ]);
  });
});
