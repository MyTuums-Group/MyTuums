import { ShieldWarning } from "@phosphor-icons/react"
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

export const Route = createFileRoute("/unavailable")({
  component: UnavailablePreviewPage,
})

function UnavailablePreviewPage() {
  return (
    <Card>
      <CardHeader className="border-b border-border/70">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-muted ring-1 ring-foreground/10 shadow-sm">
            <ShieldWarning weight="fill" className="text-primary" />
          </div>
          <div>
            <CardTitle>Unavailable state preview</CardTitle>
            <CardDescription>
              A dedicated fallback surface for temporarily unavailable docs
              infrastructure.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        <Alert>
          <ShieldWarning weight="bold" />
          <AlertTitle>Documentation is not available yet</AlertTitle>
          <AlertDescription>
            If the API cannot provide authorized docs navigation, the root route
            keeps protected documentation hidden and shows a guarded fallback.
          </AlertDescription>
        </Alert>
      </CardContent>

      <CardFooter>
        <Button variant="outline" size="sm" asChild>
          <Link to="/">Return to shell overview</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
