import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";
import { toRestError, toTRPCError, type TransportErrorDescriptor } from "../transport/errors.js";
import {
  mapOnboardingErrorToRest,
  mapOnboardingErrorToTRPC,
  mapProfileAccessErrorToRest,
  mapProfileAccessErrorToTRPC,
} from "../transport/profile-errors.js";

const invalidInputError: TransportErrorDescriptor = {
  trpcCode: "BAD_REQUEST",
  httpStatus: 400,
  publicCode: "invalid_input",
  message: "Invalid input.",
};

describe("transport error helpers", () => {
  it("maps a transport descriptor to a tRPC error", () => {
    const error = toTRPCError(invalidInputError);

    expect(error).toBeInstanceOf(TRPCError);
    expect(error.code).toBe("BAD_REQUEST");
    expect(error.message).toBe("Invalid input.");
  });

  it("maps a transport descriptor to a REST response shape", () => {
    expect(toRestError(invalidInputError)).toEqual({
      statusCode: 400,
      body: {
        error: {
          code: "invalid_input",
          message: "Invalid input.",
        },
      },
    });
  });
});

describe("profile onboarding transport mapping", () => {
  it("preserves invalid username details for tRPC and REST", () => {
    const domainError = {
      kind: "invalid_username",
      message: "Username must start with a letter.",
    } as const;

    const trpcError = mapOnboardingErrorToTRPC(domainError);
    const restError = mapOnboardingErrorToRest(domainError);

    expect(trpcError.code).toBe("BAD_REQUEST");
    expect(trpcError.message).toBe("Username must start with a letter.");
    expect(restError).toEqual({
      statusCode: 400,
      body: {
        error: {
          code: "invalid_username",
          message: "Username must start with a letter.",
        },
      },
    });
  });

  it("preserves invalid favorite game details for tRPC and REST", () => {
    const domainError = {
      kind: "invalid_favorite_games",
      message: "Choose at most 5 favorite games.",
    } as const;

    expect(mapOnboardingErrorToTRPC(domainError).code).toBe("BAD_REQUEST");
    expect(mapOnboardingErrorToRest(domainError)).toEqual({
      statusCode: 400,
      body: {
        error: {
          code: "invalid_favorite_games",
          message: "Choose at most 5 favorite games.",
        },
      },
    });
  });

  it("preserves invalid avatar media details for tRPC and REST", () => {
    const domainError = {
      kind: "invalid_avatar_media",
      message: "Avatar upload must finish before creating your profile.",
    } as const;

    expect(mapOnboardingErrorToTRPC(domainError).code).toBe("BAD_REQUEST");
    expect(mapOnboardingErrorToRest(domainError)).toEqual({
      statusCode: 400,
      body: {
        error: {
          code: "invalid_avatar_media",
          message: "Avatar upload must finish before creating your profile.",
        },
      },
    });
  });

  it("maps already-onboarded users consistently", () => {
    const domainError = { kind: "already_has_profile" } as const;

    const trpcError = mapOnboardingErrorToTRPC(domainError);

    expect(trpcError.code).toBe("CONFLICT");
    expect(trpcError.message).toBe("You already have a profile.");
    expect(mapOnboardingErrorToRest(domainError)).toEqual({
      statusCode: 409,
      body: {
        error: {
          code: "already_has_profile",
          message: "You already have a profile.",
        },
      },
    });
  });

  it("maps username conflicts consistently", () => {
    const domainError = { kind: "username_taken" } as const;

    const trpcError = mapOnboardingErrorToTRPC(domainError);

    expect(trpcError.code).toBe("CONFLICT");
    expect(trpcError.message).toBe("This username is already taken.");
    expect(mapOnboardingErrorToRest(domainError)).toEqual({
      statusCode: 409,
      body: {
        error: {
          code: "username_taken",
          message: "This username is already taken.",
        },
      },
    });
  });
});

describe("profile access transport mapping", () => {
  it("maps missing profiles consistently", () => {
    const domainError = { kind: "not_found" } as const;

    const trpcError = mapProfileAccessErrorToTRPC(domainError);

    expect(trpcError.code).toBe("NOT_FOUND");
    expect(trpcError.message).toBe("Profile not found.");
    expect(mapProfileAccessErrorToRest(domainError)).toEqual({
      statusCode: 404,
      body: {
        error: {
          code: "profile_not_found",
          message: "Profile not found.",
        },
      },
    });
  });

  it("maps hidden profiles consistently", () => {
    const domainError = { kind: "not_visible" } as const;

    const trpcError = mapProfileAccessErrorToTRPC(domainError);

    expect(trpcError.code).toBe("FORBIDDEN");
    expect(trpcError.message).toBe("This profile is not available.");
    expect(mapProfileAccessErrorToRest(domainError)).toEqual({
      statusCode: 403,
      body: {
        error: {
          code: "profile_not_visible",
          message: "This profile is not available.",
        },
      },
    });
  });
});
