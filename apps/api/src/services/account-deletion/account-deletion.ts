import {
  createAccountDeletionService,
  type AccountDeletionService,
} from "./account-deletion.core.js"
import { accountDeletionAdapter } from "./account-deletion.adapter.js"

const service: AccountDeletionService = createAccountDeletionService(
  accountDeletionAdapter
)

export type {
  AccountDeletionError,
  AccountDeletionResult,
} from "./account-deletion.core.js"

export function deleteOwnAccount(input: {
  userId: string
  password: string
  now?: Date
}) {
  return service.deleteOwnAccount(input)
}

export function isDeletedEmailHeld(email: string, now?: Date) {
  return service.isEmailHeld(email, now)
}

export function isDeletedUsernameHeld(username: string, now?: Date) {
  return service.isUsernameHeld(username, now)
}
