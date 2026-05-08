import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@workspace/db";
import { session, user } from "@workspace/db/schema";
import type { AccountStatus, UserRole } from "@workspace/types";
import {
  isActionAllowedForAccount,
  resolveEffectiveAccountStatus,
  shouldInvalidateSessionsForAccountChange,
  type AccountAction,
  type AccountLifecycleSnapshot,
  type AccountSessionInvalidationReason,
  type EffectiveAccountStatus,
} from "./policy.js";

export type { AccountAction, AccountLifecycleSnapshot, EffectiveAccountStatus } from "./policy.js";
export {
  ACCOUNT_DELETION_EMAIL_HOLD_DAYS,
  ACCOUNT_DELETION_USERNAME_HOLD_DAYS,
  ACCOUNT_STATUS_SESSION_INVALIDATION_REASONS,
  canSelfDeleteAccount,
  deletionHoldWindows,
  isActionAllowedForAccount,
  resolveEffectiveAccountStatus,
  shouldInvalidateSessionsForAccountChange,
} from "./policy.js";

export interface AccountStatusService {
  getEffectiveStatus(userId: string): Promise<EffectiveAccountStatus | null>;
  getLifecycleSnapshot(userId: string): Promise<AccountLifecycleSnapshot | null>;
  isActionAllowed(userId: string, action: AccountAction): Promise<boolean>;
  invalidateSessions(userId: string, reason: AccountSessionInvalidationReason): Promise<void>;
}

export const accountStatusService: AccountStatusService = {
  async getEffectiveStatus(userId) {
    const snapshot = await this.getLifecycleSnapshot(userId);
    if (!snapshot) return null;
    return resolveEffectiveAccountStatus(snapshot);
  },

  async getLifecycleSnapshot(userId) {
    const rows = await db
      .select({
        status: user.accountStatus,
        role: user.role,
        suspendedUntil: user.suspendedUntil,
        deletedAt: user.deletedAt,
      })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    const snapshot: AccountLifecycleSnapshot = {
      status: row.status as AccountStatus,
      role: row.role as UserRole,
      suspendedUntil: row.suspendedUntil,
      deletedAt: row.deletedAt,
    };

    const effective = resolveEffectiveAccountStatus(snapshot);
    if (effective.expiredTemporarySuspension) {
      await db
        .update(user)
        .set({ accountStatus: "active", suspendedUntil: null, updatedAt: new Date() })
        .where(
          and(eq(user.id, userId), eq(user.accountStatus, "suspended"), isNotNull(user.suspendedUntil)),
        );

      return { ...snapshot, status: "active", suspendedUntil: null };
    }

    return snapshot;
  },

  async isActionAllowed(userId, action) {
    const snapshot = await this.getLifecycleSnapshot(userId);
    if (!snapshot) return false;
    return isActionAllowedForAccount(snapshot, action);
  },

  async invalidateSessions(userId, reason) {
    if (!shouldInvalidateSessionsForAccountChange(reason)) return;

    await db.delete(session).where(eq(session.userId, userId));
  },
};
