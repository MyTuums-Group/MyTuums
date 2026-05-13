import {
  Article,
  ArrowSquareOut,
  Clock,
  Desktop,
  FileDoc,
  Moon,
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
import { cn } from "@workspace/ui/lib/utils"
import { type ReactNode } from "react"
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
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:items-start lg:gap-8">
        <section className="min-w-0 flex-1">{children}</section>
        <aside className="w-full shrink-0 lg:sticky lg:top-24 lg:max-w-sm">
          <BuildMetadataCard />
        </aside>
      </main>
      <DocsFooter />
    </div>
  )
}

function DocsHeader({ navigation }: { navigation: DocsNavigation }) {
  const pathname = useLocation({ select: (location) => location.pathname })
  const { theme, setTheme } = useTheme()

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/88">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted ring-1 ring-foreground/10 shadow-sm">
            <Article weight="fill" className="text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-heading text-lg font-semibold tracking-tight">
              MyTuums Developer Docs
            </p>
            <p className="text-sm text-muted-foreground">
              Separate internal reader shell for protected documentation at{" "}
              <span className="font-medium text-foreground">{metadata.siteUrl}</span>.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:items-end">
          <nav
            aria-label="Docs navigation"
            className="flex flex-wrap items-center gap-2"
          >
            <Button variant={pathname === "/" ? "secondary" : "ghost"} size="sm" asChild>
              <Link to="/" className="gap-2">
                <FileDoc weight="bold" />
                Overview
              </Link>
            </Button>

            {navigation.flatMap((section) =>
              section.pages.map((page) => {
                const isActive =
                  pathname === `/docs/${section.id}/${page.slug}`

                return (
                  <Button
                    key={`${section.id}:${page.slug}`}
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    asChild
                  >
                    <Link
                      to="/docs/$sectionSlug/$pageSlug"
                      params={{ sectionSlug: section.id, pageSlug: page.slug }}
                      className="gap-2"
                    >
                      <Article weight="bold" />
                      {page.title}
                    </Link>
                  </Button>
                )
              })
            )}
          </nav>

          <ThemeMenu theme={theme} setTheme={setTheme} />
        </div>
      </div>
    </header>
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
    <div className="flex items-center gap-2">
      <Button
        variant={theme === "light" ? "secondary" : "ghost"}
        size="sm"
        onClick={() => setTheme("light")}
      >
        <Sun weight="bold" />
        Light
      </Button>
      <Button
        variant={theme === "dark" ? "secondary" : "ghost"}
        size="sm"
        onClick={() => setTheme("dark")}
      >
        <Moon weight="bold" />
        Dark
      </Button>
      <Button
        variant={theme === "system" ? "secondary" : "ghost"}
        size="sm"
        onClick={() => setTheme("system")}
      >
        <ThemeIcon weight="bold" />
        System
      </Button>
    </div>
  )
}

function BuildMetadataCard() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/70">
        <CardTitle>Build Metadata</CardTitle>
        <CardDescription>
          Shell metadata is public. Docs navigation loaded only after API
          authorization succeeds.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
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

      <CardFooter className="flex-col items-start gap-3">
        <p className="text-sm text-muted-foreground">
          Protected Markdown, search indexes, and diagram snapshots stay behind
          credentialed API reads.
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
      <p className="text-xs font-semibold tracking-[0.16em] uppercase text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "rounded-lg border border-border/70 bg-muted/45 px-3 py-2 font-mono text-xs",
          tone === "muted" && "text-muted-foreground"
        )}
      >
        {value}
      </p>
    </div>
  )
}
