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

export const Route = createRootRoute({
  component: RootLayout,
  beforeLoad: async ({ location }) => {
    if (PUBLIC_SET.has(location.pathname)) return;

    const session = await getSession();
    if (!session) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: "/login" });
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
