import {
  isActionAllowedForAccount,
  resolveEffectiveAccountStatus,
  shouldInvalidateSessionsForAccountChange,
  type AccountAction,
  type AccountLifecycleSnapshot,
  type AccountSessionInvalidationReason,
  type EffectiveAccountStatus,
} from "./policy.js";

export interface AccountStatusRepository {
  getLifecycleSnapshot(userId: string): Promise<AccountLifecycleSnapshot | null>;
  markTemporarySuspensionExpired(userId: string): Promise<void>;
  invalidateSessions(userId: string): Promise<void>;
}

export interface AccountStatusService {
  getEffectiveStatus(userId: string): Promise<EffectiveAccountStatus | null>;
  getLifecycleSnapshot(userId: string): Promise<AccountLifecycleSnapshot | null>;
  isActionAllowed(userId: string, action: AccountAction): Promise<boolean>;
  invalidateSessions(userId: string, reason: AccountSessionInvalidationReason): Promise<void>;
}

export function createAccountStatusService(
  repository: AccountStatusRepository,
): AccountStatusService {
  async function getLifecycleSnapshot(
    userId: string,
  ): Promise<AccountLifecycleSnapshot | null> {
    const snapshot = await repository.getLifecycleSnapshot(userId);
    if (!snapshot) return null;

    const effective = resolveEffectiveAccountStatus(snapshot);
    if (!effective.expiredTemporarySuspension) return snapshot;

    await repository.markTemporarySuspensionExpired(userId);
    return { ...snapshot, status: "active", suspendedUntil: null };
  }

  return {
    async getEffectiveStatus(userId) {
      const snapshot = await getLifecycleSnapshot(userId);
      if (!snapshot) return null;
      return resolveEffectiveAccountStatus(snapshot);
    },

    getLifecycleSnapshot,

    async isActionAllowed(userId, action) {
      const snapshot = await getLifecycleSnapshot(userId);
      if (!snapshot) return false;
      return isActionAllowedForAccount(snapshot, action);
    },

    async invalidateSessions(userId, reason) {
      if (!shouldInvalidateSessionsForAccountChange(reason)) return;
      await repository.invalidateSessions(userId);
    },
  };
}
