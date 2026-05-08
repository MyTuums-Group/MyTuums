import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

function RegisterPage() {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Create your account</h1>
          <p className="text-muted-foreground text-sm">
            Join the gaming community.
          </p>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void (async () => {
              const form = new FormData(e.currentTarget);
              const { signUpEmail } = await import("@/lib/auth-client");
              const email = form.get("email") as string;
              const result = await signUpEmail({
                email,
                password: form.get("password") as string,
                name: form.get("name") as string,
              });
              if (result.ok) {
                window.location.href = `/verify-email?email=${encodeURIComponent(email)}`;
              }
            })();
          }}
        >
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Display name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              className="border-input w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
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
            className="bg-primary text-primary-foreground w-full rounded-md px-4 py-2 text-sm font-medium"
          >
            Create account
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
