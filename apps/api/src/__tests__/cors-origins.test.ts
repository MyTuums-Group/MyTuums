import { describe, expect, it } from "vitest";
import { getAllowedCorsOrigins } from "../cors-origins";

describe("getAllowedCorsOrigins", () => {
  it("allows the local web and docs apps outside production", () => {
    expect(
      getAllowedCorsOrigins({
        nodeEnv: "development",
        webAppUrl: "http://localhost:5173/app",
        docsAppUrl: "http://localhost:5174/docs",
      }),
    ).toEqual(["http://localhost:5173", "http://localhost:5174"]);
  });

  it("allows the production web and docs origins by default", () => {
    expect(getAllowedCorsOrigins({ nodeEnv: "production" })).toEqual([
      "https://mytuums.com",
      "https://www.mytuums.com",
      "https://docs.mytuums.com",
    ]);
  });

  it("keeps configured deployment origins origin-only", () => {
    expect(
      getAllowedCorsOrigins({
        nodeEnv: "production",
        webAppUrl: "https://staging.mytuums.com/app",
        docsAppUrl: "https://staging-docs.mytuums.com/docs",
      }),
    ).toEqual([
      "https://mytuums.com",
      "https://www.mytuums.com",
      "https://docs.mytuums.com",
      "https://staging.mytuums.com",
      "https://staging-docs.mytuums.com",
    ]);
  });
});