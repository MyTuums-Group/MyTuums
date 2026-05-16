import {
  ArrowRight,
  Article,
  BookOpen,
  CheckCircle,
  FileMagnifyingGlass,
  FolderOpen,
  ShieldCheck,
} from "@phosphor-icons/react"
import { createFileRoute, Link } from "@tanstack/react-router"
import type { ReactNode } from "react"
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { DocsBuildMetadataPanel } from "@/components/docs-shell"
import { useDocsReaderArtifact } from "@/lib/docs-reader-artifact-context"

export const Route = createFileRoute("/")({
  component: DocsHomePage,
})

function DocsHomePage() {
  const { homeEntry } = useDocsReaderArtifact()

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row lg:items-stretch">
      <div className="grid min-h-0 min-w-0 flex-1 gap-6 lg:min-h-0 lg:overflow-y-auto">
        <section className="rounded-xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-primary">Developer hub</p>
            <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Build and operate MyTuums with the right context in reach.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Protected product documentation, implementation notes, and diagrams for
              admins and owners working inside the MyTuums system.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link
                to="/docs/$sectionSlug/$pageSlug"
                params={{
                  sectionSlug: homeEntry.sectionId,
                  pageSlug: homeEntry.pageSlug,
                }}
              >
                Open {homeEntry.pageTitle}
                <ArrowRight weight="bold" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <a href="#docs-pathways">
                Browse pathways
                <FolderOpen weight="bold" />
              </a>
            </Button>
          </div>
        </section>

        <Alert>
          <ShieldCheck weight="bold" />
          <AlertTitle>Access verified</AlertTitle>
          <AlertDescription>
            This docs shell renders only after an authenticated navigation request
            confirms active admin or owner access.
          </AlertDescription>
        </Alert>

        <section id="docs-pathways" className="grid gap-4 sm:grid-cols-3">
          <PathwayCard
            icon={<BookOpen weight="bold" />}
            title="Understand the product"
            description="Start with the domain language, product principles, and decisions that shape implementation."
          />
          <PathwayCard
            icon={<FileMagnifyingGlass weight="bold" />}
            title="Find implementation detail"
            description="Use search and section navigation to jump from a product question to the exact protected page."
          />
          <PathwayCard
            icon={<CheckCircle weight="bold" />}
            title="Verify what shipped"
            description="Use build metadata and provenance panels to connect docs reads back to the deployment."
          />
        </section>

        <Card className="overflow-hidden shadow-sm">
          <CardHeader className="border-b border-border/70">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted ring-1 ring-foreground/10 shadow-sm">
                <Article weight="bold" className="text-primary" />
              </div>
              <div>
                <CardTitle>Recommended first read: {homeEntry.pageTitle}</CardTitle>
                <CardDescription>
                  {homeEntry.pageTitle} gives the rest of the docs their vocabulary.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 p-5">
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              Use this as the orientation point before reading architecture notes,
              operational guidance, or diagrams. It keeps implementation work aligned
              with the product language.
            </p>
          </CardContent>
          <CardFooter className="border-t border-border/70 bg-muted/35 p-5">
            <Button size="sm" asChild>
              <Link
                to="/docs/$sectionSlug/$pageSlug"
                params={{
                  sectionSlug: homeEntry.sectionId,
                  pageSlug: homeEntry.pageSlug,
                }}
              >
                Read {homeEntry.pageTitle}
                <ArrowRight weight="bold" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      <aside className="grid w-full shrink-0 gap-4 lg:w-80 lg:min-h-0 lg:overflow-y-auto">
        <DocsBuildMetadataPanel />
      </aside>
    </div>
  )
}

function PathwayCard({
  description,
  icon,
  title,
}: {
  description: string
  icon: ReactNode
  title: string
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-muted ring-1 ring-foreground/10 shadow-sm">
          <span className="text-primary">{icon}</span>
        </div>
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
    </Card>
  )
}
