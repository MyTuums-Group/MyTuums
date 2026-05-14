import { randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db, game, media, post } from "@workspace/db";
import type { PostBody } from "@workspace/types";
import type { ActiveGameRecord, PostRecord } from "./post.core.js";

const PUBLIC_ID_RETRY_LIMIT = 3;

export async function findActiveGameById(
  gameId: string,
): Promise<ActiveGameRecord | null> {
  const [row] = await db
    .select({
      id: game.id,
      slug: game.slug,
      name: game.name,
    })
    .from(game)
    .where(and(eq(game.id, gameId), eq(game.isActive, true)))
    .limit(1);

  return row ?? null;
}

export async function createPost(values: {
  authorId: string;
  text: PostBody;
  gameTagId: string | null;
  mediaAttachmentId: string | null;
}): Promise<PostRecord> {
  for (let attempt = 0; attempt < PUBLIC_ID_RETRY_LIMIT; attempt += 1) {
    try {
      const row = await db.transaction(async (tx) => {
        if (values.mediaAttachmentId) {
          const [attachable] = await tx
            .select({ id: media.id })
            .from(media)
            .where(
              and(
                eq(media.id, values.mediaAttachmentId),
                eq(media.ownerId, values.authorId),
                eq(media.purpose, "post_attachment"),
                eq(media.status, "ready"),
                gt(media.expiresAt, new Date()),
              ),
            )
            .limit(1);

          if (!attachable) {
            throw invalidMediaAttachmentError();
          }
        }

        const [created] = await tx
          .insert(post)
          .values({
            publicId: randomBytes(16).toString("base64url"),
            authorId: values.authorId,
            text: values.text,
            gameTagId: values.gameTagId,
            mediaAttachmentId: values.mediaAttachmentId,
          })
          .returning();

        if (!created) {
          throw new Error("Failed to create post.");
        }

        if (values.mediaAttachmentId) {
          await tx
            .update(media)
            .set({
              status: "attached",
              expiresAt: null,
              updatedAt: new Date(),
            })
            .where(eq(media.id, values.mediaAttachmentId));
        }

        return created;
      });

      return row;
    } catch (error) {
      if (isUniqueViolation(error)) {
        continue;
      }
      throw error;
    }
  }

  throw new Error("Failed to generate a unique post public ID.");
}

function invalidMediaAttachmentError(): Error & {
  code: "INVALID_MEDIA_ATTACHMENT";
} {
  const error = new Error("Invalid media attachment.") as Error & {
    code: "INVALID_MEDIA_ATTACHMENT";
  };
  error.code = "INVALID_MEDIA_ATTACHMENT";
  return error;
}

export async function findPostByPublicId(
  publicId: string,
): Promise<PostRecord | null> {
  const [row] = await db
    .select()
    .from(post)
    .where(eq(post.publicId, publicId))
    .limit(1);

  return row ?? null;
}

export async function markPostDeleted(values: {
  publicId: string;
  authorId: string;
  deletedAt: Date;
}): Promise<PostRecord | null> {
  const [row] = await db
    .update(post)
    .set({
      deletedAt: values.deletedAt,
      updatedAt: values.deletedAt,
    })
    .where(
      and(
        eq(post.publicId, values.publicId),
        eq(post.authorId, values.authorId),
        isNull(post.deletedAt),
      ),
    )
    .returning();

  return row ?? null;
}

function isUniqueViolation(error: unknown): error is { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "23505"
  );
}
