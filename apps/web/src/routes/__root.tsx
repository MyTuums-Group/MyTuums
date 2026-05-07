import { createRootRoute, Outlet, redirect } from "@tanstack/react-router";
import { getSession } from "@/lib/auth-client";

// Routes that do NOT require authentication.
// Everything else defaults to auth-required — new static pages
// like /terms, /privacy won't silently bypass auth.
const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/terms",
  "/privacy",
  "/cookies",
  "/accessibility",
  "/support",
  "/contact",
  "/about",
];

const PUBLIC_SET = new Set(PUBLIC_PATHS);

function getApiBase() {
  try {
    const env = (import.meta as unknown as { env: { VITE_API_URL?: string } }).env;
    if (env?.VITE_API_URL) return env.VITE_API_URL;
  } catch {
    // import.meta not available (SSR or non-Vite)
  }
  return "http://localhost:4000";
}

export const Route = createRootRoute({
  component: RootLayout,
  beforeLoad: async ({ location }) => {
    // Public pages — no auth required
    if (PUBLIC_SET.has(location.pathname)) return;

    const session = await getSession();
    if (!session) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: "/login" });
    }

    // Authenticated but no profile? Redirect to onboarding.
    // Skip this check when already on onboarding (prevents redirect loop).
    if (location.pathname !== "/onboarding") {
      try {
        const res = await fetch(`${getApiBase()}/api/profile/exists`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = (await res.json()) as { hasProfile: boolean };
          if (!data.hasProfile) {
            // eslint-disable-next-line @typescript-eslint/only-throw-error
            throw redirect({ to: "/onboarding" });
          }
        }
      } catch (err) {
        // If err is a TanStack redirect, re-throw it
        if (err !== null && typeof err === "object" && "to" in err) throw err;
        // Otherwise (network error, API down), allow through to avoid lockout
      }
    }
  },
});

function RootLayout() {
  return (
    <div className="min-h-svh">
      <Outlet />
    </div>
  );
}
