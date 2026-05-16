import {
  SEARCH_MIN_QUERY_LENGTH,
  type AccountStatus,
  type ViewerContext,
} from "@workspace/types"

export interface AppSearchInput {
  query: string
  limit: number
}

interface BaseSearchResultItem {
  id: string
  label: string
  href: string
}

export interface AppUserSearchResultItem extends BaseSearchResultItem {
  type: "user"
  username: string
}

export interface AppGameSearchResultItem extends BaseSearchResultItem {
  type: "game"
  slug: string
}

export type AppSearchResultItem =
  | AppUserSearchResultItem
  | AppGameSearchResultItem

export interface AppSearchResult {
  users: AppUserSearchResultItem[]
  games: AppGameSearchResultItem[]
  results: AppSearchResultItem[]
}

export interface SearchProfileRow {
  id: string
  userId: string
  username: string
  displayName: string | null
  accountStatus: AccountStatus
}

export interface SearchGameRow {
  id: string
  slug: string
  name: string
  aliases: string[]
  isActive: boolean
}

export interface SearchProfilesParams {
  viewer: ViewerContext
  terms: string[]
  limit: number
}

export interface SearchGamesParams {
  terms: string[]
  limit: number
}

export interface SearchQueryAdapter {
  searchProfiles(params: SearchProfilesParams): Promise<SearchProfileRow[]>
  searchGames(params: SearchGamesParams): Promise<SearchGameRow[]>
}

export interface SearchService {
  appSearch(
    viewer: ViewerContext,
    input: AppSearchInput
  ): Promise<AppSearchResult>
}

type SearchCandidate = AppSearchResultItem & {
  exactTexts: string[]
  prefixTexts: string[]
  searchableText: string
  sortText: string
}

type RankedSearchItem = AppSearchResultItem & {
  searchableText: string
  sortText: string
  rank: SearchRank
}

type SearchRank = 0 | 1 | 2

/** Caps how many rows each adapter query may return before service-side ranking and filtering. */
function searchAdapterCandidateLimit(requestedLimit: number): number {
  return Math.min(5000, Math.max(200, requestedLimit * 100))
}

export function createSearchService(
  adapter: SearchQueryAdapter
): SearchService {
  return {
    async appSearch(viewer, input) {
      if (!viewer.isAuthenticated) {
        throw new Error("Search is authenticated-only in v1.")
      }

      const terms = normalizeQuery(input.query)
      if (terms.length === 0) return emptySearchResult()

      const candidateLimit = searchAdapterCandidateLimit(input.limit)

      const [profiles, games] = await Promise.all([
        adapter.searchProfiles({ viewer, terms, limit: candidateLimit }),
        adapter.searchGames({ terms, limit: candidateLimit }),
      ])

      const resultLimit = Math.max(0, input.limit)

      const users = profiles
        .filter((profile) => canSearchProfile(viewer, profile))
        .map(toProfileSearchItem)
        .map((item) => rankItem(item, terms))
        .filter(
          (item): item is RankedSearchItem & AppUserSearchResultItem =>
            item?.type === "user"
        )
        .sort(compareRankedSearchItems)
        .slice(0, resultLimit)

      const gameResults = games
        .filter(canSearchGame)
        .map(toGameSearchItem)
        .map((item) => rankItem(item, terms))
        .filter(
          (item): item is RankedSearchItem & AppGameSearchResultItem =>
            item?.type === "game"
        )
        .sort(compareRankedSearchItems)
        .slice(0, resultLimit)

      const rankedItems = [...users, ...gameResults]
        .sort(compareRankedSearchItems)
        .slice(0, resultLimit)

      return {
        users: users.map(toPublicUserSearchItem),
        games: gameResults.map(toPublicGameSearchItem),
        results: rankedItems.map(toPublicSearchItem),
      }
    },
  }
}

export function createInMemorySearchService(state: {
  profiles: SearchProfileRow[]
  games: SearchGameRow[]
}): SearchService {
  return createSearchService({
    searchProfiles({ terms, limit }) {
      const matched = state.profiles.filter((row) =>
        profileMatchesAnySearchTerm(row, terms)
      )
      return Promise.resolve(matched.slice(0, limit))
    },
    searchGames({ terms, limit }) {
      const matched = state.games.filter((row) =>
        gameMatchesAnySearchTerm(row, terms)
      )
      return Promise.resolve(matched.slice(0, limit))
    },
  })
}

function normalizeQuery(query: string): string[] {
  if (query.trim().length < SEARCH_MIN_QUERY_LENGTH) return []

  return normalizeForSearch(query).split(/\s+/).filter(Boolean)
}

function normalizeForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .trim()
}

function canSearchProfile(
  viewer: ViewerContext,
  profile: SearchProfileRow
): boolean {
  if (profile.accountStatus !== "active") return false
  if (viewer.blockedUserIds.includes(profile.userId)) return false
  if (viewer.blockedByUserIds.includes(profile.userId)) return false
  return true
}

function canSearchGame(game: SearchGameRow): boolean {
  return game.isActive
}

function profileMatchesAnySearchTerm(
  profile: SearchProfileRow,
  terms: string[]
): boolean {
  const item = toProfileSearchItem(profile)
  const exactTexts = item.exactTexts.map(normalizeForSearch)
  const prefixTexts = item.prefixTexts.map(normalizeForSearch)
  const normalizedText = normalizeForSearch(item.searchableText)
  return terms.some(
    (term) => rankTerm(term, exactTexts, prefixTexts, normalizedText) !== null
  )
}

function gameMatchesAnySearchTerm(
  game: SearchGameRow,
  terms: string[]
): boolean {
  const item = toGameSearchItem(game)
  const exactTexts = item.exactTexts.map(normalizeForSearch)
  const prefixTexts = item.prefixTexts.map(normalizeForSearch)
  const normalizedText = normalizeForSearch(item.searchableText)
  return terms.some(
    (term) => rankTerm(term, exactTexts, prefixTexts, normalizedText) !== null
  )
}

function toProfileSearchItem(profile: SearchProfileRow): SearchCandidate {
  const label = profile.displayName ?? profile.username
  return {
    type: "user",
    id: profile.id,
    label,
    href: `/@${profile.username}`,
    username: profile.username,
    exactTexts: [profile.username, label],
    prefixTexts: [profile.username, label],
    searchableText: [profile.username, label].join(" "),
    sortText: label,
  }
}

function toGameSearchItem(game: SearchGameRow): SearchCandidate {
  return {
    type: "game",
    id: game.id,
    label: game.name,
    href: `/game/${game.slug}`,
    slug: game.slug,
    exactTexts: [game.slug, game.name, ...game.aliases],
    prefixTexts: [game.slug, game.name, ...game.aliases],
    searchableText: [game.slug, game.name, ...game.aliases].join(" "),
    sortText: game.name,
  }
}

function rankItem(
  item: SearchCandidate,
  terms: string[]
): RankedSearchItem | null {
  const exactTexts = item.exactTexts.map(normalizeForSearch)
  const prefixTexts = item.prefixTexts.map(normalizeForSearch)
  const normalizedText = normalizeForSearch(item.searchableText)

  const ranks = terms
    .map((term) => rankTerm(term, exactTexts, prefixTexts, normalizedText))
    .filter((rank): rank is SearchRank => rank !== null)
  if (ranks.length === 0) return null

  return {
    type: item.type,
    id: item.id,
    label: item.label,
    href: item.href,
    ...(item.type === "user"
      ? { username: item.username }
      : { slug: item.slug }),
    searchableText: item.searchableText,
    sortText: item.sortText,
    rank: Math.min(...ranks) as SearchRank,
  } as RankedSearchItem
}

function rankTerm(
  term: string,
  exactTexts: string[],
  prefixTexts: string[],
  normalizedText: string
): SearchRank | null {
  if (exactTexts.includes(term)) return 0
  if (prefixTexts.some((text) => text.startsWith(term))) return 1
  if (normalizedText.includes(term)) return 2
  return null
}

function compareRankedSearchItems(
  left: RankedSearchItem,
  right: RankedSearchItem
): number {
  if (left.rank !== right.rank) return left.rank - right.rank
  const labelDifference = left.sortText.localeCompare(right.sortText, "en-US", {
    sensitivity: "base",
  })
  if (labelDifference !== 0) return labelDifference
  if (left.type !== right.type) return left.type.localeCompare(right.type)
  return left.id.localeCompare(right.id)
}

function toPublicSearchItem(item: RankedSearchItem): AppSearchResultItem {
  if (item.type === "user") {
    return toPublicUserSearchItem(item)
  }

  return toPublicGameSearchItem(item)
}

function toPublicUserSearchItem(
  item: RankedSearchItem & AppUserSearchResultItem
): AppUserSearchResultItem {
  return {
    type: "user",
    id: item.id,
    label: item.label,
    href: item.href,
    username: item.username,
  }
}

function toPublicGameSearchItem(
  item: RankedSearchItem & AppGameSearchResultItem
): AppGameSearchResultItem {
  return {
    type: "game",
    id: item.id,
    label: item.label,
    href: item.href,
    slug: item.slug,
  }
}

function emptySearchResult(): AppSearchResult {
  return {
    users: [],
    games: [],
    results: [],
  }
}
