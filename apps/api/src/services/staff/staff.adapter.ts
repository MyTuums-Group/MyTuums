import { and, eq, inArray } from "drizzle-orm";
import {
  db,
  moderationCase,
  roleChangeAudit,
  session,
  user,
} from "@workspace/db";
import type { AccountStatus, UserRole } from "@workspace/types";
import type {
  StaffRepository,
  StaffUserRow,
} from "./index.js";

export const staffRepository: StaffRepository = {
  async findUserById(userId) {
    const [row] = await db
      .select({
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        role: user.role,
        accountStatus: user.accountStatus,
        suspendedUntil: user.suspendedUntil,
        suspensionPublicReason: user.suspensionPublicReason,
      })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    return row ? toStaffUserRow(row) : null;
  },

  async findUserByEmail(email) {
    const [row] = await db
      .select({
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        role: user.role,
        accountStatus: user.accountStatus,
        suspendedUntil: user.suspendedUntil,
        suspensionPublicReason: user.suspensionPublicReason,
      })
      .from(user)
      .where(eq(user.email, email.trim().toLowerCase()))
      .limit(1);

    return row ? toStaffUserRow(row) : null;
  },

  async countOwners() {
    const rows = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.role, "owner"));
    return rows.length;
  },

  async applyRoleChange(input) {
    await db.transaction(async (tx) => {
      await tx
        .update(user)
        .set({ role: input.newRole, updatedAt: new Date() })
        .where(eq(user.id, input.targetUserId));

      if (input.unassignOpenCases) {
        await tx
          .update(moderationCase)
          .set({ assigneeId: null })
          .where(openCaseAssignee(input.targetUserId));
      }

      await tx.insert(roleChangeAudit).values({
        actorId: input.actorId,
        targetUserId: input.targetUserId,
        oldRole: input.oldRole,
        newRole: input.newRole,
        internalNotes: input.internalNotes,
      });

      await tx.delete(session).where(eq(session.userId, input.targetUserId));
    });
  },

  async applySuspension(input) {
    await db.transaction(async (tx) => {
      await tx
        .update(user)
        .set({
          accountStatus: "suspended",
          suspendedUntil: input.suspendedUntil,
          suspensionPublicReason: input.publicReason,
          updatedAt: new Date(),
        })
        .where(eq(user.id, input.targetUserId));

      if (input.unassignOpenCases) {
        await tx
          .update(moderationCase)
          .set({ assigneeId: null })
          .where(openCaseAssignee(input.targetUserId));
      }

      await tx.delete(session).where(eq(session.userId, input.targetUserId));
    });
  },

  async applyUnsuspension(input) {
    await db.transaction(async (tx) => {
      await tx
        .update(user)
        .set({
          accountStatus: "active",
          suspendedUntil: null,
          suspensionPublicReason: null,
          updatedAt: new Date(),
        })
        .where(eq(user.id, input.targetUserId));

      await tx.delete(session).where(eq(session.userId, input.targetUserId));
    });
  },

  async applyOwnerBootstrap(input) {
    await db.transaction(async (tx) => {
      await tx
        .update(user)
        .set({ role: "owner", updatedAt: new Date() })
        .where(eq(user.id, input.targetUserId));

      await tx.insert(roleChangeAudit).values({
        actorId: input.targetUserId,
        targetUserId: input.targetUserId,
        oldRole: input.oldRole,
        newRole: "owner",
        internalNotes: "Owner bootstrap command.",
      });

      await tx.delete(session).where(eq(session.userId, input.targetUserId));
    });
  },
};

function openCaseAssignee(userId: string) {
  return and(
    eq(moderationCase.assigneeId, userId),
    inArray(moderationCase.status, ["open", "reviewing"]),
  );
}

function toStaffUserRow(row: {
  id: string;
  email: string;
  emailVerified: boolean;
  role: string;
  accountStatus: string;
  suspendedUntil: Date | null;
  suspensionPublicReason: string | null;
}): StaffUserRow {
  return {
    id: row.id,
    email: row.email,
    emailVerified: row.emailVerified,
    role: row.role as UserRole,
    accountStatus: row.accountStatus as AccountStatus,
    suspendedUntil: row.suspendedUntil,
    suspensionPublicReason: row.suspensionPublicReason,
  };
}
