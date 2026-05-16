import {
  DocsAccessError,
  DocsDiagramNotFoundError,
  DocsPageNotFoundError,
} from "../services/docs/service.js"
import {
  toRestError,
  toTRPCError,
  type TransportErrorDescriptor,
} from "./errors.js"

export function mapDocsAccessErrorToTransport(
  error: DocsAccessError
): TransportErrorDescriptor {
  switch (error.kind) {
    case "unauthenticated":
      return {
        trpcCode: "UNAUTHORIZED",
        httpStatus: 401,
        publicCode: "docs_authentication_required",
        message: "Authentication required",
      }
    case "inactive_account":
    case "unverified_account":
    case "forbidden_role":
      return {
        trpcCode: "FORBIDDEN",
        httpStatus: 403,
        publicCode: "docs_access_forbidden",
        message: "Verified admin or owner access required.",
      }
  }
}

export function mapDocsPageErrorToTransport(
  _error: DocsPageNotFoundError
): TransportErrorDescriptor {
  return {
    trpcCode: "NOT_FOUND",
    httpStatus: 404,
    publicCode: "docs_page_not_found",
    message: "Document not found.",
  }
}

export function mapDocsDiagramErrorToTransport(
  _error: DocsDiagramNotFoundError
): TransportErrorDescriptor {
  return {
    trpcCode: "NOT_FOUND",
    httpStatus: 404,
    publicCode: "docs_diagram_not_found",
    message: "Diagram not found.",
  }
}

export function mapDocsAccessErrorToTRPC(error: DocsAccessError) {
  return toTRPCError(mapDocsAccessErrorToTransport(error))
}

export function mapDocsPageErrorToTRPC(error: DocsPageNotFoundError) {
  return toTRPCError(mapDocsPageErrorToTransport(error))
}

export function mapDocsDiagramErrorToTRPC(error: DocsDiagramNotFoundError) {
  return toTRPCError(mapDocsDiagramErrorToTransport(error))
}

export function mapDocsAccessErrorToRest(error: DocsAccessError) {
  return toRestError(mapDocsAccessErrorToTransport(error))
}

export function mapDocsPageErrorToRest(error: DocsPageNotFoundError) {
  return toRestError(mapDocsPageErrorToTransport(error))
}

export function mapDocsDiagramErrorToRest(error: DocsDiagramNotFoundError) {
  return toRestError(mapDocsDiagramErrorToTransport(error))
}
