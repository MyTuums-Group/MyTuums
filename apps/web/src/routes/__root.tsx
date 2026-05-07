import { createRootRoute, Outlet, redirect } from "@tanstack/react-router";
import { getSession } from "@/lib/auth-client";

// Public routes that don't require authentication
const PUBLIC_ROUTES = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
]);

export const Route = createRootRoute({
  component: RootLayout,
  beforeLoad: async ({ location }) => {
    // Skip auth check for public routes
    if (PUBLIC_ROUTES.has(location.pathname)) return;

    try {
      const session = await getSession();
      if (!session) {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw redirect({ to: "/login" });
      }
    } catch (err) {
      // If it's a redirect (has `to`), re-throw
      if (typeof err === "object" && err !== null && "to" in err) throw err;
      // Network error — let the page render (don't block on API failure)
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
