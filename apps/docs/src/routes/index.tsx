import { ArrowRight, Article, ShieldCheck } from "@phosphor-icons/react"
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

export const Route = createFileRoute("/")({
  component: DocsHomePage,
})

function DocsHomePage() {
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border/70">
          <CardTitle>Developer documentation</CardTitle>
          <CardDescription>
            Internal docs are available after the API confirms verified active
            admin or owner access.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <Alert>
            <ShieldCheck weight="bold" />
            <AlertTitle>Access verified</AlertTitle>
            <AlertDescription>
              The surrounding docs chrome was rendered only after an authenticated
              docs navigation request succeeded.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex size-10 items-center justify-center rounded-xl bg-muted ring-1 ring-foreground/10 shadow-sm">
            <Article weight="bold" className="text-primary" />
          </div>
          <CardTitle className="pt-2">Open product context</CardTitle>
          <CardDescription>
            The route body stays free of bundled protected content; page reads and
            rendering can build on the authorized shell.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button size="sm" asChild>
            <Link
              to="/docs/$sectionSlug/$pageSlug"
              params={{ sectionSlug: "orientation", pageSlug: "orientation/product-context" }}
            >
              Open MyTuums context
              <ArrowRight weight="bold" />
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
