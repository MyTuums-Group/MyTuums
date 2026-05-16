import type {
  ChangeRoleError,
  OwnerBootstrapError,
  StaffReadError,
  SuspendUserError,
} from "../services/staff/index.js"
import {
  toRestError,
  toTRPCError,
  type TransportErrorDescriptor,
} from "./errors.js"

export type StaffServiceError =
  | ChangeRoleError
  | SuspendUserError
  | OwnerBootstrapError
  | StaffReadError

export function mapStaffErrorToTransport(
  error: StaffServiceError
): TransportErrorDescriptor {
  switch (error.kind) {
    case "actor_not_found":
    case "invalid_secret":
      return {
        trpcCode: "UNAUTHORIZED",
        httpStatus: 401,
        publicCode: error.kind,
        message: error.kind,
      }
    case "target_not_found":
    case "user_not_found":
      return {
        trpcCode: "NOT_FOUND",
        httpStatus: 404,
        publicCode: error.kind,
        message: error.kind,
      }
    case "internal_notes_required":
      return {
        trpcCode: "BAD_REQUEST",
        httpStatus: 400,
        publicCode: "internal_notes_required",
        message: error.kind,
      }
    case "user_not_verified":
    case "owner_already_exists":
    case "role_change_not_allowed":
    case "staff_access_not_allowed":
    case "suspension_not_allowed":
      return {
        trpcCode: "FORBIDDEN",
        httpStatus: 403,
        publicCode: error.kind,
        message: error.kind,
      }
  }
}

export function mapStaffErrorToTRPC(error: StaffServiceError) {
  return toTRPCError(mapStaffErrorToTransport(error))
}

export function mapStaffErrorToRest(error: StaffServiceError) {
  return toRestError(mapStaffErrorToTransport(error))
}
