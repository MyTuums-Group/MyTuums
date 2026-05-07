import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
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
          onSubmit={(e) => {
            e.preventDefault();
            void (async () => {
              const form = new FormData(e.currentTarget);
              const { signInEmail } = await import("@/lib/auth-client");
              const res = await signInEmail({
                email: form.get("email") as string,
                password: form.get("password") as string,
              });
              if (res.ok) {
                window.location.href = "/";
              }
            })();
          }}
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
              autoComplete="current-password"
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
            Log in
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
