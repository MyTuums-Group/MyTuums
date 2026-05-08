import { createRootRoute, Outlet, redirect } from "@tanstack/react-router";
import { getSession } from "@/lib/auth-client";
import { getApiBase } from "@/lib/trpc";

// Static public pages are accessible regardless of session state.
const PUBLIC_PATHS = [
  "/terms",
  "/privacy",
  "/cookies",
  "/accessibility",
  "/support",
  "/contact",
  "/about",
];

// Auth pages are guest-only: logged-in users should not see them.
const GUEST_ONLY_PATHS = [
  "/login",
  "/register",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
];

const PUBLIC_SET = new Set(PUBLIC_PATHS);
const GUEST_ONLY_SET = new Set(GUEST_ONLY_PATHS);

export const Route = createRootRoute({
  component: RootLayout,
  beforeLoad: async ({ location }) => {
    if (PUBLIC_SET.has(location.pathname)) return;

    const session = await getSession();

    if (GUEST_ONLY_SET.has(location.pathname)) {
      if (session) {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw redirect({ to: "/" });
      }
      return;
    }

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
