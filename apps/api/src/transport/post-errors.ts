import type {
  CreatePostError,
  DeleteOwnPostError,
} from "../services/post/index.js";
import {
  toRestError,
  toTRPCError,
  type TransportErrorDescriptor,
} from "./errors.js";

export function mapCreatePostErrorToTransport(
  error: CreatePostError,
): TransportErrorDescriptor {
  switch (error.kind) {
    case "invalid_post_body":
      return {
        trpcCode: "BAD_REQUEST",
        httpStatus: 400,
        publicCode: "invalid_post_body",
        message: error.message,
      };
    case "invalid_game_tag":
      return {
        trpcCode: "BAD_REQUEST",
        httpStatus: 400,
        publicCode: "invalid_game_tag",
        message: "Game tag must reference an active game.",
      };
    case "invalid_media_attachment":
      return {
        trpcCode: "CONFLICT",
        httpStatus: 409,
        publicCode: "invalid_media_attachment",
        message: "Media must be ready, owned by you, and available for post attachment.",
      };
  }
}

export function mapDeleteOwnPostErrorToTransport(
  error: DeleteOwnPostError,
): TransportErrorDescriptor {
  switch (error.kind) {
    case "not_found":
      return {
        trpcCode: "NOT_FOUND",
        httpStatus: 404,
        publicCode: "post_not_found",
        message: "Post not found.",
      };
    case "forbidden":
      return {
        trpcCode: "FORBIDDEN",
        httpStatus: 403,
        publicCode: "post_forbidden",
        message: "You can only delete your own posts.",
      };
    case "already_deleted":
      return {
        trpcCode: "CONFLICT",
        httpStatus: 409,
        publicCode: "post_already_deleted",
        message: "This post has already been deleted.",
      };
  }
}

export function mapCreatePostErrorToTRPC(error: CreatePostError) {
  return toTRPCError(mapCreatePostErrorToTransport(error));
}

export function mapDeleteOwnPostErrorToTRPC(error: DeleteOwnPostError) {
  return toTRPCError(mapDeleteOwnPostErrorToTransport(error));
}

export function mapCreatePostErrorToRest(error: CreatePostError) {
  return toRestError(mapCreatePostErrorToTransport(error));
}

export function mapDeleteOwnPostErrorToRest(error: DeleteOwnPostError) {
  return toRestError(mapDeleteOwnPostErrorToTransport(error));
}
