import { createRootRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { getSession } from "@/lib/auth-client";
import { getApiBase } from "@/lib/trpc";
import { decideRootNavigation, type RootGuardAppUserState } from "./-root-guard";

export const Route = createRootRoute({
  component: RootLayout,
  beforeLoad: async ({ location }) => {
    const session = await getSession();
    const decision = await decideRootNavigation({
      pathname: location.pathname,
      session,
      appUserState: session
        ? async () => {
            try {
              const res = await fetch(`${getApiBase()}/api/app-user-state`, {
                credentials: "include",
              });
              if (!res.ok) return { kind: "unauthenticated" };
              return (await res.json()) as RootGuardAppUserState;
            } catch {
              return { kind: "unauthenticated" };
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
