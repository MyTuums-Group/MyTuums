import type { AppRouter, inferRouterOutputs } from "@workspace/api-contract"

type SearchResponse = inferRouterOutputs<AppRouter>["search"]
type SearchResult = SearchResponse["results"][number]

export type FavoriteGame = { id: string; slug: string; name: string }

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

function isGameSearchResult(
  item: SearchResult
): item is Extract<SearchResult, { type: "game" }> {
  return item.type === "game"
}
