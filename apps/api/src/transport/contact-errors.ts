import { TRPCError } from "@trpc/server";
import type { ContactSubmitError } from "../services/contact/index.js";

export function mapContactSubmitErrorToTRPC(
  error: ContactSubmitError,
): TRPCError {
  switch (error.kind) {
    case "missing_email":
    case "invalid_email":
    case "invalid_category":
    case "invalid_message":
      return new TRPCError({
        code: "BAD_REQUEST",
        message: error.message,
      });
    case "rate_limited":
      return new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `Too many contact submissions. Try again in ${error.retryAfterSeconds} seconds.`,
      });
    case "email_failed":
      return new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.message,
      });
  }
}
