/**
 * Media DB adapter — thin Drizzle-backed data access.
 *
 * Each function is a single query (or insert/update) with no business
 * rules. The service layer composes these with policy functions; routes
 * compose the service with transport mapping.
 */

import { eq, and, lte, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { media, post, profile } from "@workspace/db/schema";
import type {
  MediaAttachmentSlot,
  MediaAttachmentTargetType,
  MediaStatus,
} from "@workspace/types";

export type MediaRow = typeof media.$inferSelect;
export type NewMediaRow = typeof media.$inferInsert;

type AttachedTarget = {
  targetType: MediaAttachmentTargetType;
  targetId: string;
  slot: MediaAttachmentSlot;
};

// ── Reads ────────────────────────────────────────────────────────────

/** Find a media record by ID. */
export async function findById(id: string): Promise<MediaRow | undefined> {
  const [row] = await db.select().from(media).where(eq(media.id, id)).limit(1);
  return row;
}

/** Find media owned by a user with a specific status. */
export async function findByOwnerAndStatus(
  ownerId: string,
  status: MediaStatus
): Promise<MediaRow[]> {
  return db
    .select()
    .from(media)
    .where(and(eq(media.ownerId, ownerId), eq(media.status, status)));
}

/** Find pending media that has expired. */
export async function findPendingExpired(now: Date): Promise<MediaRow[]> {
  return db
    .select()
    .from(media)
    .where(and(eq(media.status, "pending"), lte(media.expiresAt, now)));
}

/** Find ready but unattached media past its cleanup deadline. */
export async function findUnattachedReadyExpired(
  now: Date
): Promise<MediaRow[]> {
  return db
    .select()
    .from(media)
    .where(
      and(
        eq(media.status, "ready"),
        lte(media.expiresAt, now),
        notCurrentlyReferenced()
      )
    );
}

/** Find media by status only (no owner filter). */
export async function findByStatus(status: MediaStatus): Promise<MediaRow[]> {
  return db.select().from(media).where(eq(media.status, status));
}

/** Find deleted media (eligible for blob cleanup). */
export async function findDeletedMedia(): Promise<MediaRow[]> {
  return db
    .select()
    .from(media)
    .where(and(eq(media.status, "deleted"), notCurrentlyReferenced()));
}

/** Find failed media (eligible for cleanup). */
export async function findFailedMedia(): Promise<MediaRow[]> {
  return db
    .select()
    .from(media)
    .where(and(eq(media.status, "failed"), notCurrentlyReferenced()));
}

// ── Writes ───────────────────────────────────────────────────────────

/** Insert a new media row. Returns the created row. */
export async function insert(values: NewMediaRow): Promise<MediaRow> {
  const [row] = await db.insert(media).values(values).returning();
  return row!;
}

/** Update the status of a media record. */
export async function updateStatus(
  id: string,
  status: MediaStatus
): Promise<MediaRow | undefined> {
  const [row] = await db
    .update(media)
    .set({
      status,
      updatedAt: new Date(),
    } as Partial<typeof media.$inferInsert>)
    .where(eq(media.id, id))
    .returning();
  return row;
}

/** Mark a pending media record as ready (upload confirmed). */
export async function markReady(
  id: string,
  confirmedAt: Date,
  cleanupDeadline: Date
): Promise<MediaRow | undefined> {
  const [row] = await db
    .update(media)
    .set({
      status: "ready",
      confirmedAt,
      expiresAt: cleanupDeadline,
      updatedAt: new Date(),
    } as Partial<typeof media.$inferInsert>)
    .where(eq(media.id, id))
    .returning();
  return row;
}

/** Mark a ready media record as attached. */
export async function markAttached(
  id: string,
  attachment?: AttachedTarget
): Promise<MediaRow | undefined> {
  const now = new Date();
  const [row] = await db
    .update(media)
    .set({
      status: "attached",
      expiresAt: null,
      attachedTargetType: attachment?.targetType ?? null,
      attachedTargetId: attachment?.targetId ?? null,
      attachedSlot: attachment?.slot ?? null,
      attachedAt: now,
      updatedAt: now,
    } as Partial<typeof media.$inferInsert>)
    .where(eq(media.id, id))
    .returning();
  return row;
}

/** Mark a media record as failed. */
export async function markFailed(id: string): Promise<MediaRow | undefined> {
  const [row] = await db
    .update(media)
    .set({
      status: "failed",
      updatedAt: new Date(),
    } as Partial<typeof media.$inferInsert>)
    .where(eq(media.id, id))
    .returning();
  return row;
}

/** Mark a media record as deleted. */
export async function markDeleted(id: string): Promise<MediaRow | undefined> {
  const [row] = await db
    .update(media)
    .set({
      status: "deleted",
      updatedAt: new Date(),
    } as Partial<typeof media.$inferInsert>)
    .where(eq(media.id, id))
    .returning();
  return row;
}

/** Delete media rows by ID — used by cleanup job after blob deletion. */
export async function removeByIds(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  // Drizzle doesn't support delete().where(inArray(...)) reliably in all versions.
  // We use a raw-ish approach: delete one-by-one in a transaction.
  for (const id of ids) {
    await db.delete(media).where(eq(media.id, id));
  }
}

/** Count media by status (for monitoring/debugging). */
export async function countByStatus(status: MediaStatus): Promise<number> {
  const rows = await db
    .select({ count: media.id })
    .from(media)
    .where(eq(media.status, status));
  return rows.length;
}

function notCurrentlyReferenced() {
  return sql`not exists (
    select 1 from ${post}
    where ${post.mediaAttachmentId} = ${media.id}
  ) and not exists (
    select 1 from ${profile}
    where ${profile.avatarMediaId} = ${media.id}
       or ${profile.bannerMediaId} = ${media.id}
  )`;
}
