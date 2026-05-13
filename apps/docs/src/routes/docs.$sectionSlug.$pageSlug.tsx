import { Article, Lock, Sparkle } from "@phosphor-icons/react"
import { createFileRoute } from "@tanstack/react-router"
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

export const Route = createFileRoute("/docs/$sectionSlug/$pageSlug")({
  component: DocsPagePreview,
})

function DocsPagePreview() {
  const { pageSlug, sectionSlug } = Route.useParams()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b border-border/70">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-muted ring-1 ring-foreground/10 shadow-sm">
              <Article weight="fill" className="text-primary" />
            </div>
            <div>
              <CardTitle>Docs page route preview</CardTitle>
              <CardDescription>
                Placeholder reader chrome for <code>{sectionSlug}</code> /{" "}
                <code>{pageSlug}</code>.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          <Alert>
            <Lock weight="bold" />
            <AlertTitle>No protected content in this bundle</AlertTitle>
            <AlertDescription>
              This route intentionally renders shell-only structure. Actual docs
              navigation, page titles, Markdown bodies, search metadata, and
              diagrams will be fetched later through authenticated API reads.
            </AlertDescription>
          </Alert>

          <Card size="sm" className="bg-muted/35 ring-border/70">
            <CardHeader>
              <CardTitle>Future reader frame</CardTitle>
              <CardDescription>
                The eventual reader will replace this placeholder area with
                authorized page content and page-specific metadata.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                Requested path: <code>/docs/{sectionSlug}/{pageSlug}</code>
              </p>
              <p>
                Expected source of truth: generated docs artifact served through
                authenticated API reads.
              </p>
              <p>
                Current slice: route scaffolding, deployment wiring, shared visual
                identity, and preview states only.
              </p>
            </CardContent>
          </Card>

          <Alert>
            <Sparkle weight="bold" />
            <AlertTitle>Ready for follow-on docs issues</AlertTitle>
            <AlertDescription>
              This route is positioned for auth/access states, authorized page
              reads, safe Markdown rendering, generated search, and read-only
              diagram embeds without requiring a new app-shell rewrite.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}
