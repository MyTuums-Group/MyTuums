import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { DocsSearch, getDocsSearchResultHref } from "./docs-search"
import type { DocsSearchResult } from "@/lib/trpc"

const result = {
  id: "section:orientation/context:2",
  sectionSlug: "orientation",
  sectionTitle: "Orientation",
  pageSlug: "orientation/context",
  pageTitle: "Context",
  headingId: "merge-policy",
  headingText: "Merge Policy",
  excerpt: "All CI checks must pass before merging.",
} satisfies DocsSearchResult

describe("DocsSearch", () => {
  it("renders the authorized docs search input", () => {
    const html = renderToStaticMarkup(createElement(DocsSearch))

    expect(html).toContain('aria-label="Search docs"')
    expect(html).toContain('placeholder="Search docs"')
    expect(html).not.toContain("All CI checks must pass")
  })

  it("links results to stable semantic slugs and heading anchors", () => {
    expect(getDocsSearchResultHref(result)).toBe(
      "/docs/orientation/orientation%2Fcontext#merge-policy"
    )
    expect(getDocsSearchResultHref({ ...result, headingId: null })).toBe(
      "/docs/orientation/orientation%2Fcontext"
    )
  })
})