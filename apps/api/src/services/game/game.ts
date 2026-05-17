import type { GameSlug } from "@workspace/types"
import { createGameService } from "./game.core.js"
import * as adapter from "./game.adapter.js"

const service = createGameService(adapter)

export function getBySlug(slug: GameSlug, viewerUserId: string | null) {
  return service.getBySlug(slug, viewerUserId)
}

export function listActive() {
  return service.listActive()
}

export function listFavoritesByUserId(userId: string) {
  return service.listFavoritesByUserId(userId)
}

export function setFavorite(input: {
  userId: string
  slug: GameSlug
  favorite: boolean
}) {
  return service.setFavorite(input)
}
