import { createRootRoute, Outlet } from "@tanstack/react-router"

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    <div className="min-h-svh">
      {/* Nav, footer, and layout wrappers go here — populated in subsequent issues */}
      <Outlet />
    </div>
  )
}
