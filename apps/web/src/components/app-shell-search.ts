import type { AppRouter, inferRouterOutputs } from "@workspace/api-contract"
import { SEARCH_MIN_QUERY_LENGTH } from "@workspace/types"

type SearchResponse = inferRouterOutputs<AppRouter>["search"]
export type UserSearchResult = SearchResponse["users"][number]
export type GameSearchResult = SearchResponse["games"][number]
export type NavSearchResult = UserSearchResult | GameSearchResult

const NAV_SEARCH_GROUP_LIMIT = 3

export function shouldStartNavSearch(query: string) {
  return query.trim().length >= SEARCH_MIN_QUERY_LENGTH
}

export function getDiscoverSearchHref(query: string) {
  const trimmed = query.trim()
  if (!trimmed) return "/discover"

  const search = new URLSearchParams()
  search.set("q", trimmed)
  return `/discover?${search.toString()}`
}

export function groupNavSearchResults(
  results: SearchResponse | undefined,
  limit = NAV_SEARCH_GROUP_LIMIT
) {
  return {
    users: results?.users.slice(0, limit) ?? [],
    games: results?.games.slice(0, limit) ?? [],
  }
}
