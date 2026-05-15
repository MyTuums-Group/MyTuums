import type {
  FavoriteGameError,
  GameAccessError,
} from "../services/game/index.js";
import { toTRPCError, type TransportErrorDescriptor } from "./errors.js";

export function mapGameAccessErrorToTransport(
  error: GameAccessError
): TransportErrorDescriptor {
  switch (error.kind) {
    case "not_found":
      return {
        trpcCode: "NOT_FOUND",
        httpStatus: 404,
        publicCode: "game_not_found",
        message: "Game not found.",
      };
  }
}

export function mapFavoriteGameErrorToTransport(
  error: FavoriteGameError
): TransportErrorDescriptor {
  switch (error.kind) {
    case "not_found":
      return {
        trpcCode: "NOT_FOUND",
        httpStatus: 404,
        publicCode: "game_not_found",
        message: "Game not found.",
      };
    case "inactive_game":
      return {
        trpcCode: "BAD_REQUEST",
        httpStatus: 400,
        publicCode: "inactive_game",
        message: "Inactive games cannot be newly added to favorites.",
      };
    case "profile_required":
      return {
        trpcCode: "FORBIDDEN",
        httpStatus: 403,
        publicCode: "profile_required",
        message: "Complete your profile before choosing favorite games.",
      };
    case "too_many_favorites":
      return {
        trpcCode: "BAD_REQUEST",
        httpStatus: 400,
        publicCode: "too_many_favorites",
        message: "Choose at most 5 favorite games.",
      };
  }
}

export function mapGameAccessErrorToTRPC(error: GameAccessError) {
  return toTRPCError(mapGameAccessErrorToTransport(error));
}

export function mapFavoriteGameErrorToTRPC(error: FavoriteGameError) {
  return toTRPCError(mapFavoriteGameErrorToTransport(error));
}
