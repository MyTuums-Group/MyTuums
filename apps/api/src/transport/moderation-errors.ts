import type {
  ModerationCaseCommandError,
  SubmitReportError,
} from "../services/moderation/index.js"
import {
  toRestError,
  toTRPCError,
  type TransportErrorDescriptor,
} from "./errors.js"

export function mapSubmitReportErrorToTransport(
  error: SubmitReportError
): TransportErrorDescriptor {
  switch (error.kind) {
    case "reporter_not_found":
      return {
        trpcCode: "UNAUTHORIZED",
        httpStatus: 401,
        publicCode: "authentication_required",
        message: "Authentication required.",
      }
    case "target_not_found":
    case "target_not_visible":
      return {
        trpcCode: "NOT_FOUND",
        httpStatus: 404,
        publicCode: "report_target_not_available",
        message: "This report target is not available.",
      }
    case "duplicate_report":
      return {
        trpcCode: "CONFLICT",
        httpStatus: 409,
        publicCode: "duplicate_report",
        message: "You already have an active report for this target.",
      }
  }
}

export function mapCaseCommandErrorToTransport(
  error: ModerationCaseCommandError
): TransportErrorDescriptor {
  switch (error.kind) {
    case "forbidden":
      return {
        trpcCode: "FORBIDDEN",
        httpStatus: 403,
        publicCode: "moderation_forbidden",
        message: "This moderation tool is not available.",
      }
    case "case_not_found":
    case "target_not_found":
      return {
        trpcCode: "NOT_FOUND",
        httpStatus: 404,
        publicCode: "moderation_case_not_available",
        message: "This moderation case is not available.",
      }
    case "assignee_not_found":
      return {
        trpcCode: "BAD_REQUEST",
        httpStatus: 400,
        publicCode: "assignee_not_found",
        message: "Assignee must be a staff user.",
      }
    case "internal_notes_required":
      return {
        trpcCode: "BAD_REQUEST",
        httpStatus: 400,
        publicCode: "internal_notes_required",
        message: "Internal notes are required.",
      }
    case "public_reason_required":
      return {
        trpcCode: "BAD_REQUEST",
        httpStatus: 400,
        publicCode: "public_reason_required",
        message: "A public reason is required for removal actions.",
      }
    case "invalid_action_for_target":
      return {
        trpcCode: "BAD_REQUEST",
        httpStatus: 400,
        publicCode: "invalid_action_for_target",
        message: "That moderation action cannot be used for this target.",
      }
    case "target_conflict":
      return {
        trpcCode: "CONFLICT",
        httpStatus: 409,
        publicCode: "moderation_target_conflict",
        message: "The target changed since this case was loaded.",
      }
  }
}

export function mapSubmitReportErrorToTRPC(error: SubmitReportError) {
  return toTRPCError(mapSubmitReportErrorToTransport(error))
}

export function mapCaseCommandErrorToTRPC(error: ModerationCaseCommandError) {
  return toTRPCError(mapCaseCommandErrorToTransport(error))
}

export function mapSubmitReportErrorToRest(error: SubmitReportError) {
  return toRestError(mapSubmitReportErrorToTransport(error))
}

export function mapCaseCommandErrorToRest(error: ModerationCaseCommandError) {
  return toRestError(mapCaseCommandErrorToTransport(error))
}
