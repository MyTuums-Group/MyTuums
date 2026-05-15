import { eq } from "drizzle-orm";
import { contactSubmission } from "@workspace/db/schema";
import { db } from "@workspace/db";
import type {
  ContactRepository,
  ContactSubmissionRecord,
  NewContactSubmissionRecord,
} from "./contact.js";

type ContactSubmissionRow = typeof contactSubmission.$inferSelect;

export const contactRepository: ContactRepository = {
  async insert(values) {
    const [row] = await db
      .insert(contactSubmission)
      .values({
        userId: values.userId,
        email: values.email,
        category: values.category,
        message: values.message,
        requestIpHash: values.requestIpHash,
        userAgent: values.userAgent,
        emailStatus: values.emailStatus,
        emailError: values.emailError,
        retentionExpiresAt: values.retentionExpiresAt,
        createdAt: values.createdAt,
      } satisfies typeof contactSubmission.$inferInsert)
      .returning();

    return toContactRecord(row!);
  },

  async markEmailSent(id) {
    const [row] = await db
      .update(contactSubmission)
      .set({
        emailStatus: "sent",
        emailError: null,
      } satisfies Partial<NewContactSubmissionRecord>)
      .where(eq(contactSubmission.id, id))
      .returning();

    return row ? toContactRecord(row) : undefined;
  },

  async markEmailFailed(id, error) {
    const [row] = await db
      .update(contactSubmission)
      .set({
        emailStatus: "failed",
        emailError: error.slice(0, 1000),
      } satisfies Partial<NewContactSubmissionRecord>)
      .where(eq(contactSubmission.id, id))
      .returning();

    return row ? toContactRecord(row) : undefined;
  },
};

function toContactRecord(row: ContactSubmissionRow): ContactSubmissionRecord {
  return {
    id: row.id,
    userId: row.userId,
    email: row.email,
    category: row.category,
    message: row.message,
    requestIpHash: row.requestIpHash,
    userAgent: row.userAgent,
    emailStatus: row.emailStatus,
    emailError: row.emailError,
    retentionExpiresAt: row.retentionExpiresAt,
    createdAt: row.createdAt,
  };
}
