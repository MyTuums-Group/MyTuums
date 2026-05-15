import type { AccountStatus, UserRole } from "@workspace/types";

export const ACCOUNT_DELETION_USERNAME_HOLD_DAYS = 7;
export const ACCOUNT_DELETION_EMAIL_HOLD_DAYS = 7;

export const ACCOUNT_STATUS_SESSION_INVALIDATION_REASONS = [
  "status_changed",
  "account_deleted",
  "password_changed",
  "role_changed",
] as const;

export type AccountSessionInvalidationReason =
  | (typeof ACCOUNT_STATUS_SESSION_INVALIDATION_REASONS)[number]
  | "profile_updated";

export type AccountAction =
  | "protected_action"
  | "create_post"
  | "update_profile"
  | "delete_account"
  | "view_account_status"
  | "contact_support"
  | "logout";

export interface AccountLifecycleSnapshot {
  status: AccountStatus;
  role: UserRole;
  suspendedUntil: Date | null;
  suspensionPublicReason?: string | null;
  deletedAt: Date | null;
}

export interface EffectiveAccountStatus {
  status: AccountStatus;
  expiredTemporarySuspension: boolean;
}

export type SelfDeletionDecision =
  | { allowed: true }
  | { allowed: false; reason: "staff_cannot_self_delete" | "owner_cannot_self_delete" };

const SUSPENDED_ALLOWED_ACTIONS = new Set<AccountAction>([
  "view_account_status",
  "contact_support",
  "delete_account",
  "logout",
]);

const ACCOUNT_DELETED_ALLOWED_ACTIONS = new Set<AccountAction>([
  "view_account_status",
  "contact_support",
  "logout",
]);

export function resolveEffectiveAccountStatus(
  account: AccountLifecycleSnapshot,
  now = new Date(),
): EffectiveAccountStatus {
  if (account.status === "account_deleted") {
    return { status: "account_deleted", expiredTemporarySuspension: false };
  }

  if (account.status !== "suspended") {
    return { status: account.status, expiredTemporarySuspension: false };
  }

  if (account.suspendedUntil && account.suspendedUntil.getTime() <= now.getTime()) {
    return { status: "active", expiredTemporarySuspension: true };
  }

  return { status: "suspended", expiredTemporarySuspension: false };
}

export function isActionAllowedForAccount(
  account: AccountLifecycleSnapshot,
  action: AccountAction,
  now = new Date(),
): boolean {
  const effective = resolveEffectiveAccountStatus(account, now).status;

  if (effective === "active") return true;
  if (effective === "suspended") return SUSPENDED_ALLOWED_ACTIONS.has(action);
  return ACCOUNT_DELETED_ALLOWED_ACTIONS.has(action);
}

export function canSelfDeleteAccount(account: Pick<AccountLifecycleSnapshot, "role">): SelfDeletionDecision {
  if (account.role === "owner") {
    return { allowed: false, reason: "owner_cannot_self_delete" };
  }

  if (account.role === "moderator" || account.role === "admin") {
    return { allowed: false, reason: "staff_cannot_self_delete" };
  }

  return { allowed: true };
}

export function deletionHoldWindows(deletedAt: Date): {
  usernameHeldUntil: Date;
  emailHeldUntil: Date;
} {
  return {
    usernameHeldUntil: addDays(deletedAt, ACCOUNT_DELETION_USERNAME_HOLD_DAYS),
    emailHeldUntil: addDays(deletedAt, ACCOUNT_DELETION_EMAIL_HOLD_DAYS),
  };
}

export function shouldInvalidateSessionsForAccountChange(
  reason: AccountSessionInvalidationReason,
): boolean {
  return ACCOUNT_STATUS_SESSION_INVALIDATION_REASONS.includes(
    reason as (typeof ACCOUNT_STATUS_SESSION_INVALIDATION_REASONS)[number],
  );
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}
