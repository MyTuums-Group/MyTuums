import { ArrowRight, Article, CircleNotch, Warning } from "@phosphor-icons/react"
import { createFileRoute, Link } from "@tanstack/react-router"
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
import type { ReactNode } from "react"

export const Route = createFileRoute("/")({
  component: DocsHomePage,
})

function DocsHomePage() {
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border/70">
          <CardTitle>Developer documentation shell</CardTitle>
          <CardDescription>
            This is the first deployable slice of the separate docs app. It carries
            MyTuums visual identity, route scaffolding, and build metadata while
            intentionally bundling no protected Markdown, navigation manifests,
            search indexes, or diagram snapshots.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <Alert>
            <Article weight="bold" />
            <AlertTitle>Static shell only</AlertTitle>
            <AlertDescription>
              Later documentation issues will connect this shell to authenticated
              API reads, Markdown rendering, and search. Until then, every route is
              presentation scaffolding.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <PreviewCard
          title="Docs page route"
          description="A generic dynamic route for the future docs reader path shape."
          kind="docs"
          icon={<Article weight="bold" className="text-primary" />}
          cta="Open route preview"
        />
        <PreviewCard
          title="Loading preview"
          description="A dedicated skeleton screen for future pending docs fetch states."
          kind="loading"
          icon={<CircleNotch weight="bold" className="text-primary" />}
          cta="Open loading state"
        />
        <PreviewCard
          title="Unavailable preview"
          description="A separate unavailable state for API, auth, or deployment gaps."
          kind="unavailable"
          icon={<Warning weight="bold" className="text-primary" />}
          cta="Open unavailable state"
        />
      </div>
    </div>
  )
}

function PreviewCard({
  cta,
  description,
  icon,
  kind,
  title,
}: {
  cta: string
  description: string
  kind: "docs" | "loading" | "unavailable"
  icon: ReactNode
  title: string
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex size-10 items-center justify-center rounded-xl bg-muted ring-1 ring-foreground/10 shadow-sm">
          {icon}
        </div>
        <CardTitle className="pt-2">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardFooter>
        <Button size="sm" asChild>
          {kind === "docs" ? (
            <Link
              to="/docs/$sectionSlug/$pageSlug"
              params={{ sectionSlug: "platform", pageSlug: "overview" }}
            >
              {cta}
              <ArrowRight weight="bold" />
            </Link>
          ) : kind === "loading" ? (
            <Link to="/loading">
              {cta}
              <ArrowRight weight="bold" />
            </Link>
          ) : (
            <Link to="/unavailable">
              {cta}
              <ArrowRight weight="bold" />
            </Link>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
