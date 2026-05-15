import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

function RegisterPage() {
  const isPublicSignupEnabled = getPublicSignupEnabled();
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isPublicSignupEnabled) return;
    void (async () => {
      const form = new FormData(e.currentTarget);
      const { signUpEmail } = await import("@/lib/auth-client");
      const email = form.get("email") as string;
      const result = await signUpEmail({
        email,
        password: form.get("password") as string,
        // Better Auth requires a name, but MyTuums profile identity is chosen
        // during onboarding. Do not collect a misleading display name here.
        name: email,
      });
      if (result.ok) {
        window.location.href = `/verify-email?email=${encodeURIComponent(email)}`;
      }
    })();
  };

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">
            {isPublicSignupEnabled ? "Create your account" : "Signup is not open yet"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isPublicSignupEnabled
              ? "Join the gaming community."
              : "MyTuums is completing legal, staff, support, email, monitoring, and deployment readiness before public signup opens."}
          </p>
        </div>

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
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
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
            <p className="text-muted-foreground text-xs">
              At least 8 characters. No special requirements.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <input
              id="ageConfirm"
              name="ageConfirm"
              type="checkbox"
              required
              className="mt-1"
            />
            <label htmlFor="ageConfirm" className="text-xs leading-tight">
              I confirm that I am at least 13 years old.
            </label>
          </div>
          <button
            type="submit"
            disabled={!isPublicSignupEnabled}
            className="bg-primary text-primary-foreground w-full rounded-md px-4 py-2 text-sm font-medium"
          >
            {isPublicSignupEnabled ? "Create account" : "Signup disabled"}
          </button>
        </form>

        <div className="text-sm text-center">
          <Link to="/login" className="text-primary hover:underline">
            Already have an account? Log in
          </Link>
        </div>
      </div>
    </div>
  );
}

function getPublicSignupEnabled() {
  try {
    const env = (import.meta as unknown as {
      env: { VITE_PUBLIC_SIGNUP_ENABLED?: string };
    }).env;
    return env?.VITE_PUBLIC_SIGNUP_ENABLED === "true";
  } catch {
    return false;
  }
}
