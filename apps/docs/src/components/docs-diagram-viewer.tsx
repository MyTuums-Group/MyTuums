import { ArrowsOut } from "@phosphor-icons/react"
import { Button } from "@workspace/ui/components/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { cn } from "@workspace/ui/lib/utils"
import { lazy, startTransition, Suspense, useEffect, useState } from "react"
import {
  createTrpcClient,
  type DocsDiagramRead,
  type DocsPageRead,
} from "../lib/trpc"

const TldrawDiagramCanvas = lazy(() =>
  import("./tldraw-diagram-canvas").then((module) => ({
    default: module.TldrawDiagramCanvas,
  }))
)

const docsClient = createTrpcClient()

type DiagramMetadata = DocsPageRead["page"]["diagrams"][number]
type DiagramSnapshot = DocsDiagramRead["diagram"]["snapshot"]
type DiagramStatus = "loading" | "ready" | "error"

export function DocsDiagramViewer({
  className,
  diagram,
  pageSlug,
  sectionSlug,
}: {
  className?: string
  diagram: DiagramMetadata
  pageSlug: string
  sectionSlug: string
}) {
  const [snapshot, setSnapshot] = useState<DiagramSnapshot | null>(null)
  const [status, setStatus] = useState<DiagramStatus>("loading")
  const [fullscreenOpen, setFullscreenOpen] = useState(false)

  useEffect(() => {
    let cancelled = false

    setStatus("loading")
    setSnapshot(null)

    void docsClient.docs.diagram
      .query({
        sectionSlug,
        pageSlug,
        diagramId: diagram.id,
      })
      .then((diagramRead) => {
        if (cancelled) {
          return
        }

        startTransition(() => {
          setSnapshot(diagramRead.diagram.snapshot)
          setStatus("ready")
        })
      })
      .catch(() => {
        if (cancelled) {
          return
        }

        startTransition(() => {
          setSnapshot(null)
          setStatus("error")
        })
      })

    return () => {
      cancelled = true
    }
  }, [diagram.id, pageSlug, sectionSlug])

  return (
    <figure
      className={cn(
        "my-6 overflow-hidden rounded-lg border border-border/70 bg-card text-card-foreground shadow-sm",
        className
      )}
      data-docs-diagram-id={diagram.id}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 px-4 py-3">
        <div className="min-w-0">
          <figcaption className="font-heading text-sm font-semibold tracking-normal">
            {diagram.title}
          </figcaption>
          {diagram.description ? (
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{diagram.description}</p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Open fullscreen"
          title="Open fullscreen"
          disabled={status !== "ready"}
          onClick={() => setFullscreenOpen(true)}
        >
          <ArrowsOut weight="bold" />
        </Button>
      </div>

      <DiagramCanvasState
        diagramTitle={diagram.title}
        fullscreen={false}
        onFullscreen={() => setFullscreenOpen(true)}
        snapshot={snapshot}
        status={status}
      />

      <Sheet open={fullscreenOpen} onOpenChange={setFullscreenOpen}>
        <SheetContent
          className="inset-3 h-auto w-auto max-w-none overflow-hidden rounded-lg border border-border/70 p-0 sm:max-w-none"
          showCloseButton
        >
          <SheetHeader className="border-b border-border/70 pr-14">
            <SheetTitle>{diagram.title}</SheetTitle>
            {diagram.description ? (
              <SheetDescription>{diagram.description}</SheetDescription>
            ) : null}
          </SheetHeader>
          <div className="min-h-0 flex-1 p-3">
            <DiagramCanvasState
              diagramTitle={diagram.title}
              fullscreen
              snapshot={snapshot}
              status={status}
            />
          </div>
        </SheetContent>
      </Sheet>
    </figure>
  )
}

function DiagramCanvasState({
  diagramTitle,
  fullscreen,
  onFullscreen,
  snapshot,
  status,
}: {
  diagramTitle: string
  fullscreen: boolean
  onFullscreen?: () => void
  snapshot: DiagramSnapshot | null
  status: DiagramStatus
}) {
  if (status === "error") {
    return <DiagramStateLabel>Diagram unavailable</DiagramStateLabel>
  }

  if (status === "loading" || snapshot === null) {
    return <DiagramStateLabel>Loading diagram...</DiagramStateLabel>
  }

  return (
    <Suspense fallback={<DiagramStateLabel>Loading diagram canvas...</DiagramStateLabel>}>
      <TldrawDiagramCanvas
        className={fullscreen ? "h-[calc(100vh-8rem)]" : "h-[26rem]"}
        fullscreen={!fullscreen}
        onFullscreen={onFullscreen}
        snapshot={snapshot}
        title={diagramTitle}
      />
    </Suspense>
  )
}

function DiagramStateLabel({ children }: { children: string }) {
  return (
    <div className="flex h-64 items-center justify-center bg-muted/45 px-4 py-12 text-sm text-muted-foreground">
      {children}
    </div>
  )
}