import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@workspace/db";
import { session, user } from "@workspace/db/schema";
import type { AccountStatus, UserRole } from "@workspace/types";
import type { AccountStatusRepository } from "./account-status.service.js";

export const accountStatusRepository: AccountStatusRepository = {
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

    return {
      status: row.status as AccountStatus,
      role: row.role as UserRole,
      suspendedUntil: row.suspendedUntil,
      deletedAt: row.deletedAt,
    };
  },

  async markTemporarySuspensionExpired(userId) {
    await db
      .update(user)
      .set({ accountStatus: "active", suspendedUntil: null, updatedAt: new Date() })
      .where(
        and(
          eq(user.id, userId),
          eq(user.accountStatus, "suspended"),
          isNotNull(user.suspendedUntil),
        ),
      );
  },

  async invalidateSessions(userId) {
    await db.delete(session).where(eq(session.userId, userId));
  },
};
