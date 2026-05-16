import type { MarkReadError } from "../services/notification/index.js"
import {
  toRestError,
  toTRPCError,
  type TransportErrorDescriptor,
} from "./errors.js"

export function mapNotificationMarkReadErrorToTransport(
  _error: MarkReadError
): TransportErrorDescriptor {
  return {
    trpcCode: "NOT_FOUND",
    httpStatus: 404,
    publicCode: "notification_not_found",
    message: "Notification not found.",
  }
}

export function mapNotificationMarkReadErrorToTRPC(error: MarkReadError) {
  return toTRPCError(mapNotificationMarkReadErrorToTransport(error))
}

export function mapNotificationMarkReadErrorToRest(error: MarkReadError) {
  return toRestError(mapNotificationMarkReadErrorToTransport(error))
}
