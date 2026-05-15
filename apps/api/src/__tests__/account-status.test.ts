import { describe, expect, it, vi } from "vitest";
import type { AccountStatus, UserRole } from "@workspace/types";
import {
  ACCOUNT_DELETION_EMAIL_HOLD_DAYS,
  ACCOUNT_DELETION_USERNAME_HOLD_DAYS,
  ACCOUNT_STATUS_SESSION_INVALIDATION_REASONS,
  type AccountAction,
  canSelfDeleteAccount,
  deletionHoldWindows,
  isActionAllowedForAccount,
  shouldInvalidateSessionsForAccountChange,
  resolveEffectiveAccountStatus,
} from "../services/account-status/policy.js";
import {
  createAccountStatusService,
  type AccountStatusRepository,
} from "../services/account-status/account-status.service.js";

function account(overrides: {
  status?: AccountStatus;
  role?: UserRole;
  suspendedUntil?: Date | null;
  deletedAt?: Date | null;
} = {}) {
  return {
    status: overrides.status ?? "active",
    role: overrides.role ?? "user",
    suspendedUntil: overrides.suspendedUntil ?? null,
    deletedAt: overrides.deletedAt ?? null,
  };
}

function repository(overrides: Partial<AccountStatusRepository> = {}): AccountStatusRepository {
  return {
    getLifecycleSnapshot: vi.fn(() => Promise.resolve(null)),
    markTemporarySuspensionExpired: vi.fn(() => Promise.resolve(undefined)),
    invalidateSessions: vi.fn(() => Promise.resolve(undefined)),
    ...overrides,
  };
}

describe("Account Status service", () => {
  it("persists lazy restoration when a temporary suspension is expired", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-10T12:00:00.000Z"));

    try {
      const suspendedUntil = new Date("2026-01-10T11:59:59.999Z");
      const markTemporarySuspensionExpired = vi.fn(() => Promise.resolve(undefined));
      const repo = repository({
        getLifecycleSnapshot: vi.fn(() =>
          Promise.resolve(account({ status: "suspended", suspendedUntil })),
        ),
        markTemporarySuspensionExpired,
      });
      const service = createAccountStatusService(repo);

      await expect(service.getLifecycleSnapshot("user_1")).resolves.toEqual({
        status: "active",
        role: "user",
        suspendedUntil: null,
        deletedAt: null,
      });
      expect(markTemporarySuspensionExpired).toHaveBeenCalledWith("user_1");
    } finally {
      vi.useRealTimers();
    }
  });

  it("invalidates sessions only for account lifecycle reasons", async () => {
    const invalidateSessions = vi.fn(() => Promise.resolve(undefined));
    const repo = repository({ invalidateSessions });
    const service = createAccountStatusService(repo);

    await service.invalidateSessions("user_1", "profile_updated");
    expect(invalidateSessions).not.toHaveBeenCalled();

    await service.invalidateSessions("user_1", "role_changed");
    expect(invalidateSessions).toHaveBeenCalledWith("user_1");
  });
});

describe("Account Status policy", () => {
  it("keeps active accounts active", () => {
    const now = new Date("2026-01-10T12:00:00.000Z");

    expect(resolveEffectiveAccountStatus(account(), now)).toEqual({
      status: "active",
      expiredTemporarySuspension: false,
    });
  });

  it("keeps active temporary suspensions suspended before expiry", () => {
    const now = new Date("2026-01-10T12:00:00.000Z");

    expect(
      resolveEffectiveAccountStatus(
        account({
          status: "suspended",
          suspendedUntil: new Date("2026-01-10T12:30:00.000Z"),
        }),
        now,
      ),
    ).toEqual({ status: "suspended", expiredTemporarySuspension: false });
  });

  it("restores expired temporary suspensions lazily", () => {
    const now = new Date("2026-01-10T12:00:00.000Z");

    expect(
      resolveEffectiveAccountStatus(
        account({
          status: "suspended",
          suspendedUntil: new Date("2026-01-10T11:59:59.999Z"),
        }),
        now,
      ),
    ).toEqual({ status: "active", expiredTemporarySuspension: true });
  });

  it("keeps indefinite suspensions suspended", () => {
    expect(
      resolveEffectiveAccountStatus(account({ status: "suspended" }), new Date()),
    ).toEqual({ status: "suspended", expiredTemporarySuspension: false });
  });

  it("keeps account-deleted status terminal even if a suspension expiry exists", () => {
    expect(
      resolveEffectiveAccountStatus(
        account({
          status: "account_deleted",
          suspendedUntil: new Date("2020-01-01T00:00:00.000Z"),
        }),
        new Date("2026-01-10T12:00:00.000Z"),
      ),
    ).toEqual({ status: "account_deleted", expiredTemporarySuspension: false });
  });

  it("allows suspended accounts only account/status/support/delete/logout actions", () => {
    const allowed: AccountAction[] = [
      "view_account_status",
      "contact_support",
      "delete_account",
      "logout",
    ];
    const blocked: AccountAction[] = [
      "protected_action",
      "create_post",
      "update_profile",
    ];

    for (const action of allowed) {
      expect(isActionAllowedForAccount(account({ status: "suspended" }), action)).toBe(true);
    }
    for (const action of blocked) {
      expect(isActionAllowedForAccount(account({ status: "suspended" }), action)).toBe(false);
    }
  });

  it("allows account-deleted accounts only confirmation/support/logout actions", () => {
    expect(
      isActionAllowedForAccount(account({ status: "account_deleted" }), "view_account_status"),
    ).toBe(true);
    expect(isActionAllowedForAccount(account({ status: "account_deleted" }), "contact_support")).toBe(
      true,
    );
    expect(isActionAllowedForAccount(account({ status: "account_deleted" }), "create_post")).toBe(
      false,
    );
  });

  it("allows active accounts to use normal protected actions", () => {
    expect(isActionAllowedForAccount(account(), "protected_action")).toBe(true);
    expect(isActionAllowedForAccount(account(), "create_post")).toBe(true);
    expect(isActionAllowedForAccount(account(), "update_profile")).toBe(true);
    expect(isActionAllowedForAccount(account(), "delete_account")).toBe(true);
  });

  it("blocks owner and staff self-deletion", () => {
    expect(canSelfDeleteAccount(account({ role: "user" }))).toEqual({ allowed: true });
    expect(canSelfDeleteAccount(account({ role: "moderator" }))).toEqual({
      allowed: false,
      reason: "staff_cannot_self_delete",
    });
    expect(canSelfDeleteAccount(account({ role: "admin" }))).toEqual({
      allowed: false,
      reason: "staff_cannot_self_delete",
    });
    expect(canSelfDeleteAccount(account({ role: "owner" }))).toEqual({
      allowed: false,
      reason: "owner_cannot_self_delete",
    });
  });

  it("exposes account deletion hold windows centrally", () => {
    const deletedAt = new Date("2026-01-10T00:00:00.000Z");

    expect(deletionHoldWindows(deletedAt)).toEqual({
      usernameHeldUntil: new Date(
        deletedAt.getTime() + ACCOUNT_DELETION_USERNAME_HOLD_DAYS * 24 * 60 * 60 * 1000,
      ),
      emailHeldUntil: new Date(
        deletedAt.getTime() + ACCOUNT_DELETION_EMAIL_HOLD_DAYS * 24 * 60 * 60 * 1000,
      ),
    });
  });

  it("centralizes session invalidation triggers", () => {
    expect(ACCOUNT_STATUS_SESSION_INVALIDATION_REASONS).toEqual([
      "status_changed",
      "account_deleted",
      "password_changed",
      "role_changed",
    ]);
    expect(shouldInvalidateSessionsForAccountChange("role_changed")).toBe(true);
    expect(shouldInvalidateSessionsForAccountChange("profile_updated")).toBe(false);
  });

  it("uses the current clock when no explicit now is supplied", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-10T12:00:00.000Z"));

    expect(
      resolveEffectiveAccountStatus(
        account({
          status: "suspended",
          suspendedUntil: new Date("2026-01-10T11:00:00.000Z"),
        }),
      ),
    ).toEqual({ status: "active", expiredTemporarySuspension: true });

    vi.useRealTimers();
  });
});
