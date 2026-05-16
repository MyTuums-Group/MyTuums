import type {
  BlockUserError,
  ToggleCommentLikeError,
  ToggleFollowError,
  TogglePostLikeError,
} from "../services/engagement/index.js"
import {
  toRestError,
  toTRPCError,
  type TransportErrorDescriptor,
} from "./errors.js"

export function mapToggleLikeErrorToTransport(
  error: TogglePostLikeError | ToggleCommentLikeError
): TransportErrorDescriptor {
  switch (error.kind) {
    case "not_found":
    case "not_available":
      return {
        trpcCode: "NOT_FOUND",
        httpStatus: 404,
        publicCode: "engagement_target_not_available",
        message: "This target is not available.",
      }
    case "blocked":
      return {
        trpcCode: "FORBIDDEN",
        httpStatus: 403,
        publicCode: "engagement_blocked",
        message: "This action is not available between blocked users.",
      }
  }
}

export function mapToggleFollowErrorToTransport(
  error: ToggleFollowError
): TransportErrorDescriptor {
  switch (error.kind) {
    case "not_found":
      return {
        trpcCode: "NOT_FOUND",
        httpStatus: 404,
        publicCode: "profile_not_available",
        message: "This profile is not available.",
      }
    case "self_follow":
      return {
        trpcCode: "BAD_REQUEST",
        httpStatus: 400,
        publicCode: "self_follow",
        message: "You cannot follow yourself.",
      }
    case "blocked":
      return {
        trpcCode: "FORBIDDEN",
        httpStatus: 403,
        publicCode: "engagement_blocked",
        message: "This action is not available between blocked users.",
      }
  }
}

export function mapBlockUserErrorToTransport(
  error: BlockUserError
): TransportErrorDescriptor {
  switch (error.kind) {
    case "not_found":
      return {
        trpcCode: "NOT_FOUND",
        httpStatus: 404,
        publicCode: "profile_not_available",
        message: "This profile is not available.",
      }
    case "self_block":
      return {
        trpcCode: "BAD_REQUEST",
        httpStatus: 400,
        publicCode: "self_block",
        message: "You cannot block yourself.",
      }
  }
}

export function mapProfileEngagementUnavailableToTransport(): TransportErrorDescriptor {
  return {
    trpcCode: "NOT_FOUND",
    httpStatus: 404,
    publicCode: "profile_not_available",
    message: "This profile is not available.",
  }
}

export function mapToggleLikeErrorToTRPC(
  error: TogglePostLikeError | ToggleCommentLikeError
) {
  return toTRPCError(mapToggleLikeErrorToTransport(error))
}

export function mapToggleFollowErrorToTRPC(error: ToggleFollowError) {
  return toTRPCError(mapToggleFollowErrorToTransport(error))
}

export function mapBlockUserErrorToTRPC(error: BlockUserError) {
  return toTRPCError(mapBlockUserErrorToTransport(error))
}

export function mapProfileEngagementUnavailableToTRPC() {
  return toTRPCError(mapProfileEngagementUnavailableToTransport())
}

export function mapToggleLikeErrorToRest(
  error: TogglePostLikeError | ToggleCommentLikeError
) {
  return toRestError(mapToggleLikeErrorToTransport(error))
}

export function mapToggleFollowErrorToRest(error: ToggleFollowError) {
  return toRestError(mapToggleFollowErrorToTransport(error))
}

export function mapBlockUserErrorToRest(error: BlockUserError) {
  return toRestError(mapBlockUserErrorToTransport(error))
}

export function mapProfileEngagementUnavailableToRest() {
  return toRestError(mapProfileEngagementUnavailableToTransport())
}
