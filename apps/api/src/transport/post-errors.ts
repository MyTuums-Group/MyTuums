import type {
  CreatePostError,
  DeleteOwnPostError,
} from "../services/post/index.js"
import {
  toRestError,
  toTRPCError,
  type TransportErrorDescriptor,
} from "./errors.js"

export type PostAvailabilityError = { kind: "post_not_available" }

export type DiscoverFeedFilterError = { kind: "inactive_game_filter" }

export type PostAppStateError =
  | { kind: "profile_required_for_post" }
  | { kind: "profile_required_for_comment" }

export type PostPresentationError =
  | { kind: "invalid_feed_cursor"; message: string }
  | { kind: "invalid_comment_cursor"; message: string }
  | { kind: "created_post_unavailable" }

export function mapCreatePostErrorToTransport(
  error: CreatePostError
): TransportErrorDescriptor {
  switch (error.kind) {
    case "invalid_post_body":
      return {
        trpcCode: "BAD_REQUEST",
        httpStatus: 400,
        publicCode: "invalid_post_body",
        message: error.message,
      }
    case "invalid_game_tag":
      return {
        trpcCode: "BAD_REQUEST",
        httpStatus: 400,
        publicCode: "invalid_game_tag",
        message: "Game tag must reference an active game.",
      }
    case "invalid_media_attachment":
      return {
        trpcCode: "CONFLICT",
        httpStatus: 409,
        publicCode: "invalid_media_attachment",
        message:
          "Media must be ready, owned by you, and available for post attachment.",
      }
  }
}

export function mapDeleteOwnPostErrorToTransport(
  error: DeleteOwnPostError
): TransportErrorDescriptor {
  switch (error.kind) {
    case "not_found":
      return {
        trpcCode: "NOT_FOUND",
        httpStatus: 404,
        publicCode: "post_not_found",
        message: "Post not found.",
      }
    case "forbidden":
      return {
        trpcCode: "FORBIDDEN",
        httpStatus: 403,
        publicCode: "post_forbidden",
        message: "You can only delete your own posts.",
      }
    case "already_deleted":
      return {
        trpcCode: "CONFLICT",
        httpStatus: 409,
        publicCode: "post_already_deleted",
        message: "This post has already been deleted.",
      }
  }
}

export function mapPostAvailabilityErrorToTransport(
  _error: PostAvailabilityError
): TransportErrorDescriptor {
  return {
    trpcCode: "NOT_FOUND",
    httpStatus: 404,
    publicCode: "post_not_available",
    message: "This post is not available.",
  }
}

export function mapDiscoverFeedFilterErrorToTransport(
  _error: DiscoverFeedFilterError
): TransportErrorDescriptor {
  return {
    trpcCode: "BAD_REQUEST",
    httpStatus: 400,
    publicCode: "inactive_game_filter",
    message: "Choose an active game from the catalog to filter Discover.",
  }
}

export function mapPostAppStateErrorToTransport(
  error: PostAppStateError
): TransportErrorDescriptor {
  switch (error.kind) {
    case "profile_required_for_post":
      return {
        trpcCode: "FORBIDDEN",
        httpStatus: 403,
        publicCode: "profile_required",
        message: "You need a verified onboarded profile to create posts.",
      }
    case "profile_required_for_comment":
      return {
        trpcCode: "FORBIDDEN",
        httpStatus: 403,
        publicCode: "profile_required",
        message: "You need a verified onboarded profile to comment.",
      }
  }
}

export function mapPostPresentationErrorToTransport(
  error: PostPresentationError
): TransportErrorDescriptor {
  switch (error.kind) {
    case "invalid_feed_cursor":
      return {
        trpcCode: "BAD_REQUEST",
        httpStatus: 400,
        publicCode: "invalid_feed_cursor",
        message: error.message,
      }
    case "invalid_comment_cursor":
      return {
        trpcCode: "BAD_REQUEST",
        httpStatus: 400,
        publicCode: "invalid_comment_cursor",
        message: error.message,
      }
    case "created_post_unavailable":
      return {
        trpcCode: "INTERNAL_SERVER_ERROR",
        httpStatus: 500,
        publicCode: "created_post_unavailable",
        message: "Created post could not be loaded.",
      }
  }
}

export function mapCreatePostErrorToTRPC(error: CreatePostError) {
  return toTRPCError(mapCreatePostErrorToTransport(error))
}

export function mapDeleteOwnPostErrorToTRPC(error: DeleteOwnPostError) {
  return toTRPCError(mapDeleteOwnPostErrorToTransport(error))
}

export function mapPostAvailabilityErrorToTRPC(error: PostAvailabilityError) {
  return toTRPCError(mapPostAvailabilityErrorToTransport(error))
}

export function mapDiscoverFeedFilterErrorToTRPC(
  error: DiscoverFeedFilterError
) {
  return toTRPCError(mapDiscoverFeedFilterErrorToTransport(error))
}

export function mapPostAppStateErrorToTRPC(error: PostAppStateError) {
  return toTRPCError(mapPostAppStateErrorToTransport(error))
}

export function mapPostPresentationErrorToTRPC(error: PostPresentationError) {
  return toTRPCError(mapPostPresentationErrorToTransport(error))
}

export function mapCreatePostErrorToRest(error: CreatePostError) {
  return toRestError(mapCreatePostErrorToTransport(error))
}

export function mapDeleteOwnPostErrorToRest(error: DeleteOwnPostError) {
  return toRestError(mapDeleteOwnPostErrorToTransport(error))
}

export function mapPostAvailabilityErrorToRest(error: PostAvailabilityError) {
  return toRestError(mapPostAvailabilityErrorToTransport(error))
}

export function mapDiscoverFeedFilterErrorToRest(
  error: DiscoverFeedFilterError
) {
  return toRestError(mapDiscoverFeedFilterErrorToTransport(error))
}

export function mapPostAppStateErrorToRest(error: PostAppStateError) {
  return toRestError(mapPostAppStateErrorToTransport(error))
}

export function mapPostPresentationErrorToRest(error: PostPresentationError) {
  return toRestError(mapPostPresentationErrorToTransport(error))
}
