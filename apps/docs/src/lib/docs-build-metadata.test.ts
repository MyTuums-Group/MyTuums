import { describe, expect, it } from "vitest"
import { getDocsBuildMetadata } from "./docs-build-metadata"

describe("getDocsBuildMetadata", () => {
  it("uses safe defaults when deployment env is missing", () => {
    expect(getDocsBuildMetadata({})).toEqual({
      environment: "local",
      siteUrl: "https://docs.mytuums.com",
      apiBaseUrl: null,
      commitSha: null,
      buildTime: null,
      basePath: "/",
    })
  })

  it("normalizes configured deployment metadata", () => {
    expect(
      getDocsBuildMetadata({
        BASE_URL: "/docs/",
        VITE_DOCS_ENVIRONMENT: "production",
        VITE_DOCS_SITE_URL: "https://docs.mytuums.com",
        VITE_DOCS_API_BASE_URL: "https://api.mytuums.com",
        VITE_DOCS_BUILD_SHA: "abc1234",
        VITE_DOCS_BUILD_TIME: "2026-05-13T17:20:00.000Z",
      })
    ).toEqual({
      environment: "production",
      siteUrl: "https://docs.mytuums.com",
      apiBaseUrl: "https://api.mytuums.com",
      commitSha: "abc1234",
      buildTime: "2026-05-13T17:20:00.000Z",
      basePath: "/docs/",
    })
  })
})
