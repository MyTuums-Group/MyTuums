import { createRootRoute, Outlet } from "@tanstack/react-router"
import { DocsShell } from "@/components/docs-shell"

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    <DocsShell>
      <Outlet />
    </DocsShell>
  )
}
