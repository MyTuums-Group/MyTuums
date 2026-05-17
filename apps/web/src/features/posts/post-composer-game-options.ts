export type PostComposerGameOption = {
  id: string
  slug: string
  name: string
}

export type PostComposerFavoriteGame = {
  id: string
  position: number
}

export function getPostComposerGameOptions(input: {
  activeGames: PostComposerGameOption[]
  favoriteGames: PostComposerFavoriteGame[]
  query?: string
}): PostComposerGameOption[] {
  const activeById = new Map(input.activeGames.map((game) => [game.id, game]))
  const favoriteIds = new Set<string>()
  const favoriteOptions = [...input.favoriteGames]
    .sort(
      (left, right) =>
        left.position - right.position || left.id.localeCompare(right.id)
    )
    .flatMap((favorite) => {
      const game = activeById.get(favorite.id)
      if (!game || favoriteIds.has(game.id)) return []

      favoriteIds.add(game.id)
      return [game]
    })

  const ordered = [
    ...favoriteOptions,
    ...input.activeGames.filter((game) => !favoriteIds.has(game.id)),
  ]
  const query = input.query?.trim().toLocaleLowerCase() ?? ""
  if (!query) return ordered

  return ordered.filter((game) =>
    `${game.name} ${game.slug}`.toLocaleLowerCase().includes(query)
  )
}
