import { Link } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@workspace/ui/components/sheet";
import { trpc } from "@/lib/trpc";
import { getApiBase } from "@/lib/trpc";
import type { ReactNode } from "react";
import {
  House,
  Compass,
  Bell,
  MagnifyingGlass,
  List,
  Gear,
  SignOut,
  User,
} from "@phosphor-icons/react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background text-foreground flex min-h-svh flex-col">
      <AppHeader />
      <main className="flex-1">{children}</main>
      <AppFooter />
    </div>
  );
}

// ── Header ─────────────────────────────────────────────────────────────

function AppHeader() {
  const currentAppUser = trpc.currentAppUser.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const appUserState = currentAppUser.data;
  const isLoggedIn = !!appUserState && appUserState.kind !== "unauthenticated";
  const user = appUserState && "user" in appUserState ? appUserState.user : undefined;
  const profile = appUserState?.kind === "active_onboarded_profile" ? appUserState.profile : undefined;

  const displayName = profile?.displayName ?? user?.name ?? user?.email ?? "";
  const username = profile?.username;
  const avatarUrl = user?.image ?? undefined;

  const handleLogout = async () => {
    await fetch(`${getApiBase()}/api/auth/sign-out`, {
      method: "POST",
      credentials: "include",
    });
    window.location.href = "/login";
  };

  return (
    <header className="border-border/70 bg-background/95 sticky top-0 z-40 border-b backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 sm:px-6">
        {/* Logo */}
        <Link
          to="/"
          className="group flex min-w-0 items-center gap-3 rounded-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          aria-label="MyTuums home"
        >
          <img
            src="/favicon.svg"
            alt=""
            className="size-9 shrink-0 rounded-xl shadow-sm"
            aria-hidden="true"
          />
          <span className="hidden min-w-0 flex-col leading-none sm:flex">
            <span className="font-heading text-base font-semibold tracking-tight">
              MyTuums
            </span>
            <span className="text-muted-foreground mt-1 text-xs">
              Share gaming posts and clips
            </span>
          </span>
        </Link>

        {/* Desktop nav */}
        {isLoggedIn && (
          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-1 md:flex"
          >
            <HeaderNavLink to="/" icon={<House weight="bold" />}>
              Home
            </HeaderNavLink>
            <HeaderNavLink to="/discover" icon={<Compass weight="bold" />}>
              Discover
            </HeaderNavLink>
          </nav>
        )}

        {/* Right section */}
        <div className="ml-auto flex items-center gap-2">
          {isLoggedIn ? (
            <>
              {/* Search */}
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground size-9"
                onClick={() => { /* TODO: open search modal */ }}
              >
                <MagnifyingGlass weight="bold" />
                <span className="sr-only">Search</span>
              </Button>

              {/* Notifications */}
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground relative size-9"
                onClick={() => { /* TODO: navigate to notifications */ }}
              >
                <Bell weight="bold" />
                <span className="sr-only">Notifications</span>
                {/* Badge placeholder — wire to unread count later */}
                <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary ring-2 ring-background" />
              </Button>

              {/* User menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative size-9 rounded-full p-0"
                  >
                    <Avatar size="sm">
                      <AvatarImage src={avatarUrl} alt={displayName} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {getInitials(displayName)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="flex items-center gap-2 px-2 py-1.5">
                    <Avatar size="sm">
                      <AvatarImage src={avatarUrl} alt={displayName} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {getInitials(displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium">
                        {displayName}
                      </span>
                      {username && (
                        <span className="text-muted-foreground truncate text-xs">
                          @{username}
                        </span>
                      )}
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  {username && (
                    <DropdownMenuItem asChild>
                      <Link to="/@{$username}" params={{ username }}>
                        <User weight="bold" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <a href="/settings">
                      <Gear weight="bold" />
                      Settings
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => {
                      void handleLogout();
                    }}
                  >
                    <SignOut weight="bold" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile menu */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground md:hidden"
                  >
                    <List weight="bold" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72">
                  <SheetHeader>
                    <SheetTitle className="sr-only">Navigation menu</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 flex flex-col gap-1">
                    <MobileNavLink to="/">
                      <House weight="bold" />
                      Home
                    </MobileNavLink>
                    <MobileNavLink to="/discover">
                      <Compass weight="bold" />
                      Discover
                    </MobileNavLink>
                    <MobileNavLink to="/notifications">
                      <Bell weight="bold" />
                      Notifications
                    </MobileNavLink>
                    <div className="my-2 h-px bg-border" />
                    {username && (
                    <MobileNavLink to="/@{$username}" params={{ username }}>
                      <User weight="bold" />
                      Profile
                    </MobileNavLink>
                  )}
                  <a
                    href="/settings"
                    className="text-muted-foreground hover:text-foreground flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
                  >
                    <Gear weight="bold" />
                    Settings
                  </a>
                    <button
                      onClick={() => {
                        void handleLogout();
                      }}
                      className="text-destructive hover:bg-destructive/10 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
                    >
                      <SignOut weight="bold" />
                      Log out
                    </button>
                  </div>
                </SheetContent>
              </Sheet>
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
  );
}

function HeaderNavLink({
  to,
  search,
  icon,
  children,
}: {
  to: string;
  search?: Record<string, unknown>;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      search={search}
      className="text-muted-foreground hover:text-foreground data-[status=active]:text-foreground data-[status=active]:bg-muted flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      activeOptions={{ exact: to === "/" && !search }}
    >
      {icon}
      {children}
    </Link>
  );
}

function MobileNavLink({
  to,
  search,
  params,
  children,
}: {
  to: string;
  search?: Record<string, unknown>;
  params?: Record<string, string>;
  children: ReactNode;
}) {
  return (
    <SheetClose asChild>
      <Link
        to={to}
        search={search}
        params={params}
        className="text-muted-foreground hover:text-foreground flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
      >
        {children}
      </Link>
    </SheetClose>
  );
}

function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    const first = parts[0];
    return first ? first.slice(0, 2).toUpperCase() : "?";
  }
  const a = parts[0]?.[0];
  const b = parts[parts.length - 1]?.[0];
  return (a && b ? a + b : a ?? "?").toUpperCase();
}

// ── Footer ─────────────────────────────────────────────────────────────

function AppFooter() {
  return (
    <footer className="border-border/70 bg-muted/30 border-t">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 md:grid-cols-[1fr_auto]">
          {/* Brand */}
          <div className="max-w-md">
            <div className="flex items-center gap-2">
              <img
                src="/favicon.svg"
                alt=""
                className="size-6 rounded-md"
                aria-hidden="true"
              />
              <p className="font-heading text-sm font-semibold tracking-tight">
                MyTuums
              </p>
            </div>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              A web-first social platform for gamers to post short updates,
              share clips, follow people, and browse game-tagged discovery.
            </p>
          </div>

          {/* Links */}
          <nav
            aria-label="Footer navigation"
            className="grid gap-8 sm:grid-cols-2"
          >
            <div>
              <p className="text-foreground mb-3 text-xs font-semibold uppercase tracking-wider">
                Product
              </p>
              <ul className="space-y-2">
                <li>
                  <FooterLink href="/about">About</FooterLink>
                </li>
                <li>
                  <FooterLink href="/support">Support</FooterLink>
                </li>
                <li>
                  <FooterLink href="/contact">Contact</FooterLink>
                </li>
                <li>
                  <FooterLink href="/accessibility">Accessibility</FooterLink>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-foreground mb-3 text-xs font-semibold uppercase tracking-wider">
                Legal
              </p>
              <ul className="space-y-2">
                <li>
                  <FooterLink href="/privacy">Privacy</FooterLink>
                </li>
                <li>
                  <FooterLink href="/terms">Terms</FooterLink>
                </li>
                <li>
                  <FooterLink href="/cookies">Cookies</FooterLink>
                </li>
              </ul>
            </div>
          </nav>
        </div>

        {/* Bottom bar */}
        <div className="border-border/70 mt-8 border-t pt-6 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} MyTuums. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="text-muted-foreground hover:text-foreground underline-offset-4 transition-colors hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      {children}
    </a>
  );
}
