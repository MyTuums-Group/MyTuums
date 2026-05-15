import type {
  CreateCommentError,
  DeleteOwnCommentError,
  ToggleCommentLikeError,
} from "../services/comment/index.js";
import {
  toRestError,
  toTRPCError,
  type TransportErrorDescriptor,
} from "./errors.js";

export function mapCreateCommentErrorToTransport(
  error: CreateCommentError,
): TransportErrorDescriptor {
  switch (error.kind) {
    case "invalid_comment_body":
      return {
        trpcCode: "BAD_REQUEST",
        httpStatus: 400,
        publicCode: "invalid_comment_body",
        message: error.message,
      };
    case "post_not_found":
      return {
        trpcCode: "NOT_FOUND",
        httpStatus: 404,
        publicCode: "post_not_found",
        message: "Post not found.",
      };
  }
}

export function mapDeleteOwnCommentErrorToTransport(
  error: DeleteOwnCommentError,
): TransportErrorDescriptor {
  switch (error.kind) {
    case "not_found":
      return {
        trpcCode: "NOT_FOUND",
        httpStatus: 404,
        publicCode: "comment_not_found",
        message: "Comment not found.",
      };
    case "forbidden":
      return {
        trpcCode: "FORBIDDEN",
        httpStatus: 403,
        publicCode: "comment_forbidden",
        message: "You can only delete your own comments.",
      };
    case "already_deleted":
      return {
        trpcCode: "CONFLICT",
        httpStatus: 409,
        publicCode: "comment_already_deleted",
        message: "This comment has already been deleted.",
      };
  }
}

export function mapToggleCommentLikeErrorToTransport(
  error: ToggleCommentLikeError,
): TransportErrorDescriptor {
  switch (error.kind) {
    case "not_found":
      return {
        trpcCode: "NOT_FOUND",
        httpStatus: 404,
        publicCode: "comment_not_found",
        message: "Comment not found.",
      };
  }
}

export function mapCreateCommentErrorToTRPC(error: CreateCommentError) {
  return toTRPCError(mapCreateCommentErrorToTransport(error));
}

export function mapDeleteOwnCommentErrorToTRPC(error: DeleteOwnCommentError) {
  return toTRPCError(mapDeleteOwnCommentErrorToTransport(error));
}

export function mapToggleCommentLikeErrorToTRPC(error: ToggleCommentLikeError) {
  return toTRPCError(mapToggleCommentLikeErrorToTransport(error));
}

export function mapCreateCommentErrorToRest(error: CreateCommentError) {
  return toRestError(mapCreateCommentErrorToTransport(error));
}

export function mapDeleteOwnCommentErrorToRest(error: DeleteOwnCommentError) {
  return toRestError(mapDeleteOwnCommentErrorToTransport(error));
}

export function mapToggleCommentLikeErrorToRest(error: ToggleCommentLikeError) {
  return toRestError(mapToggleCommentLikeErrorToTransport(error));
}
