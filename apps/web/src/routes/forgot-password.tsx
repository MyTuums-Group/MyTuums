import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void (async () => {
      const form = new FormData(e.currentTarget);
      const { forgetPassword } = await import("@/lib/auth-client");
      await forgetPassword({
        email: form.get("email") as string,
      });
      setSent(true);
    })();
  };

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Reset your password</h1>
          <p className="text-muted-foreground text-sm">
            {sent
              ? "If that email is registered, we've sent a reset link."
              : "Enter your email and we'll send you a reset link."}
          </p>
        </div>

        {!sent && (
          <form
            className="space-y-4"
            onSubmit={handleSubmit}
          >
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
            <button
              type="submit"
              className="bg-primary text-primary-foreground w-full rounded-md px-4 py-2 text-sm font-medium"
            >
              Send reset link
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
