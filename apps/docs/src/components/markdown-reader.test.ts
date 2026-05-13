import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { DocsMarkdownReader, normalizeCalloutMarkdown } from "./markdown-reader"
import type { DocsPageRead } from "../lib/trpc"

const pageRead = {
  build: {
    generatedAt: "2026-05-13T12:00:00.000Z",
    commitSha: "abc1234",
  },
  page: {
    slug: "overview",
    title: "Overview",
    sourcePath: "CONTEXT.md",
    kind: "context",
    summary: "Platform overview",
    sectionId: "platform",
    sectionTitle: "Platform",
    markdown: `# Overview

## Tasks

- [x] Render tables
- [ ] Keep going

| Feature | State |
| --- | --- |
| Tables | Ready |

> [!NOTE]
> Callouts become styled reader notes.

![Platform map](diagram:platform-map)

\`\`\`ts
const message: string = "hello"
\`\`\`

<script>alert("blocked")</script>

\`\`\`mermaid
graph TD
  A --> B
\`\`\`
`,
    text: "Overview Tasks Render tables Keep going",
    headings: [
      { id: "overview", text: "Overview", level: 1 },
      { id: "tasks", text: "Tasks", level: 2 },
    ],
    links: [],
    diagrams: [
      {
        id: "platform-map",
        title: "Platform Map",
        sourcePath: "docs/diagrams/platform-map.tldr",
        description: "High-level tldraw map",
      },
    ],
  },
} satisfies DocsPageRead

describe("DocsMarkdownReader", () => {
  it("renders supported Markdown features and provenance", () => {
    const html = renderToStaticMarkup(
      createElement(DocsMarkdownReader, {
        page: pageRead.page,
        build: pageRead.build,
      })
    )

    expect(html).toContain('id="overview"')
    expect(html).toContain('href="#tasks"')
    expect(html).toContain("<table")
    expect(html).toContain('type="checkbox"')
    expect(html).toContain("Callouts become styled reader notes")
    expect(html).toContain('data-docs-diagram-id="platform-map"')
    expect(html).toContain("Platform Map")
    expect(html).toContain("hljs")
    expect(html).toContain("CONTEXT.md")
    expect(html).toContain("abc1234")
  })

  it("suppresses raw HTML and leaves Mermaid as inert code", () => {
    const pageWithoutDiagrams = {
      ...pageRead.page,
      markdown: pageRead.page.markdown.replace(
        "\n![Platform map](diagram:platform-map)\n",
        "\n"
      ),
      diagrams: [],
    }

    const html = renderToStaticMarkup(
      createElement(DocsMarkdownReader, {
        page: pageWithoutDiagrams,
        build: pageRead.build,
      })
    )

    expect(html).not.toContain("alert(&quot;blocked&quot;)")
    expect(html).not.toContain("<script")
    expect(html).toContain("graph TD")
    expect(html).not.toContain("<svg")
  })

  it("normalizes GitHub callout markers before rendering", () => {
    expect(normalizeCalloutMarkdown("> [!WARNING]\n> Read carefully.")).toBe(
      "> **Warning**\n> Read carefully."
    )
  })
})