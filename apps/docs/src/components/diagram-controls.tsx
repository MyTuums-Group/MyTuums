import {
  ArrowsCounterClockwise,
  CornersOut,
  MagnifyingGlassMinus,
  MagnifyingGlassPlus,
  Scan,
} from "@phosphor-icons/react"
import { Button } from "@workspace/ui/components/button"
import type { ReactNode } from "react"

export const READ_ONLY_DIAGRAM_CONTROL_LABELS = [
  "Zoom in",
  "Zoom out",
  "Fit to content",
  "Reset view",
  "Open fullscreen",
] as const

export const FORBIDDEN_DIAGRAM_CONTROL_TERMS = [
  "Edit",
  "Export",
  "Download",
  "Copy",
  "Paste",
  "Save",
  "Persist",
] as const

export function DiagramViewportControls({
  disabled = false,
  fullscreen = true,
  onFitToContent,
  onFullscreen,
  onResetView,
  onZoomIn,
  onZoomOut,
}: {
  disabled?: boolean
  fullscreen?: boolean
  onFitToContent: () => void
  onFullscreen?: () => void
  onResetView: () => void
  onZoomIn: () => void
  onZoomOut: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label="Diagram view controls">
      <DiagramControlButton
        disabled={disabled}
        label="Zoom in"
        onClick={onZoomIn}
        icon={<MagnifyingGlassPlus weight="bold" />}
      />
      <DiagramControlButton
        disabled={disabled}
        label="Zoom out"
        onClick={onZoomOut}
        icon={<MagnifyingGlassMinus weight="bold" />}
      />
      <DiagramControlButton
        disabled={disabled}
        label="Fit to content"
        onClick={onFitToContent}
        icon={<Scan weight="bold" />}
      />
      <DiagramControlButton
        disabled={disabled}
        label="Reset view"
        onClick={onResetView}
        icon={<ArrowsCounterClockwise weight="bold" />}
      />
      {fullscreen && onFullscreen ? (
        <DiagramControlButton
          disabled={disabled}
          label="Open fullscreen"
          onClick={onFullscreen}
          icon={<CornersOut weight="bold" />}
        />
      ) : null}
    </div>
  )
}

function DiagramControlButton({
  disabled,
  icon,
  label,
  onClick,
}: {
  disabled: boolean
  icon: ReactNode
  label: (typeof READ_ONLY_DIAGRAM_CONTROL_LABELS)[number]
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
    </Button>
  )
}