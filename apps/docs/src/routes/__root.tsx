import { ArrowSquareOut, ShieldSlash, Warning } from "@phosphor-icons/react"
import { createRootRoute, Outlet, redirect } from "@tanstack/react-router"
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
import { DocsShell } from "@/components/docs-shell"
import {
  getCurrentDocsReturnUrl,
  resolveDocsAccess,
  type DocsAccessDeniedReason,
  type DocsAppUserState,
} from "@/lib/docs-access"
import { createTrpcClient, getWebAppBase, type DocsReaderBootstrap } from "@/lib/trpc"

const docsClient = createTrpcClient()

export const Route = createRootRoute({
  beforeLoad: async () => {
    const docsAccess = await resolveDocsAccess<DocsReaderBootstrap>({
      loadAppUserState: async () =>
        (await docsClient.currentAppUser.query()) as DocsAppUserState,
      loadReaderBootstrap: () => docsClient.docs.navigation.query(),
      returnUrl: getCurrentDocsReturnUrl(),
      webAppBaseUrl: getWebAppBase(),
    })

    if (docsAccess.kind === "redirect") {
      redirectToMainApp(docsAccess.href)
    }

    return { docsAccess }
  },
  component: RootLayout,
})

function RootLayout() {
  const { docsAccess } = Route.useRouteContext()

  if (docsAccess.kind === "denied") {
    return <DocsAccessDenied reason={docsAccess.reason} />
  }

  if (docsAccess.kind !== "authorized") {
    return null
  }

  return (
    <DocsShell
      navigation={docsAccess.bootstrap.sections}
      readerArtifact={{
        homeEntry: docsAccess.bootstrap.homeEntry,
        contentBuild: docsAccess.bootstrap.contentBuild,
      }}
    >
      <Outlet />
    </DocsShell>
  )
}

function redirectToMainApp(href: string): never {
  window.location.replace(href)
  // eslint-disable-next-line @typescript-eslint/only-throw-error
  throw redirect({ to: "/loading" })
}

function DocsAccessDenied({ reason }: { reason: DocsAccessDeniedReason }) {
  const content = getDeniedContent(reason)

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4 text-foreground sm:p-6">
      <Card className="w-full max-w-lg shadow-sm">
        <CardHeader className="border-b border-border/70">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted ring-1 ring-foreground/10 shadow-sm">
              {reason === "service_unavailable" ? (
                <Warning weight="bold" className="text-primary" />
              ) : (
                <ShieldSlash weight="fill" className="text-primary" />
              )}
            </div>
            <div className="min-w-0">
              <CardTitle>{content.title}</CardTitle>
              <CardDescription>{content.description}</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          <Alert variant={reason === "service_unavailable" ? "default" : "destructive"}>
            {reason === "service_unavailable" ? (
              <Warning weight="bold" />
            ) : (
              <ShieldSlash weight="bold" />
            )}
            <AlertTitle>{content.alertTitle}</AlertTitle>
            <AlertDescription>{content.alertDescription}</AlertDescription>
          </Alert>
        </CardContent>

        <CardFooter className="justify-between gap-3">
          <p className="text-sm text-muted-foreground">No docs navigation was loaded.</p>
          <Button variant="outline" size="sm" asChild>
            <a href={getWebAppBase()}>
              <ArrowSquareOut weight="bold" />
              Main app
            </a>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

function getDeniedContent(reason: DocsAccessDeniedReason) {
  switch (reason) {
    case "inactive_account":
      return {
        title: "Documentation unavailable",
        description: "This account state cannot access internal documentation.",
        alertTitle: "Active account required",
        alertDescription:
          "Suspended and account-deleted accounts cannot load docs navigation, search, or document content.",
      }
    case "forbidden_role":
      return {
        title: "Access denied",
        description: "Developer documentation is limited to verified admins and owners.",
        alertTitle: "Docs access is restricted",
        alertDescription:
          "Your account is active, but it does not have the admin or owner access required for this internal docs app.",
      }
    case "service_unavailable":
      return {
        title: "Documentation unavailable",
        description: "The docs authorization check could not finish.",
        alertTitle: "Try again shortly",
        alertDescription:
          "The app did not receive docs navigation from the API, so protected documentation stayed hidden.",
      }
  }
}
