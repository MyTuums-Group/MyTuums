import { cn } from "@workspace/ui/lib/utils"
import { useState } from "react"
import {
  Tldraw,
  type Editor,
  type TLComponents,
  type TLEditorSnapshot,
  type TLStoreSnapshot,
} from "tldraw"
import "tldraw/tldraw.css"
import { DiagramViewportControls } from "./diagram-controls"

const CAMERA_ANIMATION = { animation: { duration: 160 }, force: true } as const

const READ_ONLY_TLDRAW_COMPONENTS: TLComponents = {
  ActionsMenu: null,
  ContextMenu: null,
  DebugMenu: null,
  DebugPanel: null,
  HelpMenu: null,
  HelperButtons: null,
  ImageToolbar: null,
  KeyboardShortcutsDialog: null,
  MainMenu: null,
  MenuPanel: null,
  PageMenu: null,
  QuickActions: null,
  RichTextToolbar: null,
  SharePanel: null,
  StylePanel: null,
  Toolbar: null,
  VideoToolbar: null,
}

type DiagramSnapshot = TLEditorSnapshot | TLStoreSnapshot

export function TldrawDiagramCanvas({
  className,
  fullscreen = true,
  onFullscreen,
  snapshot,
  title,
}: {
  className?: string
  fullscreen?: boolean
  onFullscreen?: () => void
  snapshot: Record<string, unknown>
  title: string
}) {
  const [editor, setEditor] = useState<Editor | null>(null)

  function handleMount(nextEditor: Editor) {
    nextEditor.updateInstanceState({ isReadonly: true })
    setEditor(nextEditor)

    window.requestAnimationFrame(() => {
      nextEditor.zoomToFit(CAMERA_ANIMATION)
    })
  }

  return (
    <div
      className={cn("relative overflow-hidden rounded-b-lg bg-muted", className)}
      data-read-only="true"
      aria-label={`${title} diagram canvas`}
    >
      <Tldraw
        components={READ_ONLY_TLDRAW_COMPONENTS}
        hideUi
        onMount={handleMount}
        snapshot={snapshot as unknown as DiagramSnapshot}
      />
      <div className="pointer-events-none absolute right-3 bottom-3 left-3 flex justify-end">
        <div className="pointer-events-auto rounded-lg border border-border/70 bg-popover/95 p-1.5 text-popover-foreground shadow-md supports-backdrop-filter:bg-popover/80 supports-backdrop-filter:backdrop-blur-xs">
          <DiagramViewportControls
            disabled={editor === null}
            fullscreen={fullscreen}
            onFitToContent={() => editor?.zoomToFit(CAMERA_ANIMATION)}
            onFullscreen={onFullscreen}
            onResetView={() => editor?.resetZoom(undefined, CAMERA_ANIMATION)}
            onZoomIn={() => editor?.zoomIn(undefined, CAMERA_ANIMATION)}
            onZoomOut={() => editor?.zoomOut(undefined, CAMERA_ANIMATION)}
          />
        </div>
      </div>
    </div>
  )
}