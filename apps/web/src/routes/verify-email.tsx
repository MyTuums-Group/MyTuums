import { ArrowRight, EnvelopeSimple, SignIn } from "@phosphor-icons/react"
import { createFileRoute, Link } from "@tanstack/react-router"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  buildAuthPathWithReturnTo,
  getCurrentReturnToSearch,
  normalizeOptionalSearchString,
} from "@/lib/return-to"

export const Route = createFileRoute("/verify-email")({
  component: VerifyEmailPage,
})

function VerifyEmailPage() {
  const searchParams = new URLSearchParams(window.location.search)
  const email = normalizeOptionalSearchString(searchParams.get("email"))
  const returnTo = getCurrentReturnToSearch()

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4 py-10 sm:px-6">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader className="gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-foreground/10">
            <EnvelopeSimple weight="bold" className="size-5" />
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-muted-foreground">
              One last step
            </p>
            <CardTitle>
              <h1>Verify your email</h1>
            </CardTitle>
            <CardDescription>
              We sent a verification link{email ? ` to ${email}` : ""}. Open
              that email and click the link to activate your MyTuums account.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          <Alert>
            <AlertTitle>Email verification is required</AlertTitle>
            <AlertDescription>
              You will not be able to log in until your email address is
              verified. If you try to log in before that, MyTuums will ask you
              to verify your email first.
            </AlertDescription>
          </Alert>

          <div className="flex flex-col gap-3 text-sm">
            <p className="font-medium">Didn&apos;t receive it?</p>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-muted-foreground">
              <li>Check your spam or junk folder.</li>
              <li>Make sure you used the correct email address.</li>
              <li>
                Try logging in again to request another verification email.
              </li>
            </ul>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-2 sm:flex-row">
          <Button className="w-full" asChild>
            <a href={buildAuthPathWithReturnTo("/login", returnTo)}>
              <SignIn weight="bold" data-icon="inline-start" />
              Go to login
            </a>
          </Button>
          <Button className="w-full" variant="outline" asChild>
            <Link to="/register">
              Use another email
              <ArrowRight weight="bold" data-icon="inline-end" />
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
