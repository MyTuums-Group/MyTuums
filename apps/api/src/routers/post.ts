import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { authorization } from "../authorization/index.js";
import type { FeedPageInput } from "../services/feed/index.js";
import { feedVisibilityQueries } from "../services/feed/production.js";
import { getCurrentAppUserState } from "../services/app-user-state/index.js";
import {
  createPost as createPostRecord,
  deleteOwnPost,
} from "../services/post/index.js";
import {
  InvalidFeedCursorError,
  postPublicIdSchema,
} from "../services/post/presentation.js";
import { postPresentation } from "../services/post/presentation.production.js";
import { getOwnerByUsername } from "../services/profile/index.js";
import { mapProfileAccessErrorToTRPC } from "../transport/profile-errors.js";
import {
  mapCreatePostErrorToTRPC,
  mapDeleteOwnPostErrorToTRPC,
} from "../transport/post-errors.js";
import { protectedProcedure, publicProcedure, router } from "../trpc.js";

const DEFAULT_PAGE_LIMIT = 20;
const MAX_PAGE_LIMIT = 50;

const feedPageSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(MAX_PAGE_LIMIT).default(DEFAULT_PAGE_LIMIT),
});

export const postRouter = router({
  forYouFeed: protectedProcedure
    .input(feedPageSchema)
    .query(async ({ ctx, input }) => {
      const viewer = await authorization.getViewerContext({ userId: ctx.user.id });
      const page = await feedVisibilityQueries.forYouFeed(
        viewer,
        await toFeedPageInputOrThrow(viewer, input),
      );
      return postPresentation.toFeedResponse(viewer, page);
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
        await toFeedPageInputOrThrow(viewer, input),
      );

      return postPresentation.toFeedResponse(viewer, page);
    }),

  detail: publicProcedure
    .input(
      z.object({
        publicId: postPublicIdSchema,
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

      return postPresentation.toPostView(viewer, row);
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

      return postPresentation.toPostView(viewer, row);
    }),

  deleteOwn: protectedProcedure
    .input(
      z.object({
        publicId: postPublicIdSchema,
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

async function toFeedPageInputOrThrow(
  viewer: Awaited<ReturnType<typeof getViewerFromContext>>,
  input: z.infer<typeof feedPageSchema>,
): Promise<FeedPageInput> {
  try {
    return await postPresentation.toFeedPageInput(viewer, input);
  } catch (error) {
    if (error instanceof InvalidFeedCursorError) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: error.message,
      });
    }
    throw error;
  }
}

async function getViewerFromContext(ctx: {
  session: { user: { id: string } } | null;
}) {
  return authorization.getViewerContext(
    ctx.session ? { userId: ctx.session.user.id } : null,
  );
}
