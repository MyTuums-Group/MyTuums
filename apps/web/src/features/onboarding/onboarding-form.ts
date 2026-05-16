import { MAX_FAVORITE_GAMES } from "@workspace/types"

export type OnboardingFavoriteGame = {
  id: string
  slug: string
  name: string
}

export type AvatarUploadStatus = "idle" | "uploading" | "ready" | "failed"

export type OnboardingSubmitPayload = {
  username: string
  displayName?: string
  bio?: string
  favoriteGameIds: string[]
  avatarMediaId?: string
}

export function addFavoriteGameSelection(
  current: OnboardingFavoriteGame[],
  game: OnboardingFavoriteGame
): OnboardingFavoriteGame[] {
  if (current.length >= MAX_FAVORITE_GAMES) return current
  if (current.some((favorite) => favorite.id === game.id)) return current
  return [...current, game]
}

export function removeFavoriteGameSelection(
  current: OnboardingFavoriteGame[],
  gameId: string
): OnboardingFavoriteGame[] {
  return current.filter((game) => game.id !== gameId)
}

export function buildOnboardingPayload(input: {
  username: string
  displayName: string
  bio: string
  favoriteGames: OnboardingFavoriteGame[]
  avatarMediaId: string | null
}): OnboardingSubmitPayload {
  const payload: OnboardingSubmitPayload = {
    username: input.username.trim(),
    favoriteGameIds: input.favoriteGames.map((game) => game.id),
  }

  const displayName = input.displayName.trim()
  if (displayName) payload.displayName = displayName

  const bio = input.bio.trim()
  if (bio) payload.bio = bio

  if (input.avatarMediaId) payload.avatarMediaId = input.avatarMediaId

  return payload
}

export function getAvatarSubmitBlocker(
  avatarStatus: AvatarUploadStatus
): string | null {
  if (avatarStatus === "uploading") {
    return "Wait for the avatar upload to finish before creating your profile."
  }

  if (avatarStatus === "failed") {
    return "Remove the failed avatar upload or choose another image before creating your profile."
  }

  return null
}

export function isOnboardingSubmitDisabled(input: {
  isSubmitting: boolean
  avatarStatus: AvatarUploadStatus
}): boolean {
  return (
    input.isSubmitting || getAvatarSubmitBlocker(input.avatarStatus) !== null
  )
}
