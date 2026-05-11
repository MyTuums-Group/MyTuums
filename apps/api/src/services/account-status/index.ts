import { accountStatusRepository } from "./account-status.adapter.js";
import { createAccountStatusService } from "./account-status.service.js";

export type {
  AccountStatusRepository,
  AccountStatusService,
} from "./account-status.service.js";
export { createAccountStatusService } from "./account-status.service.js";
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

export const accountStatusService = createAccountStatusService(accountStatusRepository);
