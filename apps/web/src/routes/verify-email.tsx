import { createFileRoute, Link } from "@tanstack/react-router";
import {
  buildAuthPathWithReturnTo,
  getCurrentReturnToSearch,
  normalizeOptionalSearchString,
} from "@/lib/return-to";

export const Route = createFileRoute("/verify-email")({
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const searchParams = new URLSearchParams(window.location.search);
  const email = normalizeOptionalSearchString(searchParams.get("email"));
  const returnTo = getCurrentReturnToSearch();

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <div className="space-y-2">
          <p className="text-muted-foreground text-sm font-medium">
            One last step
          </p>
          <h1 className="text-2xl font-semibold">Verify your email</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            We sent a verification link{email ? ` to ${email}` : ""}. Open
            that email and click the link to activate your MyTuums account.
          </p>
        </div>

        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          You will not be able to log in until your email address is verified.
          If you try to log in before that, MyTuums will ask you to verify your
          email first.
        </div>

        <div className="space-y-3 text-sm">
          <p className="font-medium">Didn&apos;t receive it?</p>
          <ul className="text-muted-foreground list-disc space-y-1 pl-5">
            <li>Check your spam or junk folder.</li>
            <li>Make sure you used the correct email address.</li>
            <li>Try logging in again to request another verification email.</li>
          </ul>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <a
            href={buildAuthPathWithReturnTo("/login", returnTo)}
            className="bg-primary text-primary-foreground inline-flex flex-1 items-center justify-center rounded-md px-4 py-2 text-sm font-medium"
          >
            Go to login
          </a>
          <Link
            to="/register"
            className="border-input inline-flex flex-1 items-center justify-center rounded-md border px-4 py-2 text-sm font-medium"
          >
            Use another email
          </Link>
        </div>
      </div>
    </div>
  );
}
