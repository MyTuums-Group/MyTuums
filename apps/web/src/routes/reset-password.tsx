import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  validateSearch: (search: Record<string, string>) => ({
    token: search.token ?? "",
  }),
});

function ResetPasswordPage() {
  const { token } = Route.useSearch();
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-4 text-center">
          <h1 className="text-2xl font-semibold">Invalid reset link</h1>
          <p className="text-muted-foreground text-sm">
            This password reset link is missing a token. Please request a new
            one.
          </p>
          <Link
            to="/forgot-password"
            className="text-primary hover:underline text-sm"
          >
            Request a new reset link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Set a new password</h1>
          <p className="text-muted-foreground text-sm">
            {done
              ? "Password reset successfully. You can now log in."
              : "Choose a new password for your account."}
          </p>
        </div>

        {!done && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void (async () => {
                const form = new FormData(e.currentTarget);
                const { resetPassword } = await import("@/lib/auth-client");
                const res = await resetPassword({
                  token,
                  newPassword: form.get("password") as string,
                });
                if (res.ok) setDone(true);
              })();
            }}
          >
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                New password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={128}
                className="border-input w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              className="bg-primary text-primary-foreground w-full rounded-md px-4 py-2 text-sm font-medium"
            >
              Reset password
            </button>
          </form>
        )}

        <div className="text-sm text-center">
          <Link to="/login" className="text-primary hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
