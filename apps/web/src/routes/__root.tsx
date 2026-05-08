import { createRootRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { getSession } from "@/lib/auth-client";
import { getApiBase } from "@/lib/trpc";
import { decideRootNavigation } from "./-root-guard";

export const Route = createRootRoute({
  component: RootLayout,
  beforeLoad: async ({ location }) => {
    const session = await getSession();
    const decision = await decideRootNavigation({
      pathname: location.pathname,
      session,
      hasProfile: session
        ? async () => {
            try {
              const res = await fetch(`${getApiBase()}/api/profile/exists`, {
                credentials: "include",
              });
              if (!res.ok) return false;
              const data = (await res.json()) as { hasProfile: boolean };
              return data.hasProfile;
            } catch {
              return false;
            }
          }
        : null,
    });

    if (decision.kind === "redirect") {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: decision.to });
    }
  },
});

function RootLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
