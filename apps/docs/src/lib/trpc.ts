import { createTRPCProxyClient, httpBatchLink } from "@trpc/client"
import type { AppRouter, inferRouterOutputs } from "@workspace/api-contract"
import superjson from "superjson"

type DocsEnv = {
  VITE_DOCS_API_BASE_URL?: string
  VITE_API_URL?: string
  VITE_WEB_APP_URL?: string
}

export type DocsReaderBootstrap = inferRouterOutputs<AppRouter>["docs"]["navigation"]
export type DocsNavigation = DocsReaderBootstrap["sections"]
export type DocsPageRead = inferRouterOutputs<AppRouter>["docs"]["page"]
export type DocsDiagramRead = inferRouterOutputs<AppRouter>["docs"]["diagram"]
export type DocsAssetRead = inferRouterOutputs<AppRouter>["docs"]["asset"]
export type DocsSearchResult = inferRouterOutputs<AppRouter>["docs"]["search"][number]

export function getApiBase() {
  const env = getViteEnv()
  return env.VITE_DOCS_API_BASE_URL ?? env.VITE_API_URL ?? "http://localhost:4000"
}

export function getWebAppBase() {
  return getViteEnv().VITE_WEB_APP_URL ?? "http://localhost:5173"
}

export function createTrpcClient() {
  return createTRPCProxyClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${getApiBase()}/trpc`,
        transformer: superjson,
        fetch(url, options) {
          return fetch(url, {
            ...options,
            credentials: "include",
          })
        },
      }),
    ],
  })
}

function getViteEnv(): DocsEnv {
  try {
    return (import.meta as unknown as { env: DocsEnv }).env
  } catch {
    return {}
  }
}
