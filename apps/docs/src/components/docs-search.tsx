import { ArrowRight, MagnifyingGlass, X } from "@phosphor-icons/react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"
import { startTransition, useDeferredValue, useEffect, useId, useState } from "react"
import { createTrpcClient, type DocsSearchResult } from "../lib/trpc"

const docsClient = createTrpcClient()
const MIN_SEARCH_QUERY_LENGTH = 2
const SEARCH_RESULT_LIMIT = 6

type SearchStatus = "idle" | "loading" | "success" | "error"

export function DocsSearch() {
  const searchId = useId()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<DocsSearchResult[]>([])
  const [status, setStatus] = useState<SearchStatus>("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const deferredQuery = useDeferredValue(query)
  const trimmedQuery = deferredQuery.trim()
  const showPanel = query.trim().length >= MIN_SEARCH_QUERY_LENGTH

  useEffect(() => {
    if (trimmedQuery.length < MIN_SEARCH_QUERY_LENGTH) {
      startTransition(() => {
        setResults([])
        setStatus("idle")
        setErrorMessage(null)
      })
      return
    }

    let cancelled = false
    setStatus("loading")

    void docsClient.docs.search
      .query({ query: trimmedQuery, limit: SEARCH_RESULT_LIMIT })
      .then((nextResults) => {
        if (cancelled) {
          return
        }

        startTransition(() => {
          setResults(nextResults)
          setStatus("success")
          setErrorMessage(null)
        })
      })
      .catch(() => {
        if (cancelled) {
          return
        }

        startTransition(() => {
          setResults([])
          setStatus("error")
          setErrorMessage("Docs search unavailable")
        })
      })

    return () => {
      cancelled = true
    }
  }, [trimmedQuery])

  return (
    <div className="relative w-full">
      <div className="relative">
        <MagnifyingGlass
          weight="bold"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          id={searchId}
          aria-label="Search docs"
          autoComplete="off"
          className="h-10 bg-card pr-10 pl-9 shadow-sm"
          placeholder="Search protected docs"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
        />
        {query.length > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Clear docs search"
            className="absolute top-1/2 right-1.5 size-7 -translate-y-1/2"
            onClick={() => setQuery("")}
          >
            <X weight="bold" />
          </Button>
        ) : null}
      </div>

      {showPanel ? (
        <div className="absolute right-0 z-40 mt-2 w-full overflow-hidden rounded-xl border border-border/80 bg-popover text-popover-foreground shadow-lg">
          <SearchPanel status={status} errorMessage={errorMessage} results={results} />
        </div>
      ) : null}
    </div>
  )
}

function SearchPanel({
  status,
  errorMessage,
  results,
}: {
  status: SearchStatus
  errorMessage: string | null
  results: DocsSearchResult[]
}) {
  if (status === "loading") {
    return <SearchStateLabel>Searching...</SearchStateLabel>
  }

  if (status === "error") {
    return <SearchStateLabel tone="error">{errorMessage}</SearchStateLabel>
  }

  if (results.length === 0) {
    return <SearchStateLabel>No matches</SearchStateLabel>
  }

  return (
    <ul className="max-h-96 overflow-y-auto p-2" aria-label="Docs search results">
      {results.map((result) => (
        <li key={result.id}>
          <a
            href={getDocsSearchResultHref(result)}
            className="group block rounded-lg px-3 py-2.5 outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <div className="flex min-w-0 items-center justify-between gap-3">
              <p className="min-w-0 truncate text-sm font-semibold">
                {result.headingText ?? result.pageTitle}
              </p>
              <ArrowRight
                weight="bold"
                className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
              />
            </div>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {result.sectionTitle} / {result.pageTitle}
            </p>
            <p className="mt-1 max-h-10 overflow-hidden text-xs leading-5 text-muted-foreground">
              {result.excerpt}
            </p>
          </a>
        </li>
      ))}
    </ul>
  )
}

function SearchStateLabel({
  children,
  tone = "muted",
}: {
  children: string | null
  tone?: "muted" | "error"
}) {
  return (
    <p
      className={cn(
        "px-3 py-3 text-sm text-muted-foreground",
        tone === "error" && "text-destructive"
      )}
    >
      {children}
    </p>
  )
}

export function getDocsSearchResultHref(
  result: Pick<DocsSearchResult, "headingId" | "pageSlug" | "sectionSlug">
) {
  const path = `/docs/${encodeURIComponent(result.sectionSlug)}/${encodeURIComponent(
    result.pageSlug
  )}`

  if (result.headingId === null) {
    return path
  }

  return `${path}#${encodeURIComponent(result.headingId)}`
}