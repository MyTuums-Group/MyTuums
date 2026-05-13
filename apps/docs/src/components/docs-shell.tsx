import {
  Article,
  ArrowSquareOut,
  Clock,
  Desktop,
  FolderOpen,
  House,
  List,
  Moon,
  ShieldCheck,
  Sun,
} from "@phosphor-icons/react"
import { Link, useLocation } from "@tanstack/react-router"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet"
import { cn } from "@workspace/ui/lib/utils"
import { type ReactNode } from "react"
import { DocsSearch } from "@/components/docs-search"
import { useTheme, type Theme } from "@/components/theme-provider"
import { getDocsBuildMetadata } from "@/lib/docs-build-metadata"
import type { DocsNavigation } from "@/lib/trpc"

const metadata = getDocsBuildMetadata(import.meta.env)

export function DocsShell({
  children,
  navigation,
}: {
  children: ReactNode
  navigation: DocsNavigation
}) {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <DocsHeader navigation={navigation} />
      <main className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-5 sm:px-6 lg:flex-row lg:gap-8 lg:py-7">
        <aside className="hidden min-h-0 w-64 shrink-0 flex-col gap-4 overflow-y-auto pr-1 lg:flex">
          <DocsNavigationPanel navigation={navigation} />
          <AccessCard />
        </aside>
        <section className="flex min-h-0 min-w-0 flex-1 flex-col lg:overflow-hidden">
          {children}
        </section>
      </main>
      <DocsFooter />
    </div>
  )
}

function DocsHeader({ navigation }: { navigation: DocsNavigation }) {
  const { theme, setTheme } = useTheme()

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/88">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <MobileNavigation navigation={navigation} />
          <Link
            to="/"
            aria-label="MyTuums Developer Docs home"
            className="flex min-w-0 items-center gap-3 rounded-xl focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted shadow-sm ring-1 ring-foreground/10">
              <img
                src="/favicon.svg"
                alt=""
                className="size-6"
                aria-hidden="true"
              />
            </span>
            <div className="min-w-0">
              <p className="font-heading text-base font-semibold tracking-tight sm:text-lg">
                MyTuums Developer Docs
              </p>
              <p className="hidden text-sm text-muted-foreground sm:block">
                Protected documentation hub for product and operations work.
              </p>
            </div>
          </Link>
        </div>

        <div className="flex min-w-0 flex-col gap-3 lg:w-[34rem] lg:flex-row lg:items-center">
          <DocsSearch />
          <ThemeMenu theme={theme} setTheme={setTheme} />
        </div>
      </div>
      <div className="border-t border-border/60 bg-muted/30">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-2 text-xs text-muted-foreground sm:px-6">
          <p className="truncate">
            Internal reader shell authorized for active admins and owners.
          </p>
          <p className="hidden items-center gap-2 sm:flex">
            <span className="size-2 rounded-full bg-primary" />
            {metadata.environment}
          </p>
        </div>
      </div>
    </header>
  )
}

function MobileNavigation({ navigation }: { navigation: DocsNavigation }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          className="lg:hidden"
          variant="outline"
          size="icon"
          aria-label="Open docs navigation"
        >
          <List weight="bold" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[20rem] overflow-y-auto p-0">
        <SheetHeader className="border-b border-border/70 px-4 py-4 text-left">
          <SheetTitle>Docs navigation</SheetTitle>
        </SheetHeader>
        <div className="p-4">
          <DocsNavigationPanel navigation={navigation} />
        </div>
      </SheetContent>
    </Sheet>
  )
}

function DocsNavigationPanel({ navigation }: { navigation: DocsNavigation }) {
  const pathname = useLocation({ select: (location) => location.pathname })

  return (
    <Card className="overflow-hidden shadow-sm">
      <CardHeader className="border-b border-border/70 px-4 py-4">
        <CardTitle className="flex items-center gap-2 text-sm">
          <FolderOpen weight="bold" className="text-primary" />
          Documentation
        </CardTitle>
        <CardDescription>Browse protected MyTuums knowledge.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-3">
        <nav aria-label="Docs navigation" className="grid gap-1">
          <DocsNavLink
            active={pathname === "/"}
            icon={<House weight="bold" />}
            title="Overview"
            to="/"
          />
          {navigation.map((section) => (
            <div key={section.id} className="grid gap-1 pt-2 first:pt-0">
              <p className="px-2 text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                {section.title}
              </p>
              {section.pages.map((page) => {
                const href = `/docs/${section.id}/${page.slug}`
                return (
                  <DocsNavLink
                    key={`${section.id}:${page.slug}`}
                    active={pathname === href}
                    icon={<Article weight="bold" />}
                    title={page.title}
                    to="/docs/$sectionSlug/$pageSlug"
                    params={{ sectionSlug: section.id, pageSlug: page.slug }}
                  />
                )
              })}
            </div>
          ))}
        </nav>
      </CardContent>
    </Card>
  )
}

function DocsNavLink({
  active,
  icon,
  params,
  title,
  to,
}: {
  active: boolean
  icon: ReactNode
  params?: { sectionSlug: string; pageSlug: string }
  title: string
  to: "/" | "/docs/$sectionSlug/$pageSlug"
}) {
  return (
    <Link
      to={to}
      params={params}
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50",
        active && "bg-muted text-foreground shadow-sm"
      )}
    >
      <span className={cn("text-muted-foreground", active && "text-primary")}>{icon}</span>
      <span className="truncate">{title}</span>
    </Link>
  )
}

function AccessCard() {
  return (
    <Card className="shadow-sm">
      <CardHeader className="space-y-3 p-4">
        <div className="flex size-10 items-center justify-center rounded-xl bg-muted ring-1 ring-foreground/10 shadow-sm">
          <ShieldCheck weight="bold" className="text-primary" />
        </div>
        <div>
          <CardTitle className="text-sm">Protected access</CardTitle>
          <CardDescription>
            Navigation and content are loaded only after API authorization.
          </CardDescription>
        </div>
      </CardHeader>
    </Card>
  )
}

function ThemeMenu({
  theme,
  setTheme,
}: {
  theme: Theme
  setTheme: (theme: Theme) => void
}) {
  const ThemeIcon = theme === "light" ? Sun : theme === "dark" ? Moon : Desktop

  return (
    <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border/70 bg-card p-1 shadow-sm">
      <Button
        variant={theme === "light" ? "secondary" : "ghost"}
        size="icon"
        aria-label="Use light theme"
        onClick={() => setTheme("light")}
      >
        <Sun weight="bold" />
      </Button>
      <Button
        variant={theme === "dark" ? "secondary" : "ghost"}
        size="icon"
        aria-label="Use dark theme"
        onClick={() => setTheme("dark")}
      >
        <Moon weight="bold" />
      </Button>
      <Button
        variant={theme === "system" ? "secondary" : "ghost"}
        size="icon"
        aria-label="Use system theme"
        onClick={() => setTheme("system")}
      >
        <ThemeIcon weight="bold" />
      </Button>
    </div>
  )
}

function BuildMetadataCard() {
  return (
    <Card className="overflow-hidden shadow-sm">
      <CardHeader className="border-b border-border/70 px-4 py-4">
        <CardTitle className="text-sm">Build Metadata</CardTitle>
        <CardDescription>Public shell details for the current docs deployment.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-3 p-4">
        <MetadataRow label="Environment" value={metadata.environment} />
        <MetadataRow label="Site URL" value={metadata.siteUrl} />
        <MetadataRow
          label="API base"
          value={metadata.apiBaseUrl ?? "Pending API wiring"}
          tone={metadata.apiBaseUrl ? "default" : "muted"}
        />
        <MetadataRow
          label="Build SHA"
          value={metadata.commitSha ?? "Pending CI metadata"}
          tone={metadata.commitSha ? "default" : "muted"}
        />
        <MetadataRow
          label="Build time"
          value={metadata.buildTime ?? "Pending CI metadata"}
          tone={metadata.buildTime ? "default" : "muted"}
        />
        <MetadataRow label="Base path" value={metadata.basePath} />
      </CardContent>

      <CardFooter className="flex-col items-start gap-3 border-t border-border/70 bg-muted/35 p-4">
        <p className="text-sm text-muted-foreground">
          Protected Markdown, search indexes, and diagrams stay behind credentialed API
          reads.
        </p>
        <Button variant="outline" size="sm" asChild>
          <a href={metadata.siteUrl} target="_blank" rel="noreferrer">
            <ArrowSquareOut weight="bold" />
            Deployment target
          </a>
        </Button>
      </CardFooter>
    </Card>
  )
}

export function DocsBuildMetadataPanel() {
  return <BuildMetadataCard />
}

function DocsFooter() {
  return (
    <footer className="border-t border-border/70 bg-muted/35">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-5 text-sm text-muted-foreground sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <p>
          MyTuums Docs loads internal navigation only for verified active admins
          and owners.
        </p>
        <p className="flex items-center gap-2">
          <Clock weight="bold" className="text-primary" />
          Build surface: {metadata.environment}
        </p>
      </div>
    </footer>
  )
}

function MetadataRow({
  label,
  value,
  tone = "default",
}: {
  label: string
  value: string
  tone?: "default" | "muted"
}) {
  return (
    <div className="grid gap-1">
      <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
        {label}
      </p>
      <p
        className={cn(
          "rounded-lg border border-border/70 bg-muted/45 px-3 py-2 font-mono text-xs [overflow-wrap:anywhere]",
          tone === "muted" && "text-muted-foreground"
        )}
      >
        {value}
      </p>
    </div>
  )
}
