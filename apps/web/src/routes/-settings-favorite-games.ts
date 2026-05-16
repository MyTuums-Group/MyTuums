import type { AppRouter, inferRouterOutputs } from "@workspace/api-contract"
import { SEARCH_MIN_QUERY_LENGTH } from "@workspace/types"

type SearchResponse = inferRouterOutputs<AppRouter>["search"]
type SearchResult = SearchResponse["results"][number]

export type FavoriteGame = { id: string; slug: string; name: string }

export type FavoriteGameSearchStatus =
  | "disabled"
  | "empty"
  | "too_short"
  | "loading"
  | "no_results"
  | "results"

export function getFavoriteGameSearchOptions(
  search: SearchResponse | undefined,
  favoriteGames: FavoriteGame[]
): FavoriteGame[] {
  const selectedGameIds = new Set(favoriteGames.map((game) => game.id))

  return (search?.results ?? [])
    .filter(isGameSearchResult)
    .map((game) => ({
      id: game.id,
      name: game.label,
      slug: game.slug,
    }))
    .filter((game) => !selectedGameIds.has(game.id))
}

export function getFavoriteGameSearchStatus({
  isDisabled,
  isLoading,
  query,
  resultCount,
}: {
  isDisabled: boolean
  isLoading: boolean
  query: string
  resultCount: number
}): FavoriteGameSearchStatus {
  if (isDisabled) return "disabled"

  const trimmedQuery = query.trim()
  if (trimmedQuery.length === 0) return "empty"
  if (trimmedQuery.length < SEARCH_MIN_QUERY_LENGTH) return "too_short"
  if (resultCount > 0) return "results"
  if (isLoading) return "loading"
  return "no_results"
}

function isGameSearchResult(
  item: SearchResult
): item is Extract<SearchResult, { type: "game" }> {
  return item.type === "game"
}
