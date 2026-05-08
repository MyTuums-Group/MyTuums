/**
 * Profile service — composes policy validation with data access.
 *
 * This is the deep module: callers (routers, REST endpoints) pass
 * plain data and receive domain results. No TRPCError, no tRPC
 * imports, no DB imports — those live in the adapter and router.
 */

import type { Result } from "@workspace/types";
import type { ViewerContext, AuthorizationAdapter } from "@workspace/types";
import { validateOnboardingInput } from "./profile.policy.js";
import * as adapter from "./profile.adapter.js";

// ── Domain error types ───────────────────────────────────────────────

export type OnboardingError =
  | { kind: "invalid_username"; message: string }
  | { kind: "already_has_profile" }
  | { kind: "username_taken" };

export type ProfileAccessError =
  | { kind: "not_found" }
  | { kind: "not_visible" };

// ── Public profile shape ─────────────────────────────────────────────

export type PublicProfile = {
  username: string;
  displayName: string | null;
  bio: string | null;
  createdAt: Date;
};

// ── Service functions ────────────────────────────────────────────────

/**
 * Create a profile during onboarding.
 *
 * Validates input through pure policy, checks the one-profile-per-user
 * constraint, and inserts. Race conditions on username uniqueness are
 * handled by the PostgreSQL unique constraint (error code 23505).
 */
export async function submitOnboarding(
  userId: string,
  input: { username: string; displayName?: string | null; bio?: string | null },
): Promise<Result<PublicProfile, OnboardingError>> {
  // 1. Pure validation (format, reserved names, length limits)
  const validated = validateOnboardingInput(input);
  if (!validated.ok) {
    return {
      ok: false,
      error: { kind: "invalid_username", message: validated.error.message },
    };
  }

  // 2. One profile per user
  const exists = await adapter.existsByUserId(userId);
  if (exists) {
    return { ok: false, error: { kind: "already_has_profile" } };
  }

  // 3. Insert — unique constraint on username catches races atomically
  try {
    const row = await adapter.insert({
      userId,
      username: validated.value.username,
      displayName: validated.value.displayName,
      bio: validated.value.bio,
    });
    return { ok: true, value: toPublicProfile(row) };
  } catch (err) {
    // PostgreSQL unique violation code 23505
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "23505"
    ) {
      return { ok: false, error: { kind: "username_taken" } };
    }
    throw err;
  }
}

/**
 * Fetch a public profile by username.
 *
 * Applies visibility rules through the authorization adapter.
 * Unauthenticated viewers (null ViewerContext) can see public profiles —
 * block and suspension checks only apply when a session is present.
 */
export async function getByUsername(
  username: string,
  viewerCtx: ViewerContext | null,
  authorization: AuthorizationAdapter,
): Promise<Result<PublicProfile, ProfileAccessError>> {
  const row = await adapter.findByUsername(username);
  if (!row) {
    return { ok: false, error: { kind: "not_found" } };
  }

  // Unauthenticated viewers see public profiles (CONTEXT.md: logged-out preview)
  if (viewerCtx) {
    const visible = authorization.canView(viewerCtx, {
      type: "profile",
      userId: row.userId,
    });
    if (!visible) {
      return { ok: false, error: { kind: "not_visible" } };
    }
  }

  return { ok: true, value: toPublicProfile(row) };
}

/**
 * Check if the authenticated user has a profile.
 * Used by onboarding redirect gates.
 */
export async function checkProfileExists(
  userId: string,
): Promise<{ hasProfile: boolean }> {
  const exists = await adapter.existsByUserId(userId);
  return { hasProfile: exists };
}

// ── Helpers ──────────────────────────────────────────────────────────

function toPublicProfile(row: adapter.ProfileRow): PublicProfile {
  return {
    username: row.username,
    displayName: row.displayName,
    bio: row.bio,
    createdAt: row.createdAt,
  };
}