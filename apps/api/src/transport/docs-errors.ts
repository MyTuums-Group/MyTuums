import { TRPCError } from "@trpc/server";
import { DocsAccessError, DocsPageNotFoundError } from "../services/docs/service.js";

export function mapDocsAccessErrorToTRPC(error: DocsAccessError): TRPCError {
  switch (error.kind) {
    case "unauthenticated":
      return new TRPCError({
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    case "inactive_account":
    case "unverified_account":
    case "forbidden_role":
      return new TRPCError({
        code: "FORBIDDEN",
        message: "Verified admin or owner access required.",
      });
  }
}

export function mapDocsPageErrorToTRPC(_error: DocsPageNotFoundError): TRPCError {
  return new TRPCError({
    code: "NOT_FOUND",
    message: "Document not found.",
  });
}
