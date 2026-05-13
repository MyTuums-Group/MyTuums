import { describe, expect, it } from "vitest";
import { getSafeReturnTo } from "../lib/return-to";

describe("getSafeReturnTo", () => {
  const currentOrigin = "https://mytuums.com";

  it("allows same-origin relative return paths", () => {
    expect(
      getSafeReturnTo("/settings?tab=account#profile", { currentOrigin }),
    ).toBe("/settings?tab=account#profile");
  });

  it("allows the docs app origin for cross-app auth returns", () => {
    expect(
      getSafeReturnTo("https://docs.mytuums.com/docs/platform/overview", {
        currentOrigin,
      }),
    ).toBe("https://docs.mytuums.com/docs/platform/overview");
  });

  it("allows configured docs preview origins", () => {
    expect(
      getSafeReturnTo("https://preview-docs.example.test/docs/platform/overview", {
        currentOrigin,
        allowedOrigins: ["https://preview-docs.example.test"],
      }),
    ).toBe("https://preview-docs.example.test/docs/platform/overview");
  });

  it("rejects protocol-relative and unrelated external returns", () => {
    expect(getSafeReturnTo("//evil.example/docs", { currentOrigin })).toBeNull();
    expect(getSafeReturnTo("https://evil.example/docs", { currentOrigin })).toBeNull();
  });
});