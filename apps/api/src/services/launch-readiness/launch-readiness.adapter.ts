import { db, user } from "@workspace/db";
import type { AccountStatus, UserRole } from "@workspace/types";
import type {
  LaunchReadinessRepository,
  LaunchReadinessUser,
} from "./index.js";

export const launchReadinessRepository: LaunchReadinessRepository = {
  async listUsersForLaunchReadiness() {
    const rows = await db
      .select({
        id: user.id,
        role: user.role,
        accountStatus: user.accountStatus,
      })
      .from(user);

    return rows.map(toLaunchReadinessUser);
  },
};

function toLaunchReadinessUser(row: {
  id: string;
  role: string;
  accountStatus: string;
}): LaunchReadinessUser {
  return {
    id: row.id,
    role: row.role as UserRole,
    accountStatus: row.accountStatus as AccountStatus,
  };
}
