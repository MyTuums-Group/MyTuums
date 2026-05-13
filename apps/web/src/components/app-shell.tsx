import {
  Bell,
  Compass,
  Desktop,
  Gear,
  House,
  List,
  MagnifyingGlass,
  Moon,
  SignOut,
  Sun,
  User,
} from "@phosphor-icons/react"
import { Link, useLocation } from "@tanstack/react-router"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet"
import { cn } from "@workspace/ui/lib/utils"
import { useState, type ReactNode } from "react"
import type { Theme } from "@/components/theme-provider"
import { useTheme } from "@/components/theme-provider"
import { getApiBase, trpc } from "@/lib/trpc"

const PRIMARY_NAV_ITEMS = [
  {
    href: "/",
    label: "Home",
    icon: House,
    exact: true,
    kind: "route" as const,
  },
  {
    href: "/discover",
    label: "Discover",
    icon: Compass,
    kind: "planned" as const,
  },
]

const MOBILE_NAV_ITEMS = [
  ...PRIMARY_NAV_ITEMS,
  {
    href: "/notifications",
    label: "Notifications",
    icon: Bell,
    kind: "planned" as const,
  },
]

const FOOTER_SECTIONS = [
  {
    title: "Explore",
    links: [
      { href: "/discover", label: "Discover" },
      { href: "/notifications", label: "Notifications" },
      { href: "/settings", label: "Settings" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/about", label: "About" },
      { href: "/support", label: "Support" },
      { href: "/contact", label: "Contact" },
      { href: "/accessibility", label: "Accessibility" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/cookies", label: "Cookies" },
      { href: "/legal-notice", label: "Legal notice" },
    ],
  },
]

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <AppHeader />
      <main className="flex-1">{children}</main>
      <AppFooter />
    </div>
  )
}

function AppHeader() {
  const pathname = useLocation({ select: (location) => location.pathname })
  const { theme, setTheme } = useTheme()
  const currentAppUser = trpc.currentAppUser.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  })
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const appUserState = currentAppUser.data
  const isLoggedIn = !!appUserState && appUserState.kind !== "unauthenticated"
  const user =
    appUserState && "user" in appUserState ? appUserState.user : undefined
  const profile =
    appUserState?.kind === "active_onboarded_profile"
      ? appUserState.profile
      : undefined

  const username = profile?.username
  const displayName =
    profile?.displayName ?? user?.name ?? user?.email ?? username ?? "Player"
  const avatarUrl = user?.image ?? undefined

  const handleLogout = async () => {
    if (isLoggingOut) return

    try {
      setIsLoggingOut(true)
      await fetch(`${getApiBase()}/api/auth/sign-out`, {
        method: "POST",
        credentials: "include",
      })
      window.location.href = "/login"
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/88">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:gap-4 sm:px-6">
        <Link
          to="/"
          aria-label="MyTuums home"
          className="flex min-w-0 items-center gap-3 rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted shadow-sm ring-1 ring-foreground/10">
            <img
              src="/favicon.svg"
              alt=""
              className="size-6"
              aria-hidden="true"
            />
          </span>
          <span className="hidden min-w-0 flex-col sm:flex">
            <span className="font-heading text-sm font-semibold tracking-tight sm:text-base">
              MyTuums
            </span>
            <span className="text-xs text-muted-foreground">
              Focused gaming posts, profiles, and discovery.
            </span>
          </span>
        </Link>

        {isLoggedIn ? (
          <nav
            aria-label="Primary navigation"
            className="ml-2 hidden items-center gap-1 lg:flex"
          >
            {PRIMARY_NAV_ITEMS.map((item) => (
              <PrimaryNavLink
                key={item.href}
                href={item.href}
                icon={item.icon}
                exact={item.exact}
                isActive={isNavActive(pathname, item.href, item.exact)}
                kind={item.kind}
              >
                {item.label}
              </PrimaryNavLink>
            ))}
          </nav>
        ) : (
          <p className="ml-2 hidden text-sm text-muted-foreground xl:block">
            A lighter social space for gaming conversation.
          </p>
        )}

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <ThemeMenu theme={theme} setTheme={setTheme} />

          {currentAppUser.isLoading ? (
            <HeaderLoadingState />
          ) : isLoggedIn ? (
            <>
              <SearchEntry />
              <NotificationEntry pathname={pathname} />
              <UserMenu
                avatarUrl={avatarUrl}
                displayName={displayName}
                isLoggingOut={isLoggingOut}
                onLogout={handleLogout}
                username={username}
              />
              <MobileMenu
                displayName={displayName}
                isLoggingOut={isLoggingOut}
                onLogout={handleLogout}
                pathname={pathname}
                username={username}
              />
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Log in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/register">Join MyTuums</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

function AppFooter() {
  return (
    <footer className="border-t border-border/70 bg-muted/35">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-md">
            <Link
              to="/"
              className="inline-flex items-center gap-3 rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-background shadow-sm ring-1 ring-foreground/10">
                <img
                  src="/favicon.svg"
                  alt=""
                  className="size-6"
                  aria-hidden="true"
                />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="font-heading text-base font-semibold tracking-tight">
                  MyTuums
                </span>
                <span className="text-xs text-muted-foreground">
                  Handle-first social tools for gamers
                </span>
              </span>
            </Link>

            <p className="mt-4 max-w-[34rem] text-sm leading-6 text-muted-foreground">
              MyTuums keeps gaming conversation readable: quick posts, clear
              identity, lightweight discovery, and room for the next ways people
              will explore and manage their space.
            </p>
          </div>

          <nav
            aria-label="Footer navigation"
            className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3"
          >
            {FOOTER_SECTIONS.map((section) => (
              <div key={section.title} className="min-w-40">
                <p className="mb-3 text-xs font-semibold tracking-[0.16em] text-foreground uppercase">
                  {section.title}
                </p>
                <ul className="space-y-1.5">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <FooterLink href={link.href}>{link.label}</FooterLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-2 border-t border-border/70 pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {new Date().getFullYear()} MyTuums. Built for focused gaming
            conversation.
          </p>
          <p>Theme follows your preference, or press D to toggle quickly.</p>
        </div>
      </div>
    </footer>
  )
}

function HeaderLoadingState() {
  return (
    <div className="flex items-center gap-2">
      <Skeleton className="hidden h-9 w-44 rounded-lg lg:block" />
      <Skeleton className="size-9 rounded-full" />
      <Skeleton className="size-9 rounded-full" />
      <Skeleton className="size-9 rounded-full" />
    </div>
  )
}

function SearchEntry() {
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="hidden min-w-52 justify-start gap-2 text-muted-foreground lg:inline-flex"
        asChild
      >
        <a href="/discover">
          <MagnifyingGlass weight="bold" />
          Search players and games
        </a>
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="size-11 text-muted-foreground hover:text-foreground sm:size-9 lg:hidden"
        asChild
      >
        <a href="/discover" aria-label="Open search and discovery">
          <MagnifyingGlass weight="bold" />
        </a>
      </Button>
    </>
  )
}

function NotificationEntry({ pathname }: { pathname: string }) {
  const active = isNavActive(pathname, "/notifications")

  return (
    <Button
      variant="ghost"
      size="icon"
      asChild
      className={cn(
        "relative size-11 sm:size-9",
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      <a href="/notifications" aria-label="Open notifications">
        <Bell weight="bold" />
        <span className="absolute top-2 right-2 size-2 rounded-full bg-primary ring-2 ring-background sm:top-1.5 sm:right-1.5" />
      </a>
    </Button>
  )
}

function UserMenu({
  avatarUrl,
  displayName,
  isLoggingOut,
  onLogout,
  username,
}: {
  avatarUrl?: string
  displayName: string
  isLoggingOut: boolean
  onLogout: () => Promise<void>
  username?: string
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative size-11 rounded-full p-0 sm:size-9"
        >
          <Avatar size="sm">
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="px-2 py-2">
          <div className="flex items-center gap-2">
            <Avatar size="sm">
              <AvatarImage src={avatarUrl} alt={displayName} />
              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {displayName}
              </p>
              {username ? (
                <p className="truncate text-xs font-normal text-muted-foreground">
                  @{username}
                </p>
              ) : null}
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {username ? (
          <DropdownMenuItem asChild>
            <Link to="/@{$username}" params={{ username }}>
              <User weight="bold" />
              Profile
            </Link>
          </DropdownMenuItem>
        ) : null}

        <DropdownMenuItem asChild>
          <a href="/notifications">
            <Bell weight="bold" />
            Notifications
          </a>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <a href="/settings">
            <Gear weight="bold" />
            Settings
          </a>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          variant="destructive"
          disabled={isLoggingOut}
          onClick={() => {
            void onLogout()
          }}
        >
          <SignOut weight="bold" />
          {isLoggingOut ? "Logging out..." : "Log out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function MobileMenu({
  displayName,
  isLoggingOut,
  onLogout,
  pathname,
  username,
}: {
  displayName: string
  isLoggingOut: boolean
  onLogout: () => Promise<void>
  pathname: string
  username?: string
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-11 text-muted-foreground hover:text-foreground md:hidden"
        >
          <List weight="bold" />
          <span className="sr-only">Open navigation menu</span>
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-80 gap-0 sm:w-96">
        <SheetHeader className="border-b border-border/70 pb-4">
          <SheetTitle>Navigate MyTuums</SheetTitle>
          <p className="text-sm text-muted-foreground">
            Keep your next destination close, from home and discovery to profile
            and account pages.
          </p>
        </SheetHeader>

        <div className="flex flex-1 flex-col px-4 pb-6">
          <nav
            aria-label="Mobile navigation"
            className="mt-4 flex flex-col gap-1"
          >
            {MOBILE_NAV_ITEMS.map((item) => (
              <MobileNavAnchor
                key={item.href}
                href={item.href}
                icon={item.icon}
                isActive={isNavActive(pathname, item.href, item.exact)}
              >
                {item.label}
              </MobileNavAnchor>
            ))}

            {username ? (
              <MobileNavRouteLink to="/@{$username}" params={{ username }}>
                <User weight="bold" />
                Profile
              </MobileNavRouteLink>
            ) : null}

            <MobileNavAnchor
              href="/settings"
              icon={Gear}
              isActive={isNavActive(pathname, "/settings")}
            >
              Settings
            </MobileNavAnchor>
          </nav>

          <div className="mt-auto border-t border-border/70 pt-4">
            <p className="truncate text-sm font-medium text-foreground">
              {displayName}
            </p>
            {username ? (
              <p className="truncate text-xs text-muted-foreground">
                @{username}
              </p>
            ) : null}

            <Button
              variant="ghost"
              className="mt-4 w-full justify-start text-destructive hover:bg-destructive/10"
              disabled={isLoggingOut}
              onClick={() => {
                void onLogout()
              }}
            >
              <SignOut weight="bold" />
              {isLoggingOut ? "Logging out..." : "Log out"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function ThemeMenu({
  theme,
  setTheme,
}: {
  theme: Theme
  setTheme: (theme: Theme) => void
}) {
  const ThemeIcon = getThemeIcon(theme)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-11 text-muted-foreground hover:text-foreground sm:size-9"
        >
          <ThemeIcon weight="bold" />
          <span className="sr-only">Change theme</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(value) => setTheme(value as Theme)}
        >
          <DropdownMenuRadioItem value="system">
            <Desktop weight="bold" />
            System
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="light">
            <Sun weight="bold" />
            Light
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon weight="bold" />
            Dark
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function PrimaryNavLink({
  children,
  exact,
  href,
  icon: Icon,
  isActive,
  kind,
}: {
  children: ReactNode
  exact?: boolean
  href: string
  icon: typeof House
  isActive: boolean
  kind: "planned" | "route"
}) {
  const className = cn(
    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
    isActive
      ? "bg-muted text-foreground"
      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
  )

  if (kind === "route") {
    return (
      <Link
        to="/"
        activeOptions={{ exact: exact ?? false }}
        className={className}
      >
        <Icon weight="bold" />
        {children}
      </Link>
    )
  }

  return (
    <a
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={className}
    >
      <Icon weight="bold" />
      {children}
    </a>
  )
}

function MobileNavAnchor({
  children,
  href,
  icon: Icon,
  isActive,
}: {
  children: ReactNode
  href: string
  icon: typeof House
  isActive: boolean
}) {
  return (
    <SheetClose asChild>
      <a
        href={href}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          isActive
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
        )}
      >
        <Icon weight="bold" />
        {children}
      </a>
    </SheetClose>
  )
}

function MobileNavRouteLink({
  children,
  params,
  to,
}: {
  children: ReactNode
  params: { username: string }
  to: "/@{$username}"
}) {
  return (
    <SheetClose asChild>
      <Link
        to={to}
        params={params}
        className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
      >
        {children}
      </Link>
    </SheetClose>
  )
}

function FooterLink({ children, href }: { children: ReactNode; href: string }) {
  return (
    <a
      href={href}
      className="inline-flex min-h-10 items-center rounded-md py-1 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      {children}
    </a>
  )
}

function getInitials(name: string) {
  if (!name) return "?"

  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0] ? parts[0].slice(0, 2).toUpperCase() : "?"
  }

  const first = parts[0]?.[0]
  const last = parts[parts.length - 1]?.[0]
  return (first && last ? first + last : (first ?? "?")).toUpperCase()
}

function getThemeIcon(theme: Theme) {
  if (theme === "light") return Sun
  if (theme === "dark") return Moon
  return Desktop
}

function isNavActive(pathname: string, href: string, exact = false) {
  if (exact) {
    return pathname === href
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}
