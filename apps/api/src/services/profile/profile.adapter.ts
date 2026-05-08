/**
 * Profile adapter — thin Drizzle-backed data access.
 *
 * Each function is a single DB query (or insert) with no business rules.
 * The service layer composes these with policy functions; routers compose
 * the service with transport mapping.
 */

import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { profile } from "@workspace/db/schema";
import type { Username } from "@workspace/types";

export type ProfileRow = typeof profile.$inferSelect;

/**
 * Find a profile by user ID.
 * Returns the full row — the service decides what to expose.
 */
export async function findByUserId(
  userId: string,
): Promise<ProfileRow | undefined> {
  const [row] = await db
    .select()
    .from(profile)
    .where(eq(profile.userId, userId))
    .limit(1);
  return row;
}

/**
 * Find a profile by username (case-insensitive lookup).
 * Returns the full row — the service decides what to expose.
 */
export async function findByUsername(
  username: string,
): Promise<ProfileRow | undefined> {
  const [row] = await db
    .select()
    .from(profile)
    .where(eq(profile.username, username.toLowerCase()))
    .limit(1);
  return row;
}

/**
 * Check if a profile exists for the given user ID.
 * Lightweight — selects only the id column.
 */
export async function existsByUserId(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: profile.id })
    .from(profile)
    .where(eq(profile.userId, userId))
    .limit(1);
  return row !== undefined;
}

/**
 * Insert a new profile row.
 * Caller ensures the input is validated; the username unique constraint
 * provides the authoritative race guard (caught as error code 23505).
 */
export async function insert(values: {
  userId: string;
  username: Username;
  displayName: string | null;
  bio: string | null;
}): Promise<ProfileRow> {
  const [row] = await db
    .insert(profile)
    .values(values)
    .returning();
  return row!;
}