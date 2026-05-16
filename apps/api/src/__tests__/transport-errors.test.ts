import { TRPCError } from "@trpc/server"
import { describe, expect, it } from "vitest"
import {
  toRestError,
  toTRPCError,
  type TransportErrorDescriptor,
} from "../transport/errors.js"
import {
  mapContactSubmitErrorToRest,
  mapContactSubmitErrorToTRPC,
} from "../transport/contact-errors.js"
import { mapFavoriteGameErrorToRest } from "../transport/game-errors.js"
import {
  mapMediaServiceErrorToRest,
  mapMediaServiceErrorToTRPC,
  mapMediaUploadGateErrorToRest,
} from "../transport/media-errors.js"
import {
  mapCaseCommandErrorToRest,
  mapSubmitReportErrorToTRPC,
} from "../transport/moderation-errors.js"
import { mapNotificationMarkReadErrorToRest } from "../transport/notification-errors.js"
import {
  mapPostAppStateErrorToTRPC,
  mapPostAvailabilityErrorToRest,
} from "../transport/post-errors.js"
import {
  mapOnboardingErrorToRest,
  mapOnboardingErrorToTRPC,
  mapProfileAccessErrorToRest,
  mapProfileAccessErrorToTRPC,
} from "../transport/profile-errors.js"
import {
  mapAccountDeletionErrorToRest,
  mapSettingsProfileErrorToTRPC,
} from "../transport/settings-errors.js"
import { mapStaffErrorToRest } from "../transport/staff-errors.js"

const invalidInputError: TransportErrorDescriptor = {
  trpcCode: "BAD_REQUEST",
  httpStatus: 400,
  publicCode: "invalid_input",
  message: "Invalid input.",
}

describe("transport error helpers", () => {
  it("maps a transport descriptor to a tRPC error", () => {
    const error = toTRPCError(invalidInputError)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe("BAD_REQUEST")
    expect(error.message).toBe("Invalid input.")
  })

  it("maps a transport descriptor to a REST response shape", () => {
    expect(toRestError(invalidInputError)).toEqual({
      statusCode: 400,
      body: {
        error: {
          code: "invalid_input",
          message: "Invalid input.",
        },
      },
    })
  })
})

describe("profile onboarding transport mapping", () => {
  it("preserves invalid username details for tRPC and REST", () => {
    const domainError = {
      kind: "invalid_username",
      message: "Username must start with a letter.",
    } as const

    const trpcError = mapOnboardingErrorToTRPC(domainError)
    const restError = mapOnboardingErrorToRest(domainError)

    expect(trpcError.code).toBe("BAD_REQUEST")
    expect(trpcError.message).toBe("Username must start with a letter.")
    expect(restError).toEqual({
      statusCode: 400,
      body: {
        error: {
          code: "invalid_username",
          message: "Username must start with a letter.",
        },
      },
    })
  })

  it("preserves invalid favorite game details for tRPC and REST", () => {
    const domainError = {
      kind: "invalid_favorite_games",
      message: "Choose at most 5 favorite games.",
    } as const

    expect(mapOnboardingErrorToTRPC(domainError).code).toBe("BAD_REQUEST")
    expect(mapOnboardingErrorToRest(domainError)).toEqual({
      statusCode: 400,
      body: {
        error: {
          code: "invalid_favorite_games",
          message: "Choose at most 5 favorite games.",
        },
      },
    })
  })

  it("preserves invalid avatar media details for tRPC and REST", () => {
    const domainError = {
      kind: "invalid_avatar_media",
      message: "Avatar upload must finish before creating your profile.",
    } as const

    expect(mapOnboardingErrorToTRPC(domainError).code).toBe("BAD_REQUEST")
    expect(mapOnboardingErrorToRest(domainError)).toEqual({
      statusCode: 400,
      body: {
        error: {
          code: "invalid_avatar_media",
          message: "Avatar upload must finish before creating your profile.",
        },
      },
    })
  })

  it("maps already-onboarded users consistently", () => {
    const domainError = { kind: "already_has_profile" } as const

    const trpcError = mapOnboardingErrorToTRPC(domainError)

    expect(trpcError.code).toBe("CONFLICT")
    expect(trpcError.message).toBe("You already have a profile.")
    expect(mapOnboardingErrorToRest(domainError)).toEqual({
      statusCode: 409,
      body: {
        error: {
          code: "already_has_profile",
          message: "You already have a profile.",
        },
      },
    })
  })

  it("maps username conflicts consistently", () => {
    const domainError = { kind: "username_taken" } as const

    const trpcError = mapOnboardingErrorToTRPC(domainError)

    expect(trpcError.code).toBe("CONFLICT")
    expect(trpcError.message).toBe("This username is already taken.")
    expect(mapOnboardingErrorToRest(domainError)).toEqual({
      statusCode: 409,
      body: {
        error: {
          code: "username_taken",
          message: "This username is already taken.",
        },
      },
    })
  })
})

describe("profile access transport mapping", () => {
  it("maps missing profiles consistently", () => {
    const domainError = { kind: "not_found" } as const

    const trpcError = mapProfileAccessErrorToTRPC(domainError)

    expect(trpcError.code).toBe("NOT_FOUND")
    expect(trpcError.message).toBe("Profile not found.")
    expect(mapProfileAccessErrorToRest(domainError)).toEqual({
      statusCode: 404,
      body: {
        error: {
          code: "profile_not_found",
          message: "Profile not found.",
        },
      },
    })
  })

  it("maps hidden profiles consistently", () => {
    const domainError = { kind: "not_visible" } as const

    const trpcError = mapProfileAccessErrorToTRPC(domainError)

    expect(trpcError.code).toBe("FORBIDDEN")
    expect(trpcError.message).toBe("This profile is not available.")
    expect(mapProfileAccessErrorToRest(domainError)).toEqual({
      statusCode: 403,
      body: {
        error: {
          code: "profile_not_visible",
          message: "This profile is not available.",
        },
      },
    })
  })
})

describe("module transport mappings", () => {
  it("maps contact rate limits through descriptors", () => {
    const trpcError = mapContactSubmitErrorToTRPC({
      kind: "rate_limited",
      retryAfterSeconds: 42,
    })

    expect(trpcError.code).toBe("TOO_MANY_REQUESTS")
    expect(trpcError.message).toBe(
      "Too many contact submissions. Try again in 42 seconds."
    )
    expect(
      mapContactSubmitErrorToRest({
        kind: "invalid_message",
        message: "Message is required.",
      })
    ).toEqual({
      statusCode: 400,
      body: {
        error: {
          code: "invalid_message",
          message: "Message is required.",
        },
      },
    })
  })

  it("keeps media service messages as stable machine-readable kinds", () => {
    const trpcError = mapMediaServiceErrorToTRPC({
      kind: "invalid_mime_type",
      message: "MIME type is not allowed.",
    })

    expect(trpcError.code).toBe("BAD_REQUEST")
    expect(trpcError.message).toBe("invalid_mime_type")
    expect(mapMediaServiceErrorToRest({ kind: "media_expired" })).toEqual({
      statusCode: 409,
      body: {
        error: {
          code: "media_expired",
          message: "media_expired",
        },
      },
    })
  })

  it("maps media upload gates separately from service errors", () => {
    expect(mapMediaUploadGateErrorToRest({ kind: "launch_not_ready" })).toEqual(
      {
        statusCode: 403,
        body: {
          error: {
            code: "media_uploads_disabled",
            message:
              "Media uploads are disabled until launch readiness gates pass.",
          },
        },
      }
    )
  })

  it("maps moderation report and case command errors", () => {
    const trpcError = mapSubmitReportErrorToTRPC({
      kind: "duplicate_report",
    })

    expect(trpcError.code).toBe("CONFLICT")
    expect(trpcError.message).toBe(
      "You already have an active report for this target."
    )
    expect(mapCaseCommandErrorToRest({ kind: "target_conflict" })).toEqual({
      statusCode: 409,
      body: {
        error: {
          code: "moderation_target_conflict",
          message: "The target changed since this case was loaded.",
        },
      },
    })
  })

  it("maps settings and account-deletion errors", () => {
    const trpcError = mapSettingsProfileErrorToTRPC({
      kind: "media_attachment_failed",
      slot: "avatar",
      reason: "wrong_owner",
    })

    expect(trpcError.code).toBe("BAD_REQUEST")
    expect(trpcError.message).toBe("Could not attach avatar media: wrong_owner")
    expect(
      mapAccountDeletionErrorToRest({ kind: "owner_cannot_self_delete" })
    ).toEqual({
      statusCode: 403,
      body: {
        error: {
          code: "owner_cannot_self_delete",
          message: "Owner accounts cannot be self-deleted.",
        },
      },
    })
  })

  it("maps staff service errors without importing tRPC in routers", () => {
    expect(mapStaffErrorToRest({ kind: "staff_access_not_allowed" })).toEqual({
      statusCode: 403,
      body: {
        error: {
          code: "staff_access_not_allowed",
          message: "staff_access_not_allowed",
        },
      },
    })
  })

  it("maps game errors to REST through descriptors", () => {
    expect(mapFavoriteGameErrorToRest({ kind: "inactive_game" })).toEqual({
      statusCode: 400,
      body: {
        error: {
          code: "inactive_game",
          message: "Inactive games cannot be newly added to favorites.",
        },
      },
    })
  })

  it("maps post route presentation and availability errors", () => {
    const trpcError = mapPostAppStateErrorToTRPC({
      kind: "profile_required_for_comment",
    })

    expect(trpcError.code).toBe("FORBIDDEN")
    expect(trpcError.message).toBe(
      "You need a verified onboarded profile to comment."
    )
    expect(
      mapPostAvailabilityErrorToRest({ kind: "post_not_available" })
    ).toEqual({
      statusCode: 404,
      body: {
        error: {
          code: "post_not_available",
          message: "This post is not available.",
        },
      },
    })
  })

  it("maps notification command errors", () => {
    expect(mapNotificationMarkReadErrorToRest({ kind: "not_found" })).toEqual({
      statusCode: 404,
      body: {
        error: {
          code: "notification_not_found",
          message: "Notification not found.",
        },
      },
    })
  })
})
