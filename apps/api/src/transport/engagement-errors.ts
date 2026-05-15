import { TRPCError } from "@trpc/server";
import type {
  BlockUserError,
  ToggleCommentLikeError,
  ToggleFollowError,
  TogglePostLikeError,
} from "../services/engagement/index.js";

export function mapToggleLikeErrorToTRPC(
  error: TogglePostLikeError | ToggleCommentLikeError,
): TRPCError {
  switch (error.kind) {
    case "not_found":
    case "not_available":
      return new TRPCError({
        code: "NOT_FOUND",
        message: "This target is not available.",
      });
    case "blocked":
      return new TRPCError({
        code: "FORBIDDEN",
        message: "This action is not available between blocked users.",
      });
  }
}

export function mapToggleFollowErrorToTRPC(error: ToggleFollowError): TRPCError {
  switch (error.kind) {
    case "not_found":
      return new TRPCError({
        code: "NOT_FOUND",
        message: "This profile is not available.",
      });
    case "self_follow":
      return new TRPCError({
        code: "BAD_REQUEST",
        message: "You cannot follow yourself.",
      });
    case "blocked":
      return new TRPCError({
        code: "FORBIDDEN",
        message: "This action is not available between blocked users.",
      });
  }
}

export function mapBlockUserErrorToTRPC(error: BlockUserError): TRPCError {
  switch (error.kind) {
    case "not_found":
      return new TRPCError({
        code: "NOT_FOUND",
        message: "This profile is not available.",
      });
    case "self_block":
      return new TRPCError({
        code: "BAD_REQUEST",
        message: "You cannot block yourself.",
      });
  }
}
