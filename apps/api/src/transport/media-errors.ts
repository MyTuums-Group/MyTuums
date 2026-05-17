import type {
  AttachmentError,
  ConfirmError,
  ReissueError,
  SignReadError,
  UploadIntentError,
} from "../services/media/index.js"
import {
  toRestError,
  toTRPCError,
  type TransportErrorDescriptor,
} from "./errors.js"

export type MediaServiceError =
  | UploadIntentError
  | ConfirmError
  | ReissueError
  | AttachmentError
  | SignReadError

export type MediaUploadGateError =
  | { kind: "launch_not_ready" }
  | { kind: "profile_required" }

export function mapMediaServiceErrorToTransport(
  error: MediaServiceError
): TransportErrorDescriptor {
  switch (error.kind) {
    case "invalid_mime_type":
    case "file_too_large":
    case "invalid_purpose":
      return {
        trpcCode: "BAD_REQUEST",
        httpStatus: 400,
        publicCode: error.kind,
        message: error.message,
      }
    case "blob_size_mismatch":
    case "blob_type_mismatch":
      return {
        trpcCode: "BAD_REQUEST",
        httpStatus: 400,
        publicCode: error.kind,
        message: error.kind,
      }
    case "media_not_found":
    case "blob_not_found":
      return {
        trpcCode: "NOT_FOUND",
        httpStatus: 404,
        publicCode: error.kind,
        message: error.kind,
      }
    case "wrong_owner":
      return {
        trpcCode: "FORBIDDEN",
        httpStatus: 403,
        publicCode: error.kind,
        message: error.kind,
      }
    case "wrong_purpose":
    case "media_not_pending":
    case "media_not_ready":
    case "media_expired":
    case "already_attached":
    case "media_not_accessible":
      return {
        trpcCode: "CONFLICT",
        httpStatus: 409,
        publicCode: error.kind,
        message: error.kind,
      }
  }
}

export function mapMediaUploadGateErrorToTransport(
  error: MediaUploadGateError
): TransportErrorDescriptor {
  switch (error.kind) {
    case "launch_not_ready":
      return {
        trpcCode: "FORBIDDEN",
        httpStatus: 403,
        publicCode: "media_uploads_disabled",
        message:
          "Media uploads are disabled until launch readiness gates pass.",
      }
    case "profile_required":
      return {
        trpcCode: "FORBIDDEN",
        httpStatus: 403,
        publicCode: "profile_required",
        message: "You need a verified onboarded profile to upload media.",
      }
  }
}

export function mapMediaServiceErrorToTRPC(error: MediaServiceError) {
  return toTRPCError(mapMediaServiceErrorToTransport(error))
}

export function mapMediaUploadGateErrorToTRPC(error: MediaUploadGateError) {
  return toTRPCError(mapMediaUploadGateErrorToTransport(error))
}

export function mapMediaServiceErrorToRest(error: MediaServiceError) {
  return toRestError(mapMediaServiceErrorToTransport(error))
}

export function mapMediaUploadGateErrorToRest(error: MediaUploadGateError) {
  return toRestError(mapMediaUploadGateErrorToTransport(error))
}
