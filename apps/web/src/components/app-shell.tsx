import {
  ArrowRight,
  Bell,
  CircleNotch,
  Compass,
  Desktop,
  Gear,
  GameController,
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
import { Input } from "@workspace/ui/components/input"
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
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react"
import {
  getDiscoverSearchHref,
  groupNavSearchResults,
  shouldStartNavSearch,
  type GameSearchResult,
  type NavSearchResult,
  type UserSearchResult,
} from "@/components/app-shell-search"
import type { Theme } from "@/components/theme-provider"
import { useTheme } from "@/components/theme-provider"
import {
  getSearchTypeaheadStatus,
  useSearchTypeaheadInteraction,
  type SearchTypeaheadResultProps,
  type SearchTypeaheadStatus,
} from "@/lib/search-typeahead"
import { getApiBase, trpc } from "@/lib/trpc"
import { FOOTER_STATIC_LINKS } from "@/routes/-static-pages"

type PrimaryNavItem = {
  href: "/" | "/discover"
  label: string
  icon: typeof House
  exact?: boolean
  kind: "route"
}

type MobileNavItem = {
  href: string
  label: string
  icon: typeof House
  exact?: boolean
  kind: "planned" | "route"
}

const PRIMARY_NAV_ITEMS: PrimaryNavItem[] = [
  {
    href: "/",
    label: "Home",
    icon: House,
    exact: true,
    kind: "route",
  },
  {
    href: "/discover",
    label: "Discover",
    icon: Compass,
    kind: "route",
  },
]

const MOBILE_NAV_ITEMS: MobileNavItem[] = [
  ...PRIMARY_NAV_ITEMS,
  {
    href: "/notifications",
    label: "Notifications",
    icon: Bell,
    kind: "route",
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
    links: FOOTER_STATIC_LINKS.filter((link) =>
      ["/about", "/support", "/contact", "/accessibility"].includes(link.href)
    ),
  },
  {
    title: "Legal",
    links: FOOTER_STATIC_LINKS.filter((link) =>
      ["/terms", "/privacy", "/cookies", "/legal-notice"].includes(link.href)
    ),
  },
]

const NAV_SEARCH_RESULT_LIMIT = 20
const NAV_SEARCH_DEBOUNCE_MS = 200
const NAV_SEARCH_LOADING_DELAY_MS = 150

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <AppHeader />
      <main className="flex-1 bg-muted/15">{children}</main>
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
  const avatarUrl = profile?.avatarUrl ?? user?.image ?? undefined

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
    <footer className="border-t border-border/70 bg-background">
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
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState("")
  const trimmedQuery = query.trim()
  const debouncedQuery = useDebouncedValue(trimmedQuery, NAV_SEARCH_DEBOUNCE_MS)
  const canSearch = shouldStartNavSearch(trimmedQuery)
  const hasCurrentQueryData = canSearch && debouncedQuery === trimmedQuery
  const isDebouncing = canSearch && debouncedQuery !== trimmedQuery
  const searchQuery = trpc.search.useQuery(
    { query: debouncedQuery, limit: NAV_SEARCH_RESULT_LIMIT },
    {
      enabled: shouldStartNavSearch(debouncedQuery),
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 10_000,
    }
  )
  const groupedResults = useMemo(
    () =>
      groupNavSearchResults(hasCurrentQueryData ? searchQuery.data : undefined),
    [hasCurrentQueryData, searchQuery.data]
  )
  const selectableResults = useMemo(
    () => [...groupedResults.users, ...groupedResults.games],
    [groupedResults.games, groupedResults.users]
  )
  const showLoading = useDelayedFlag(
    hasCurrentQueryData && searchQuery.isFetching,
    NAV_SEARCH_LOADING_DELAY_MS
  )
  const errorMessage = hasCurrentQueryData
    ? (searchQuery.error?.message ?? null)
    : null
  const typeaheadStatus = getSearchTypeaheadStatus({
    errorMessage,
    isLoading: isDebouncing || showLoading,
    query: trimmedQuery,
    resultCount: selectableResults.length,
  })
  const typeahead = useSearchTypeaheadInteraction<NavSearchResult>({
    blurOnClosedEscape: true,
    enterSelection: "highlighted",
    getItem: (index) => selectableResults[index],
    itemCount: selectableResults.length,
    listboxId: "nav-search-results",
    onSelect: (item) => {
      window.location.href = item.href
    },
    resetKey: `${trimmedQuery}:${selectableResults
      .map((item) => `${item.type}:${item.id}`)
      .join("|")}`,
    resultIdPrefix: "nav-search-result",
    status: typeaheadStatus,
  })
  const openTypeahead = typeahead.open

  useEffect(() => {
    function handleGlobalSearchShortcut(event: globalThis.KeyboardEvent) {
      if (event.key !== "/" || event.altKey || event.ctrlKey || event.metaKey) {
        return
      }
      if (isEditableTarget(event.target)) return

      event.preventDefault()
      inputRef.current?.focus()
      openTypeahead()
    }

    window.addEventListener("keydown", handleGlobalSearchShortcut)
    return () => {
      window.removeEventListener("keydown", handleGlobalSearchShortcut)
    }
  }, [openTypeahead])

  function navigateToDiscover(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    window.location.href = getDiscoverSearchHref(trimmedQuery)
  }

  const showPanel = typeahead.isOpen && query.length > 0

  return (
    <>
      <form
        role="search"
        className="relative hidden w-64 lg:block xl:w-80"
        onSubmit={navigateToDiscover}
        onFocus={typeahead.open}
        onBlur={typeahead.handleBlurWithin}
      >
        <MagnifyingGlass
          weight="bold"
          className="pointer-events-none absolute top-1/2 left-2.5 z-10 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          ref={inputRef}
          value={query}
          type="search"
          className="h-9 rounded-xl pr-3 pl-8"
          placeholder="Search players and games"
          aria-label="Search players and games"
          {...typeahead.getInputA11yProps(showPanel)}
          autoComplete="off"
          onChange={(event) => {
            setQuery(event.target.value)
            typeahead.open()
          }}
          onKeyDown={typeahead.handleInputKeyDown}
        />

        {showPanel ? (
          <div
            id="nav-search-results"
            role="listbox"
            className="absolute top-full right-0 z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/10"
          >
            <NavSearchPanel
              errorMessage={errorMessage}
              games={groupedResults.games}
              getResultProps={typeahead.getResultProps}
              highlightedIndex={typeahead.highlightedIndex}
              query={trimmedQuery}
              status={typeaheadStatus}
              users={groupedResults.users}
            />
          </div>
        ) : null}
      </form>

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

function NavSearchPanel({
  errorMessage,
  games,
  getResultProps,
  highlightedIndex,
  query,
  status,
  users,
}: {
  errorMessage: string | null
  games: GameSearchResult[]
  getResultProps: (index: number) => SearchTypeaheadResultProps
  highlightedIndex: number
  query: string
  status: SearchTypeaheadStatus
  users: UserSearchResult[]
}) {
  if (status === "empty" || status === "too_short") {
    return <NavSearchState>Keep typing...</NavSearchState>
  }

  if (status === "error") {
    return (
      <NavSearchState tone="error">
        {errorMessage ?? "Search failed."}
      </NavSearchState>
    )
  }

  if (status === "loading") {
    return (
      <NavSearchState>
        <CircleNotch weight="bold" className="animate-spin" />
        Searching...
      </NavSearchState>
    )
  }

  if (status === "no_results") {
    return <NavSearchState>No players or games found.</NavSearchState>
  }

  if (status === "disabled") {
    return <NavSearchState>Search unavailable.</NavSearchState>
  }

  return (
    <div className="py-1">
      {users.length > 0 ? (
        <NavSearchGroup
          title="Users"
          items={users}
          startIndex={0}
          getResultProps={getResultProps}
          highlightedIndex={highlightedIndex}
        />
      ) : null}
      {games.length > 0 ? (
        <NavSearchGroup
          title="Games"
          items={games}
          startIndex={users.length}
          getResultProps={getResultProps}
          highlightedIndex={highlightedIndex}
        />
      ) : null}
      <div className="border-t border-border/70 p-1">
        <a
          href={getDiscoverSearchHref(query)}
          className="flex min-h-9 items-center justify-between rounded-md px-2.5 text-sm font-medium transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <span>See all</span>
          <ArrowRight weight="bold" />
        </a>
      </div>
    </div>
  )
}

function NavSearchGroup({
  getResultProps,
  highlightedIndex,
  items,
  startIndex,
  title,
}: {
  getResultProps: (index: number) => SearchTypeaheadResultProps
  highlightedIndex: number
  items: NavSearchResult[]
  startIndex: number
  title: string
}) {
  return (
    <div className="px-1 py-1">
      <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
        {title}
      </p>
      <div className="flex flex-col gap-0.5">
        {items.map((item, index) => {
          const absoluteIndex = startIndex + index
          const isHighlighted = highlightedIndex === absoluteIndex
          return (
            <a
              key={`${item.type}-${item.id}`}
              {...getResultProps(absoluteIndex)}
              href={item.href}
              className={cn(
                "flex min-h-11 items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                isHighlighted ? "bg-muted text-foreground" : "hover:bg-muted"
              )}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground ring-1 ring-foreground/10">
                {item.type === "user" ? (
                  <User weight="bold" />
                ) : (
                  <GameController weight="bold" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{item.label}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {item.type === "user" ? `@${item.username}` : "Game"}
                </span>
              </span>
            </a>
          )
        })}
      </div>
    </div>
  )
}

function NavSearchState({
  children,
  tone = "muted",
}: {
  children: ReactNode
  tone?: "muted" | "error"
}) {
  return (
    <div
      className={cn(
        "flex min-h-12 items-center gap-2 px-3 py-2 text-sm",
        tone === "error" ? "text-destructive" : "text-muted-foreground"
      )}
    >
      {children}
    </div>
  )
}

function NotificationEntry({ pathname }: { pathname: string }) {
  const active = isNavActive(pathname, "/notifications")
  const unreadQuery = trpc.notification.unreadCount.useQuery(undefined, {
    refetchOnWindowFocus: true,
    refetchInterval: () =>
      typeof document !== "undefined" && document.visibilityState === "visible"
        ? 30_000
        : false,
    refetchIntervalInBackground: false,
  })
  const unreadCount = unreadQuery.data ?? 0
  const badgeLabel =
    unreadCount > 99 ? "99+" : unreadCount > 0 ? String(unreadCount) : null

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
      <a
        href="/notifications"
        aria-label={
          unreadCount > 0
            ? `Open notifications, ${unreadCount} unread`
            : "Open notifications"
        }
      >
        <Bell weight="bold" />
        {badgeLabel ? (
          <span className="absolute -top-0.5 -right-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.625rem] leading-none font-semibold text-primary-foreground ring-2 ring-background sm:-top-1 sm:-right-1">
            {badgeLabel}
          </span>
        ) : null}
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
  href: "/" | "/discover"
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
        to={href}
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

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedValue(value)
    }, delayMs)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [delayMs, value])

  return debouncedValue
}

function useDelayedFlag(active: boolean, delayMs: number) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (!active) {
      setIsVisible(false)
      return
    }

    const timeoutId = window.setTimeout(() => {
      setIsVisible(true)
    }, delayMs)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [active, delayMs])

  return isVisible
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false

  const tagName = target.tagName.toLowerCase()
  return (
    target.isContentEditable ||
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select"
  )
}
