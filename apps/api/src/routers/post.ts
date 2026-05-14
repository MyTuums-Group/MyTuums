import { Buffer } from "node:buffer";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { authorization } from "../authorization/index.js";
import {
  type FeedCursor,
  type FeedPage,
  type FeedPageInput,
  type FeedPostRow,
} from "../services/feed/index.js";
import { feedVisibilityQueries } from "../services/feed/production.js";
import { getCurrentAppUserState } from "../services/app-user-state/index.js";
import {
  createPost as createPostRecord,
  deleteOwnPost,
} from "../services/post/index.js";
import { signReadUrl } from "../services/media/index.js";
import { createBlobStorageAdapter } from "../services/media/azure-blob-storage.adapter.js";
import { getOwnerByUsername } from "../services/profile/index.js";
import { mapProfileAccessErrorToTRPC } from "../transport/profile-errors.js";
import {
  mapCreatePostErrorToTRPC,
  mapDeleteOwnPostErrorToTRPC,
} from "../transport/post-errors.js";
import { protectedProcedure, publicProcedure, router } from "../trpc.js";

const DEFAULT_PAGE_LIMIT = 20;
const MAX_PAGE_LIMIT = 50;
const PUBLIC_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;
const storage = createBlobStorageAdapter();

const publicIdSchema = z
  .string()
  .regex(PUBLIC_ID_PATTERN, "Invalid post ID.");

const feedPageSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(MAX_PAGE_LIMIT).default(DEFAULT_PAGE_LIMIT),
});

const cursorPayloadSchema = z.object({
  createdAt: z.string().datetime(),
  publicId: publicIdSchema,
});

export const postRouter = router({
  forYouFeed: protectedProcedure
    .input(feedPageSchema)
    .query(async ({ ctx, input }) => {
      const viewer = await authorization.getViewerContext({ userId: ctx.user.id });
      const page = await feedVisibilityQueries.forYouFeed(
        viewer,
        await toFeedPageInput(viewer, input),
      );
      return toFeedResponse(viewer, page);
    }),

  profileFeed: publicProcedure
    .input(
      feedPageSchema.extend({
        username: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const viewer = await getViewerFromContext(ctx);
      const owner = await getOwnerByUsername(input.username, viewer, authorization);
      if (!owner.ok) {
        throw mapProfileAccessErrorToTRPC(owner.error);
      }

      const page = await feedVisibilityQueries.profileFeed(
        viewer,
        owner.value.userId,
        await toFeedPageInput(viewer, input),
      );

      return toFeedResponse(viewer, page);
    }),

  detail: publicProcedure
    .input(
      z.object({
        publicId: publicIdSchema,
      }),
    )
    .query(async ({ ctx, input }) => {
      const viewer = await getViewerFromContext(ctx);
      const row = await feedVisibilityQueries.postDetail(viewer, input.publicId);
      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "This post is not available.",
        });
      }

      return toPostView(viewer, row);
    }),

  create: protectedProcedure
    .input(
      z.object({
        text: z.string(),
        gameTagId: z.string().uuid().nullable().optional(),
        mediaAttachmentId: z.string().uuid().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUserState = await getCurrentAppUserState(ctx);
      if (appUserState.kind !== "active_onboarded_profile") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You need a verified onboarded profile to create posts.",
        });
      }

      const created = await createPostRecord({
        authorId: ctx.user.id,
        text: input.text,
        gameTagId: input.gameTagId ?? null,
        mediaAttachmentId: input.mediaAttachmentId ?? null,
      });

      if (!created.ok) {
        throw mapCreatePostErrorToTRPC(created.error);
      }

      const viewer = await authorization.getViewerContext({ userId: ctx.user.id });
      const row = await feedVisibilityQueries.postDetail(viewer, created.value.publicId);

      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Created post could not be loaded.",
        });
      }

      return toPostView(viewer, row);
    }),

  deleteOwn: protectedProcedure
    .input(
      z.object({
        publicId: publicIdSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const deleted = await deleteOwnPost({
        publicId: input.publicId,
        authorId: ctx.user.id,
      });

      if (!deleted.ok) {
        throw mapDeleteOwnPostErrorToTRPC(deleted.error);
      }

      return deleted.value;
    }),
});

async function toFeedPageInput(
  viewer: Awaited<ReturnType<typeof getViewerFromContext>>,
  input: z.infer<typeof feedPageSchema>,
): Promise<FeedPageInput> {
  return {
    limit: input.limit,
    cursor: input.cursor ? await resolveCursor(viewer, input.cursor) : null,
  };
}

async function resolveCursor(
  viewer: Awaited<ReturnType<typeof getViewerFromContext>>,
  cursor: string,
): Promise<FeedCursor> {
  const payload = decodeCursor(cursor);
  const row = await feedVisibilityQueries.postDetail(viewer, payload.publicId);
  if (!row || row.createdAt.toISOString() !== payload.createdAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid feed cursor.",
    });
  }

  return {
    createdAt: row.createdAt,
    id: row.id,
  };
}

function decodeCursor(cursor: string): z.infer<typeof cursorPayloadSchema> {
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    ) as unknown;
    return cursorPayloadSchema.parse(parsed);
  } catch {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid feed cursor.",
    });
  }
}

function encodeCursor(row: FeedPostRow): string {
  return Buffer.from(
    JSON.stringify({
      createdAt: row.createdAt.toISOString(),
      publicId: row.publicId,
    }),
    "utf8",
  ).toString("base64url");
}

async function getViewerFromContext(ctx: {
  session: { user: { id: string } } | null;
}) {
  return authorization.getViewerContext(
    ctx.session ? { userId: ctx.session.user.id } : null,
  );
}

async function toFeedResponse(
  viewer: Awaited<ReturnType<typeof getViewerFromContext>>,
  page: FeedPage<FeedPostRow>,
) {
  return {
    items: await Promise.all(page.items.map((row) => toPostView(viewer, row))),
    nextCursor:
      page.nextCursor && page.items.length > 0
        ? encodeCursor(page.items[page.items.length - 1]!)
        : null,
  };
}

async function toPostView(
  viewer: Awaited<ReturnType<typeof getViewerFromContext>>,
  row: FeedPostRow,
) {
  return {
    publicId: row.publicId,
    text: row.text,
    author: {
      username: row.authorUsername,
      displayName: row.authorDisplayName,
      avatarUrl: null,
    },
    gameTag:
      row.gameTagId && row.gameTagSlug && row.gameTagName
        ? {
            id: row.gameTagId,
            slug: row.gameTagSlug,
            name: row.gameTagName,
          }
        : null,
    media: await toMediaView(row),
    likeCount: row.likeCount,
    commentCount: row.commentCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    canDelete: viewer.userId === row.authorId && row.deletedAt === null,
  };
}

async function toMediaView(row: FeedPostRow) {
  if (!row.mediaAttachmentId || !row.mediaStatus) return null;
  const signed = await signReadUrl(row.mediaAttachmentId, storage);
  if (!signed.ok) return null;

  return {
    id: row.mediaAttachmentId,
    kind: row.mediaMimeType?.startsWith("video/") ? "video" : "image",
    mimeType: row.mediaMimeType ?? "application/octet-stream",
    url: signed.value.readUrl,
  };
}
