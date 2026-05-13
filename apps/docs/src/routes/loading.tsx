import { CircleNotch } from "@phosphor-icons/react"
import { createFileRoute } from "@tanstack/react-router"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"

export const Route = createFileRoute("/loading")({
  component: LoadingPreviewPage,
})

function LoadingPreviewPage() {
  return (
    <Card>
      <CardHeader className="border-b border-border/70">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-muted ring-1 ring-foreground/10 shadow-sm">
            <CircleNotch weight="bold" className="animate-spin text-primary" />
          </div>
          <div>
            <CardTitle>Loading state preview</CardTitle>
            <CardDescription>
              A future-safe skeleton route for pending docs index or page reads.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="grid gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </CardContent>
    </Card>
  )
}
