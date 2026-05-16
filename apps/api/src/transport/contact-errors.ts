import type { ContactSubmitError } from "../services/contact/index.js"
import {
  toRestError,
  toTRPCError,
  type TransportErrorDescriptor,
} from "./errors.js"

export function mapContactSubmitErrorToTransport(
  error: ContactSubmitError
): TransportErrorDescriptor {
  switch (error.kind) {
    case "missing_email":
    case "invalid_email":
    case "invalid_category":
    case "invalid_message":
      return {
        trpcCode: "BAD_REQUEST",
        httpStatus: 400,
        publicCode: error.kind,
        message: error.message,
      }
    case "rate_limited":
      return {
        trpcCode: "TOO_MANY_REQUESTS",
        httpStatus: 429,
        publicCode: "contact_rate_limited",
        message: `Too many contact submissions. Try again in ${error.retryAfterSeconds} seconds.`,
      }
    case "email_failed":
      return {
        trpcCode: "INTERNAL_SERVER_ERROR",
        httpStatus: 500,
        publicCode: "contact_email_failed",
        message: error.message,
      }
  }
}

export function mapContactSubmitErrorToTRPC(error: ContactSubmitError) {
  return toTRPCError(mapContactSubmitErrorToTransport(error))
}

export function mapContactSubmitErrorToRest(error: ContactSubmitError) {
  return toRestError(mapContactSubmitErrorToTransport(error))
}
