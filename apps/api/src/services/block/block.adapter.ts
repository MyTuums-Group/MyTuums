import { and, eq, or } from "drizzle-orm"
import { block, db } from "@workspace/db"

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

export async function hasBlockedPair(
  tx: Tx,
  leftUserId: string,
  rightUserId: string
): Promise<boolean> {
  if (leftUserId === rightUserId) return false
  const [row] = await tx
    .select({ blockerId: block.blockerId })
    .from(block)
    .where(
      or(
        and(eq(block.blockerId, leftUserId), eq(block.blockedId, rightUserId)),
        and(eq(block.blockerId, rightUserId), eq(block.blockedId, leftUserId))
      )
    )
    .limit(1)
  return row !== undefined
}

export async function findBlockedPairIds(
  tx: Tx,
  userId: string
): Promise<string[]> {
  const rows = await tx
    .select({
      blockerId: block.blockerId,
      blockedId: block.blockedId,
    })
    .from(block)
    .where(or(eq(block.blockerId, userId), eq(block.blockedId, userId)))

  return [
    ...new Set(
      rows.map((row) =>
        row.blockerId === userId ? row.blockedId : row.blockerId
      )
    ),
  ]
}
