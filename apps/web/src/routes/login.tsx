import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import type { AuthError } from "@/lib/auth-client";
import { getBrowserSafeReturnTo, getCurrentReturnToSearch } from "@/lib/return-to";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const returnTo = getCurrentReturnToSearch();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    void (async () => {
      try {
        const form = new FormData(e.currentTarget);
        const { signInEmail } = await import("@/lib/auth-client");
        const result = await signInEmail({
          email: form.get("email") as string,
          password: form.get("password") as string,
        });
        if (result.ok) {
          window.location.href = getBrowserSafeReturnTo(returnTo) ?? "/";
          return;
        }
        setError(getLoginErrorMessage(result.error));
      } catch {
        setError("Could not reach the authentication server. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    })();
  };

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Log in to MyTuums</h1>
          <p className="text-muted-foreground text-sm">
            Enter your email and password to continue.
          </p>
        </div>

        <form
          className="space-y-4"
          onSubmit={handleSubmit}
        >
          {error ? (
            <div
              role="alert"
              className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
            >
              {error}
            </div>
          ) : null}

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="border-input w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
              maxLength={128}
              className="border-input w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-primary text-primary-foreground w-full rounded-md px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Logging in…" : "Log in"}
          </button>
        </form>

        <div className="text-sm text-center space-y-1">
          <Link to="/register" className="text-primary hover:underline">
            Don&apos;t have an account? Register
          </Link>
          <br />
          <Link
            to="/forgot-password"
            className="text-primary hover:underline text-xs"
          >
            Forgot your password?
          </Link>
        </div>
      </div>
    </div>
  );
}

function getLoginErrorMessage(error: AuthError): string {
  switch (error.code) {
    case "EMAIL_NOT_VERIFIED":
      return "Your email address is not verified yet. Please check your inbox and click the verification link before logging in.";
    case "INVALID_EMAIL_OR_PASSWORD":
    case "INVALID_CREDENTIALS":
      return "The email or password you entered is incorrect.";
    case "RATE_LIMITED":
    case "TOO_MANY_REQUESTS":
      return "Too many login attempts. Please wait a moment before trying again.";
    default:
      return error.message || "Login failed. Please check your details and try again.";
  }
}
