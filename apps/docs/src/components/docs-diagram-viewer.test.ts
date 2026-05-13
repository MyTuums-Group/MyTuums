import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import {
  DiagramViewportControls,
  FORBIDDEN_DIAGRAM_CONTROL_TERMS,
  READ_ONLY_DIAGRAM_CONTROL_LABELS,
} from "./diagram-controls"
import { DocsDiagramViewer } from "./docs-diagram-viewer"
import type { DocsPageRead } from "../lib/trpc"

const noop = () => undefined

const diagram = {
  id: "platform-map",
  title: "Platform Map",
  sourcePath: "docs/diagrams/platform-map.tldr",
  description: "High-level architecture map",
} satisfies DocsPageRead["page"]["diagrams"][number]

describe("DocsDiagramViewer", () => {
  it("renders only read-only diagram controls at the component boundary", () => {
    const html = renderToStaticMarkup(
      createElement(DiagramViewportControls, {
        onFitToContent: noop,
        onFullscreen: noop,
        onResetView: noop,
        onZoomIn: noop,
        onZoomOut: noop,
      })
    )

    for (const label of READ_ONLY_DIAGRAM_CONTROL_LABELS) {
      expect(html).toContain(`aria-label="${label}"`)
    }

    for (const forbiddenTerm of FORBIDDEN_DIAGRAM_CONTROL_TERMS) {
      expect(html.toLocaleLowerCase()).not.toContain(forbiddenTerm.toLocaleLowerCase())
    }
  })

  it("renders diagram metadata without exposing edit, export, or download actions", () => {
    const html = renderToStaticMarkup(
      createElement(DocsDiagramViewer, {
        diagram,
        pageSlug: "overview",
        sectionSlug: "platform",
      })
    )

    expect(html).toContain('data-docs-diagram-id="platform-map"')
    expect(html).toContain("Platform Map")
    expect(html).toContain("Loading diagram")
    expect(html.toLocaleLowerCase()).not.toContain("export")
    expect(html.toLocaleLowerCase()).not.toContain("download")
    expect(html.toLocaleLowerCase()).not.toContain("edit")
  })
})