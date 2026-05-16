import { createContext, type ReactNode, useContext } from "react"
import type { DocsReaderBootstrap } from "@/lib/trpc"

export type DocsReaderArtifactValue = Pick<DocsReaderBootstrap, "homeEntry" | "contentBuild">

const DocsReaderArtifactContext = createContext<DocsReaderArtifactValue | null>(null)

export function DocsReaderArtifactProvider({
  children,
  value,
}: {
  children: ReactNode
  value: DocsReaderArtifactValue
}) {
  return (
    <DocsReaderArtifactContext.Provider value={value}>{children}</DocsReaderArtifactContext.Provider>
  )
}

export function useDocsReaderArtifact(): DocsReaderArtifactValue {
  const value = useContext(DocsReaderArtifactContext)
  if (!value) {
    throw new Error("DocsReaderArtifactProvider is missing in the route tree.")
  }

  return value
}
