import type { ReactNode } from "react"
import ReactMarkdown, { type Components } from "react-markdown"
import rehypeHighlight from "rehype-highlight"
import remarkGfm from "remark-gfm"
import { cn } from "@workspace/ui/lib/utils"
import { DocsDiagramViewer } from "./docs-diagram-viewer"
import type { DocsPageRead } from "../lib/trpc"

type MarkdownPage = DocsPageRead["page"]
type MarkdownBuild = DocsPageRead["build"]
type MarkdownHeading = MarkdownPage["headings"][number]
type MarkdownDiagram = MarkdownPage["diagrams"][number]

const CALLOUT_MARKER_PATTERN = /^(>\s*)\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$/iu

export function DocsMarkdownReader({
  page,
  build,
}: {
  page: MarkdownPage
  build: MarkdownBuild
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row lg:items-stretch">
      <article className="min-w-0 flex-1 rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm lg:min-h-0 lg:overflow-x-hidden lg:overflow-y-auto">
        <header className="border-b border-border/70 bg-muted/25 px-5 py-6 sm:px-7">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <p className="font-semibold text-primary">{page.sectionTitle}</p>
            <span className="text-muted-foreground">/</span>
            <p className="text-muted-foreground">{page.slug}</p>
          </div>
          <h1 className="mt-3 max-w-4xl font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {page.title}
          </h1>
          {page.summary ? (
            <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
              {page.summary}
            </p>
          ) : null}
        </header>

        <DocsMarkdown page={page} />
      </article>

      <aside className="grid w-full shrink-0 gap-4 lg:w-72 lg:min-h-0 lg:overflow-y-auto">
        <TableOfContents headings={page.headings} />
        <ProvenancePanel page={page} build={build} />
      </aside>
    </div>
  )
}

export function DocsMarkdown({
  page,
}: {
  page: MarkdownPage
}) {
  const components = createMarkdownComponents(page)

  return (
    <div className="px-5 py-6 sm:px-7 sm:py-8">
      <div className="docs-markdown max-w-3xl text-sm leading-7 text-foreground [&_.hljs-attr]:text-chart-3 [&_.hljs-built_in]:text-chart-4 [&_.hljs-comment]:text-muted-foreground [&_.hljs-keyword]:text-primary [&_.hljs-literal]:text-chart-2 [&_.hljs-number]:text-chart-2 [&_.hljs-string]:text-chart-5 [&_.hljs-title]:text-chart-1">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[[rehypeHighlight, { ignoreMissing: true }]]}
          skipHtml
          urlTransform={safeUrlTransform}
          components={components}
        >
          {normalizeCalloutMarkdown(page.markdown)}
        </ReactMarkdown>
      </div>
    </div>
  )
}

export function normalizeCalloutMarkdown(markdown: string): string {
  return markdown
    .split(/\r?\n/u)
    .map((line) => {
      const match = line.match(CALLOUT_MARKER_PATTERN)
      if (!match) {
        return line
      }

      return `${match[1]}**${formatCalloutTitle(match[2] ?? "note")}**`
    })
    .join("\n")
}

function createMarkdownComponents(page: MarkdownPage): Components {
  const headings = page.headings
  const diagramsById = new Map(page.diagrams.map((diagram) => [diagram.id, diagram]))
  let headingCursor = 0

  function takeHeading(level: number): MarkdownHeading | null {
    const currentHeading = headings[headingCursor]
    if (currentHeading?.level === level) {
      headingCursor += 1
      return currentHeading
    }

    const nextHeadingIndex = headings.findIndex(
      (heading, index) => index >= headingCursor && heading.level === level
    )
    if (nextHeadingIndex === -1) {
      return null
    }

    headingCursor = nextHeadingIndex + 1
    return headings[nextHeadingIndex] ?? null
  }

  return {
    h1: ({ children }) => renderHeading(1, takeHeading(1), children),
    h2: ({ children }) => renderHeading(2, takeHeading(2), children),
    h3: ({ children }) => renderHeading(3, takeHeading(3), children),
    h4: ({ children }) => renderHeading(4, takeHeading(4), children),
    h5: ({ children }) => renderHeading(5, takeHeading(5), children),
    h6: ({ children }) => renderHeading(6, takeHeading(6), children),
    p: ({ children }) => <p className="my-4 leading-7 text-foreground">{children}</p>,
    a: ({ children, href }) => (
      <a
        href={href}
        className="font-medium text-primary underline-offset-4 hover:underline"
        rel={href?.startsWith("http") ? "noreferrer" : undefined}
        target={href?.startsWith("http") ? "_blank" : undefined}
      >
        {children}
      </a>
    ),
    ul: ({ children }) => <ul className="my-5 list-disc space-y-2 pl-6">{children}</ul>,
    ol: ({ children }) => <ol className="my-5 list-decimal space-y-2 pl-6">{children}</ol>,
    li: ({ children }) => <li className="pl-1 leading-7">{children}</li>,
    blockquote: ({ children }) => (
      <blockquote className="my-6 rounded-xl border border-border/70 bg-muted/45 px-4 py-3 text-sm leading-7 shadow-sm [&>p:first-child]:mt-0 [&>p:last-child]:mb-0 [&_strong:first-child]:text-primary">
        {children}
      </blockquote>
    ),
    table: ({ children }) => (
      <div className="my-6 overflow-x-auto rounded-xl border border-border/70 shadow-sm">
        <table className="w-full border-collapse text-left text-sm">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-muted/65">{children}</thead>,
    th: ({ children }) => (
      <th className="border-b border-border/70 px-3 py-2 font-semibold text-foreground">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="border-t border-border/60 px-3 py-2 align-top">{children}</td>
    ),
    pre: ({ children }) => (
      <pre className="my-6 overflow-x-auto rounded-xl border border-border/70 bg-muted/65 p-4 text-xs leading-6 shadow-inner">
        {children}
      </pre>
    ),
    code: ({ children, className }) => (
      <code
        className={cn(
          "rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.9em] text-foreground",
          className?.startsWith("language-") &&
            "block bg-transparent p-0 text-xs leading-6"
        )}
      >
        {children}
      </code>
    ),
    input: ({ checked, type }) => (
      <input
        checked={checked}
        className="mr-2 size-4 rounded border-border align-[-0.15em] accent-primary"
        disabled
        readOnly
        type={type}
      />
    ),
    img: ({ alt, src }) => renderImageOrDiagram({
      alt,
      diagramsById,
      pageSlug: page.slug,
      sectionSlug: page.sectionId,
      src,
    }),
    hr: () => <hr className="my-8 border-border/70" />,
  }
}

function renderImageOrDiagram({
  alt,
  diagramsById,
  pageSlug,
  sectionSlug,
  src,
}: {
  alt?: string
  diagramsById: Map<string, MarkdownDiagram>
  pageSlug: string
  sectionSlug: string
  src?: string
}) {
  if (src?.startsWith("diagram:")) {
    const diagramId = src.slice("diagram:".length).trim()
    const diagram = diagramsById.get(diagramId)

    if (diagram !== undefined) {
      return (
        <DocsDiagramViewer
          diagram={diagram}
          pageSlug={pageSlug}
          sectionSlug={sectionSlug}
        />
      )
    }

    return (
      <span className="my-4 block rounded-lg border border-destructive/35 bg-card px-3 py-2 text-sm text-destructive">
        Missing diagram: {diagramId}
      </span>
    )
  }

  if (!src) {
    return null
  }

  return (
    <img
      alt={alt ?? ""}
      className="my-6 max-w-full rounded-xl border border-border/70 shadow-sm"
      loading="lazy"
      src={src}
    />
  )
}

function renderHeading(level: number, heading: MarkdownHeading | null, children: ReactNode) {
  const id = heading?.id
  const headingClasses = cn(
    "group scroll-mt-28 font-heading font-semibold tracking-tight text-foreground",
    level === 1 && "mb-4 mt-0 text-3xl",
    level === 2 && "mb-3 mt-10 border-t border-border/70 pt-8 text-2xl",
    level === 3 && "mb-2 mt-7 text-xl",
    level === 4 && "mb-2 mt-6 text-lg",
    level >= 5 && "mb-2 mt-5 text-base"
  )
  const content = id ? (
    <a className="inline-flex items-baseline gap-2 no-underline" href={`#${id}`}>
      <span>{children}</span>
      <span
        aria-hidden="true"
        className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
      >
        #
      </span>
    </a>
  ) : (
    children
  )

  switch (level) {
    case 1:
      return (
        <h1 className={headingClasses} id={id}>
          {content}
        </h1>
      )
    case 2:
      return (
        <h2 className={headingClasses} id={id}>
          {content}
        </h2>
      )
    case 3:
      return (
        <h3 className={headingClasses} id={id}>
          {content}
        </h3>
      )
    case 4:
      return (
        <h4 className={headingClasses} id={id}>
          {content}
        </h4>
      )
    case 5:
      return (
        <h5 className={headingClasses} id={id}>
          {content}
        </h5>
      )
    default:
      return (
        <h6 className={headingClasses} id={id}>
          {content}
        </h6>
      )
  }
}

function TableOfContents({ headings }: { headings: MarkdownHeading[] }) {
  const visibleHeadings = headings.filter((heading) => heading.level <= 3)

  return (
    <section className="rounded-xl border border-border/70 bg-card p-4 text-card-foreground shadow-sm">
      <h2 className="font-heading text-sm font-semibold tracking-tight">On this page</h2>
      {visibleHeadings.length > 0 ? (
        <nav aria-label="Table of contents" className="mt-3 grid gap-2 text-sm">
          {visibleHeadings.map((heading) => (
            <a
              key={heading.id}
              href={`#${heading.id}`}
              className={cn(
                "rounded-md px-2 py-1 text-muted-foreground underline-offset-4 transition-colors hover:bg-muted hover:text-foreground hover:no-underline focus-visible:ring-[3px] focus-visible:ring-ring/50",
                heading.level === 3 && "pl-3"
              )}
            >
              {heading.text}
            </a>
          ))}
        </nav>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">No headings found.</p>
      )}
    </section>
  )
}

function ProvenancePanel({ page, build }: { page: MarkdownPage; build: MarkdownBuild }) {
  return (
    <section className="rounded-xl border border-border/70 bg-card p-4 text-card-foreground shadow-sm">
      <h2 className="font-heading text-sm font-semibold tracking-tight">Provenance</h2>
      <dl className="mt-3 grid gap-3 text-sm">
        <MetadataItem label="Environment" value={build.environment} />
        <MetadataItem label="Source" value={page.sourcePath} />
        <MetadataItem label="Build time" value={formatDateTime(build.generatedAt)} />
        <MetadataItem label="Commit" value={build.commitSha ?? "Unknown"} />
      </dl>
    </section>
  )
}

function MetadataItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <dt className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="[overflow-wrap:anywhere] rounded-md border border-border/70 bg-muted/45 px-2.5 py-2 font-mono text-xs text-foreground">
        {value}
      </dd>
    </div>
  )
}

function formatCalloutTitle(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()
}

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toISOString()
}

function safeUrlTransform(url: string): string {
  const trimmedUrl = url.trim()

  if (
    trimmedUrl.startsWith("#") ||
    trimmedUrl.startsWith("diagram:") ||
    trimmedUrl.startsWith("/") ||
    trimmedUrl.startsWith("./") ||
    trimmedUrl.startsWith("../")
  ) {
    return trimmedUrl
  }

  try {
    const parsedUrl = new URL(trimmedUrl)
    if (["http:", "https:", "mailto:"].includes(parsedUrl.protocol)) {
      return trimmedUrl
    }
  } catch {
    return ""
  }

  return ""
}